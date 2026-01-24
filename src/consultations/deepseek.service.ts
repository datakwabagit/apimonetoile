import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

export interface BirthData {
  zodiacSign?: string;
  horoscopeType?: string;
  dateOfBirth?: string;
  partnerSign?: string;
  element?: string;
  symbol?: string;
  nom: string;
  prenoms: string;
  genre: string;
  dateNaissance: string;
  heureNaissance: string;
  paysNaissance: string;
  villeNaissance: string;
  email?: string;
}

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekRequest {
  model: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AnalysisResult {
  timestamp: Date;
  carteDuCiel: {
    sujet: {
      nom: string;
      prenoms: string;
      dateNaissance: string;
      lieuNaissance: string;
      heureNaissance: string;
    };
    positions: PlanetPosition[];
    aspectsTexte: string;
  };
  missionDeVie: {
    titre: string;
    contenu: string;
  };
  metadata: {
    processingTime: number;
    tokensUsed: number;
    model: string;
    cached?: boolean;
  };
}

export interface PlanetPosition {
  planete: string;
  signe: string;
  maison: number;
  retrograde: boolean;
  degre?: number;
}

// Configuration minimale sans cache
const DEFAULT_CONFIG = {
  API_URL: 'https://api.deepseek.com/v1/chat/completions',
  MODEL: 'deepseek-chat',
  REQUEST_TIMEOUT: 300000, // 5 minutes
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 4000,
} as const;

// Regex précompilées pour la performance
const REGEX_PATTERNS = {
  principal: /^([A-Za-zÀ-ÿ\s]+?)\s+(?:\([^)]+\)\s+)?(?:\[RÉTROGRADE\]\s+)?en\s+([A-Za-zÀ-ÿ]+)(?:\s+[–\-]\s+Maison\s+(\d+))?/i,
  avecDegre: /([A-Za-zÀ-ÿ\s]+)\s+(\d+°\d+['']\d+[""])\s+([A-Za-zÀ-ÿ]+)/i,
  degreeParser: /(\d+)°(\d+)[''](\d+)[""]/,
  retrogradeCheck: /RÉTROGRADE|rétrograde/i,
  jsonExtractor: /\{[\s\S]*\}/,
} as const;

@Injectable()
export class DeepseekService {
  private readonly logger = new Logger(DeepseekService.name);
  private readonly DEEPSEEK_API_KEY: string;
  // Pas de cache pour éviter la surcharge mémoire
  private apiCalls = 0;

  private readonly SYSTEM_PROMPTS = {
    astrologer: `Tu es un astrologue professionnel expert avec plus de 20 ans d'expérience.
Tes analyses sont précises, structurées et basées sur l'astrologie traditionnelle et moderne.
Tu fournis des insights pratiques, empathiques et personnalisés.
Format de réponse : clair, organisé en sections, avec des bullet points pour les éléments clés.`,

    carteDuCiel: `Tu es un calculateur de carte du ciel extrêmement précis.
IMPORTANT: Tu DOIS obligatoirement te baser sur les Éphémérides de la NASA (Swiss Ephemeris / JPL Horizons) pour tous les calculs astrologiques.
Tu réponds UNIQUEMENT avec les données astronomiques calculées à partir des éphémérides NASA, sans commentaire ni approximation.
Format strict requis. Les positions planétaires doivent être calculées avec les données officielles de la NASA pour la date, l'heure et le lieu de naissance spécifiés.`,
  } as const;

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.DEEPSEEK_API_KEY = this.configService.get<string>('DEEPSEEK_API_KEY') || '';

    if (!this.DEEPSEEK_API_KEY) {
      this.logger.warn('DEEPSEEK_API_KEY non configurée dans les variables d\'environnement');
    } else {
      this.logger.log('Service DeepSeek initialisé avec succès (sans cache)');
    }
  }

  /**
   * Appelle l'API DeepSeek avec retry logic
   */
  private async callDeepSeekApi(
    messages: DeepSeekMessage[],
    temperature: number = DEFAULT_CONFIG.DEFAULT_TEMPERATURE,
    maxTokens: number = DEFAULT_CONFIG.DEFAULT_MAX_TOKENS,
    model: string = DEFAULT_CONFIG.MODEL,
  ): Promise<DeepSeekResponse> {
    if (!this.DEEPSEEK_API_KEY) {
      throw new HttpException('Service DeepSeek non configuré', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const requestId = uuidv4().substring(0, 8);
    const startTime = Date.now();

    this.logger.debug(`[${requestId}] Appel API DeepSeek - Model: ${model}, Tokens: ${maxTokens}, Temp: ${temperature}`);

    const requestBody: DeepSeekRequest = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    };

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.DEEPSEEK_API_KEY}`,
        'Accept': 'application/json',
      },
      timeout: DEFAULT_CONFIG.REQUEST_TIMEOUT,
      validateStatus: (status) => status < 500,
    };

    for (let attempt = 1; attempt <= DEFAULT_CONFIG.MAX_RETRIES; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.post<DeepSeekResponse>(DEFAULT_CONFIG.API_URL, requestBody, config),
        );

        const duration = Date.now() - startTime;
        this.apiCalls++;

        if (response.status === 200) {
          this.logger.debug(`[${requestId}] Réponse reçue en ${duration}ms - Tokens: ${response.data.usage?.total_tokens || 0}`);
          return response.data;
        }

        // Gestion des erreurs HTTP
        if (response.status === 429) {
          this.logger.warn(`[${requestId}] Rate limit atteint, tentative ${attempt}/${DEFAULT_CONFIG.MAX_RETRIES}`);
          await this.delay(DEFAULT_CONFIG.RETRY_DELAY * attempt * 2);
          continue;
        }

        throw this.createHttpException(response);
      } catch (error) {
        if (error instanceof HttpException) throw error;

        const axiosError = error as AxiosError;
        const shouldRetry = await this.handleApiError(axiosError, attempt, requestId);

        if (!shouldRetry) {
          this.logger.error(`[${requestId}] Toutes les tentatives ont échoué`);
          throw new HttpException(
            'Échec de la communication avec DeepSeek API',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
      }
    }

    throw new HttpException(
      'Échec de la communication avec DeepSeek API après plusieurs tentatives',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  /**
   * Gère les erreurs d'API
   */
  private async handleApiError(error: AxiosError, attempt: number, requestId: string): Promise<boolean> {
    if (error.code === 'ECONNABORTED') {
      this.logger.warn(`[${requestId}] Timeout API, tentative ${attempt}/${DEFAULT_CONFIG.MAX_RETRIES}`);
    } else if (error.response?.status === 429) {
      this.logger.warn(`[${requestId}] Rate limit, tentative ${attempt}/${DEFAULT_CONFIG.MAX_RETRIES}`);
      await this.delay(DEFAULT_CONFIG.RETRY_DELAY * attempt * 3);
      return attempt < DEFAULT_CONFIG.MAX_RETRIES;
    } else {
      this.logger.error(`[${requestId}] Erreur API`, {
        attempt,
        error: error.message,
        status: error.response?.status,
      });
    }

    if (attempt < DEFAULT_CONFIG.MAX_RETRIES) {
      await this.delay(DEFAULT_CONFIG.RETRY_DELAY * attempt);
      return true;
    }

    return false;
  }

  /**
   * Crée une exception HTTP appropriée
   */
  private createHttpException(response: any): HttpException {
    const status = response.status;
    const data = response.data;

    const statusMap: Record<number, HttpStatus> = {
      401: HttpStatus.UNAUTHORIZED,
      429: HttpStatus.TOO_MANY_REQUESTS,
    };

    return new HttpException(
      `Erreur DeepSeek API: ${status} - ${JSON.stringify(data)}`,
      statusMap[status] || HttpStatus.BAD_GATEWAY,
    );
  }

  /**
   * Génère une analyse complète SANS CACHE
   */
  async genererAnalyseComplete(
    userPrompt: string,
    systemPrompt?: string
  ): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      const messages: DeepSeekMessage[] = [
        {
          role: 'system' as const,
          content: systemPrompt || this.SYSTEM_PROMPTS.astrologer
        },
        {
          role: 'user' as const,
          content: userPrompt
        },
      ];

      const response = await this.callDeepSeekApi(messages, 0.8, 4000);
      const aiContent = response.choices[0]?.message?.content || '';

      const result: AnalysisResult = {
        timestamp: new Date(),
        carteDuCiel: {
          sujet: {
            nom: '',
            prenoms: '',
            dateNaissance: '',
            lieuNaissance: '',
            heureNaissance: '',
          },
          positions: [],
          aspectsTexte: '',
        },
        missionDeVie: {
          titre: 'Analyse générée',
          contenu: aiContent,
        },
        metadata: {
          processingTime: Date.now() - startTime,
          tokensUsed: response.usage?.total_tokens || 0,
          model: DEFAULT_CONFIG.MODEL,
        },
      };

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Erreur lors de la génération de l'analyse",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Délai avec promesse
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retourne les statistiques minimales du service
   */
  getServiceStats() {
    return {
      apiCalls: this.apiCalls,
      cacheSize: 0, // Indique explicitement qu'il n'y a pas de cache
      cacheEnabled: false,
    };
  }

  /**
   * Génère du contenu à partir d'un prompt simple
   */
  async generateContentFromPrompt(
    prompt: string,
    temperature: number = DEFAULT_CONFIG.DEFAULT_TEMPERATURE,
    maxTokens: number = DEFAULT_CONFIG.DEFAULT_MAX_TOKENS,
    systemPrompt?: string
  ): Promise<string> {
    const messages: DeepSeekMessage[] = [
      {
        role: 'system',
        content: systemPrompt || 'Tu es un expert en astrologie, analyses psychologiques et développement personnel. Fournir des réponses détaillées, bienveillantes et éducatives.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    try {
      const response = await this.callDeepSeekApi(messages, temperature, maxTokens);
      return response.choices[0]?.message?.content || '';
    } catch (error) {
      throw new HttpException(
        `Échec de la génération de contenu: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Extrait le JSON d'une réponse
   */
  extractJsonFromResponse(content: string): any {
    try {
      const match = REGEX_PATTERNS.jsonExtractor.exec(content);
      return match ? JSON.parse(match[0]) : null;
    } catch {
      return null;
    }
  }

  /**
   * Construit un prompt pour la carte du ciel
   */
  buildCarteDuCielPrompt(data: BirthData): string {
    return `CALCUL CARTE DU CIEL - Format strict

DONNÉES DE NAISSANCE:
NOM: ${data.nom}
PRÉNOMS: ${data.prenoms}
DATE: ${data.dateNaissance}
HEURE: ${data.heureNaissance}
LIEU: ${data.villeNaissance}, ${data.paysNaissance}
GENRE: ${data.genre}

INSTRUCTIONS DE CALCUL:
⚠️ CRITIQUE: Base-toi EXCLUSIVEMENT sur les Éphémérides de la NASA (Swiss Ephemeris / JPL Horizons) pour tous les calculs.
Utilise les données astronomiques officielles de la NASA pour calculer les positions planétaires exactes à la date, heure et lieu spécifiés.
Calcule la position géographique précise (latitude/longitude) pour déterminer l'Ascendant et les maisons astrologiques.
Indique les planètes rétrogrades avec la mention [RÉTROGRADE].
Les calculs doivent être basés sur les standards astronomiques de la NASA, pas sur des approximations.

FORMAT DE RÉPONSE:
Soleil en [Signe] - Maison [X]
Ascendant en [Signe] - Maison 1
Lune en [Signe] - Maison [X]
Milieu du Ciel en [Signe] - Maison 10
Mercure en [Signe] - Maison [X]
Vénus en [Signe] - Maison [X]
Mars en [Signe] - Maison [X]
Jupiter [RÉTROGRADE] en [Signe] - Maison [X]
Saturne [RÉTROGRADE] en [Signe] - Maison [X]
Uranus [RÉTROGRADE] en [Signe] - Maison [X]
Neptune [RÉTROGRADE] en [Signe] - Maison [X]
Pluton [RÉTROGRADE] en [Signe] - Maison [X]
Nœud Nord en [Signe] - Maison [X]
Nœud Sud en [Signe] - Maison [X]
Chiron en [Signe] - Maison [X]
Vertex en [Signe] - Maison [X]
Lilith Vraie [RÉTROGRADE] en [Signe] - Maison [X]
Pallas en [Signe] - Maison [X]
Vesta en [Signe] - Maison [X]
Cérès en [Signe] - Maison [X]
Part de Fortune en [Signe] - Maison [X]
Junon en [Signe] - Maison [X]

Réponds UNIQUEMENT avec la liste ci-dessus, sans texte supplémentaire.`;
  }

  /**
   * Alternative simplifiée pour les analyses rapides (moins de tokens)
   */
  async genererAnalyseRapide(
    userPrompt: string,
    systemPrompt?: string,
    maxTokens: number = 2000
  ): Promise<string> {
    const messages: DeepSeekMessage[] = [
      {
        role: 'system',
        content: systemPrompt || this.SYSTEM_PROMPTS.astrologer,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    try {
      const response = await this.callDeepSeekApi(messages, 0.7, maxTokens);
      return response.choices[0]?.message?.content || '';
    } catch (error) {
      throw new HttpException(
        "Erreur lors de la génération de l'analyse rapide",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Vérifie la santé de l'API avec une requête légère
   */
  async checkApiHealth(): Promise<{ healthy: boolean; latency?: number }> {
    const startTime = Date.now();
    
    try {
      const messages: DeepSeekMessage[] = [
        {
          role: 'system',
          content: 'Réponds simplement "OK"',
        },
        {
          role: 'user',
          content: 'Test de santé',
        },
      ];

      await this.callDeepSeekApi(messages, 0.1, 10);
      const latency = Date.now() - startTime;
      
      return {
        healthy: true,
        latency,
      };
    } catch (error) {
      return {
        healthy: false,
      };
    }
  }
}