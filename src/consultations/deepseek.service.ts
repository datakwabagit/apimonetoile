import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

export interface BirthData {
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
  sessionId: string;
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

@Injectable()
export class DeepseekService {
  private readonly logger = new Logger(DeepseekService.name);
  private readonly DEEPSEEK_API_KEY: string;
  private readonly DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
  private readonly DEEPSEEK_MODEL = 'deepseek-chat';
  private readonly REQUEST_TIMEOUT = 300000; // 5 minutes
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  // Cache pour les analyses fréquentes (optionnel)
  private readonly analysisCache = new Map<string, { result: AnalysisResult; timestamp: number }>();
  private readonly CACHE_TTL = 3600000; // 1 heure

  // Configuration des prompts
  private readonly SYSTEM_PROMPTS = {
    astrologer: `Tu es un astrologue professionnel expert avec plus de 20 ans d'expérience.
Tes analyses sont précises, structurées et basées sur l'astrologie traditionnelle et moderne.
Tu fournis des insights pratiques, empathiques et personnalisés.
Format de réponse : clair, organisé en sections, avec des bullet points pour les éléments clés.`,
    carteDuCiel: `Tu es un calculateur de carte du ciel extrêmement précis.
Tu réponds UNIQUEMENT avec les données astronomiques sans commentaire.
Format strict requis.`,
  };

  // Templates de prompts
  private readonly PROMPT_TEMPLATES = {
    carteDuCiel: (data: BirthData) => `CALCUL CARTE DU CIEL - Format strict

DONNÉES DE NAISSANCE:
NOM: ${data.nom}
PRÉNOMS: ${data.prenoms}
DATE: ${data.dateNaissance}
HEURE: ${data.heureNaissance}
LIEU: ${data.villeNaissance}, ${data.paysNaissance}
GENRE: ${data.genre}

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

Réponds UNIQUEMENT avec la liste ci-dessus, sans texte supplémentaire.`,

    missionDeVie: (
      data: BirthData,
      carteDuCiel: string,
    ) => `ANALYSE MISSION DE VIE - ${data.prenoms} ${data.nom}

CARTE DU CIEL:
${carteDuCiel}

INSTRUCTIONS:
Analyse la mission de vie en te basant sur:
1. POSITION DES NŒUDS LUNAIRES (Nord/Sud) - Chemin karmique principal
2. MILIEU DU CIEL (MC) - Vocation publique et destinée professionnelle
3. SOLEIL - Expression de l'âme et volonté
4. JUPITER - Expansion et croissance spirituelle
5. SATURNE - Leçons et structure karmique
6. CHIRON - Blessure à guérir et service

STRUCTURE DE RÉPONSE:
## 🎯 MISSION DE VIE PRINCIPALE
[2-3 paragraphes sur la mission centrale]

## 🔑 CLÉS KARMIQUES (Nœuds Lunaires)
• Nœud Nord en [Signe/Maison] : [Développement]
• Nœud Sud en [Signe/Maison] : [Dépassement]

## 💼 VOCATION & IMPACT (MC, Maison 10)
[Analyse vocationnelle]

## 🌟 EXPRESSION DE L'ÂME (Soleil)
[Analyse solaire]

## 📈 CROISSANCE & DÉFIS (Jupiter/Saturne)
[Analyse développement]

## 🩹 BLESSURE SACRÉE (Chiron)
[Analyse chironienne]

## 🛠️ STRATÉGIES PRATIQUES
[3-5 conseils concrets]

Ton : Professionnel, empathique, encourageant.`,
  };

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.DEEPSEEK_API_KEY = this.configService.get<string>('DEEPSEEK_API_KEY') || '';

    if (!this.DEEPSEEK_API_KEY) {
      this.logger.warn("DEEPSEEK_API_KEY non configurée dans les variables d'environnement");
    } else {
      this.logger.log('Service DeepSeek initialisé avec succès');
    }
  }

  /**
   * Appelle l'API DeepSeek avec retry logic et timeout
   */
  private async callDeepSeekApi(
    messages: DeepSeekMessage[],
    temperature = 0.7,
    maxTokens = 4000,
    model = this.DEEPSEEK_MODEL,
  ): Promise<DeepSeekResponse> {
    if (!this.DEEPSEEK_API_KEY) {
      throw new HttpException('Service DeepSeek non configuré', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const requestId = uuidv4().substring(0, 8);
    const startTime = Date.now();

    this.logger.log(
      `[${requestId}] 🚀 Appel API DeepSeek - Model: ${model}, MaxTokens: ${maxTokens}, Temp: ${temperature}`,
    );

    this.logger.log(`[${requestId}] 🚀 Appel API DeepSeek démarré - Model: ${model}, Tokens max: ${maxTokens}, Temp: ${temperature}`);
    this.logger.debug(`[${requestId}] Messages: ${messages.length} messages`);

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
        Authorization: `Bearer ${this.DEEPSEEK_API_KEY}`,
        Accept: 'application/json',
      },
      timeout: this.REQUEST_TIMEOUT,
      validateStatus: (status) => status < 500,
    };

    let lastError: Error;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.post<DeepSeekResponse>(this.DEEPSEEK_API_URL, requestBody, config),
        );

        const duration = Date.now() - startTime;

        if (response.status === 200) {
          this.logger.log(
            `[${requestId}] ✅ Réponse reçue en ${duration}ms (${(duration / 1000).toFixed(1)}s) - Tokens: ${response.data.usage?.total_tokens || 0}`,
          );

          return response.data;
        }

        // Gestion des erreurs HTTP
        if (response.status === 429) {
          this.logger.warn(
            `[${requestId}] Rate limit atteint, tentative ${attempt}/${this.MAX_RETRIES}`,
          );
          await this.delay(this.RETRY_DELAY * attempt * 2);
          continue;
        }

        throw new HttpException(
          `Erreur DeepSeek API: ${response.status} - ${JSON.stringify(response.data)}`,
          response.status === 401
            ? HttpStatus.UNAUTHORIZED
            : response.status === 429
              ? HttpStatus.TOO_MANY_REQUESTS
              : HttpStatus.BAD_GATEWAY,
        );
      } catch (error) {
        lastError = error;

        if (error instanceof HttpException) {
          throw error;
        }

        const axiosError = error as AxiosError;

        if (axiosError.code === 'ECONNABORTED') {
          this.logger.warn(`[${requestId}] Timeout API, tentative ${attempt}/${this.MAX_RETRIES}`);
        } else if (axiosError.response?.status === 429) {
          this.logger.warn(`[${requestId}] Rate limit, tentative ${attempt}/${this.MAX_RETRIES}`);
          await this.delay(this.RETRY_DELAY * attempt * 3);
          continue;
        } else {
          this.logger.error(`[${requestId}] Erreur API`, {
            attempt,
            error: axiosError.message,
            status: axiosError.response?.status,
          });
        }

        if (attempt < this.MAX_RETRIES) {
          await this.delay(this.RETRY_DELAY * attempt);
        }
      }
    }

    this.logger.error(`[${requestId}] Toutes les tentatives ont échoué`);
    throw (
      lastError ||
      new HttpException(
        'Échec de la communication avec DeepSeek API',
        HttpStatus.SERVICE_UNAVAILABLE,
      )
    );
  }

  /**
   * Génère une analyse complète avec cache et optimisation
   */
  async genererAnalyseComplete(birthData: BirthData): Promise<AnalysisResult> {
    const sessionId = uuidv4();
    const cacheKey = this.generateCacheKey(birthData);
    const startTime = Date.now();

    this.logger.log(`[${sessionId}] Début analyse pour ${birthData.prenoms} ${birthData.nom}`);

    // Vérifier le cache
    const cached = this.analysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.log(`[${sessionId}] Analyse récupérée depuis le cache`);
      return {
        ...cached.result,
        sessionId,
        timestamp: new Date(),
        metadata: {
          ...cached.result.metadata,
          processingTime: Date.now() - startTime,
          cached: true,
        },
      };
    }

    try {
      // 1. Générer la carte du ciel
      this.logger.log(`[${sessionId}] 📊 ÉTAPE 1/4: Génération carte du ciel...`);
      const step1Start = Date.now();
      
      const carteDuCielPrompt = this.PROMPT_TEMPLATES.carteDuCiel(birthData);
      const carteDuCielResponse = await this.callDeepSeekApi(
        [
          { role: 'system', content: this.SYSTEM_PROMPTS.carteDuCiel },
          { role: 'user', content: carteDuCielPrompt },
        ],
        0.3,
        1000,
      ); // Température plus basse pour la précision

      const carteDuCielTexte = carteDuCielResponse.choices[0].message.content;
      const step1Duration = Date.now() - step1Start;
      this.logger.log(
        `[${sessionId}] ✅ ÉTAPE 1 terminée en ${step1Duration}ms - Tokens: ${carteDuCielResponse.usage?.total_tokens || 0}`,
      );

      // 2. Générer la mission de vie
      this.logger.log(`[${sessionId}] 🎯 ÉTAPE 2/4: Génération mission de vie...`);
      const step2Start = Date.now();
      
      const missionDeViePrompt = this.PROMPT_TEMPLATES.missionDeVie(birthData, carteDuCielTexte);
      const missionDeVieResponse = await this.callDeepSeekApi(
        [
          { role: 'system', content: this.SYSTEM_PROMPTS.astrologer },
          { role: 'user', content: missionDeViePrompt },
        ],
        0.8,
        3000,
      ); // Température plus élevée pour la créativité

      const missionDeVieTexte = missionDeVieResponse.choices[0].message.content;
      const step2Duration = Date.now() - step2Start;
      this.logger.log(
        `[${sessionId}] ✅ ÉTAPE 2 terminée en ${step2Duration}ms - Tokens: ${missionDeVieResponse.usage?.total_tokens || 0}`,
      );

      // 3. Parser les positions
      this.logger.log(`[${sessionId}] 🔍 ÉTAPE 3/4: Parsing des positions...`);
      const step3Start = Date.now();
      const positions = this.parsePositionsAmeliore(carteDuCielTexte);
      const step3Duration = Date.now() - step3Start;
      this.logger.log(`[${sessionId}] ✅ ÉTAPE 3 terminée en ${step3Duration}ms - ${positions.length} positions`);

      // 4. Construire le résultat
      this.logger.log(`[${sessionId}] 🏗️ ÉTAPE 4/4: Construction du résultat final...`);
      const result: AnalysisResult = {
        sessionId,
        timestamp: new Date(),
        carteDuCiel: {
          sujet: {
            nom: birthData.nom,
            prenoms: birthData.prenoms,
            dateNaissance: birthData.dateNaissance,
            lieuNaissance: `${birthData.villeNaissance}, ${birthData.paysNaissance}`,
            heureNaissance: birthData.heureNaissance,
          },
          positions,
          aspectsTexte: carteDuCielTexte,
        },
        missionDeVie: {
          titre: 'Mission de Vie',
          contenu: missionDeVieTexte,
        },
        metadata: {
          processingTime: Date.now() - startTime,
          tokensUsed:
            (carteDuCielResponse.usage?.total_tokens || 0) +
            (missionDeVieResponse.usage?.total_tokens || 0),
          model: this.DEEPSEEK_MODEL,
        },
      };

      // Mettre en cache
      this.analysisCache.set(cacheKey, {
        result,
        timestamp: Date.now(),
      });

      const totalDuration = Date.now() - startTime;
      this.logger.log(
        `[${sessionId}] 🎉 ANALYSE COMPLÈTE TERMINÉE en ${totalDuration}ms (${(totalDuration / 1000).toFixed(1)}s)`,
      );
      this.logger.log(`[${sessionId}] 📊 Tokens totaux: ${result.metadata.tokensUsed}`);
      this.logger.log(
        `[${sessionId}] ⏱️ Répartition: Étape1=${step1Duration}ms, Étape2=${step2Duration}ms, Étape3=${step3Duration}ms`,
      );

      // Nettoyer le cache si nécessaire
      if (this.analysisCache.size > 100) {
        this.cleanupCache();
      }

      this.logger.log(`[${sessionId}] Analyse complète générée avec succès`, {
        duration: result.metadata.processingTime,
        tokens: result.metadata.tokensUsed,
        positions: positions.length,
      });

      return result;
    } catch (error) {
      this.logger.error(`[${sessionId}] Erreur génération analyse`, {
        error: error.message,
        duration: Date.now() - startTime,
      });

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
   * Parser amélioré pour les positions planétaires
   */
  private parsePositionsAmeliore(texte: string): PlanetPosition[] {
    const positions: PlanetPosition[] = [];
    const lignes = texte.split('\n').filter((l) => l.trim());

    // Expressions régulières optimisées
    const patterns = {
      principal:
        /^([A-Za-zÀ-ÿ\s]+?)\s+(?:\([^)]+\)\s+)?(?:\[RÉTROGRADE\]\s+)?en\s+([A-Za-zÀ-ÿ]+)(?:\s+[–\-]\s+Maison\s+(\d+))?/i,
      avecDegre: /([A-Za-zÀ-ÿ\s]+)\s+(\d+°\d+['’]\d+["”])\s+([A-Za-zÀ-ÿ]+)/i,
    };

    for (const ligne of lignes) {
      // Essayer le pattern principal
      const matchPrincipal = ligne.match(patterns.principal);
      if (matchPrincipal) {
        const planete = matchPrincipal[1].trim();
        const signe = matchPrincipal[2].trim();
        const maison = matchPrincipal[3] ? parseInt(matchPrincipal[3]) : 1;
        const retrograde = /RÉTROGRADE/i.test(ligne) || /rétrograde/i.test(ligne);

        positions.push({
          planete: this.normalizePlanetName(planete),
          signe: this.normalizeSignName(signe),
          maison,
          retrograde,
        });
        continue;
      }

      // Essayer le pattern avec degré
      const matchDegre = ligne.match(patterns.avecDegre);
      if (matchDegre) {
        positions.push({
          planete: this.normalizePlanetName(matchDegre[1]),
          signe: this.normalizeSignName(matchDegre[3]),
          maison: 1, // Par défaut
          retrograde: false,
          degre: this.parseDegree(matchDegre[2]),
        });
      }
    }

    return positions;
  }

  /**
   * Normalise les noms des planètes
   */
  private normalizePlanetName(name: string): string {
    const mapping: Record<string, string> = {
      soleil: 'Soleil',
      lune: 'Lune',
      mercure: 'Mercure',
      venus: 'Vénus',
      mars: 'Mars',
      jupiter: 'Jupiter',
      saturne: 'Saturne',
      uranus: 'Uranus',
      neptune: 'Neptune',
      pluton: 'Pluton',
      ascendant: 'Ascendant',
      mc: 'Milieu du Ciel',
      'milieu du ciel': 'Milieu du Ciel',
      'nœud nord': 'Nœud Nord',
      'nœud sud': 'Nœud Sud',
      chiron: 'Chiron',
      vertex: 'Vertex',
      lilith: 'Lilith',
      pallas: 'Pallas',
      vesta: 'Vesta',
      ceres: 'Cérès',
      'part de fortune': 'Part de Fortune',
      junon: 'Junon',
    };

    const normalized = name.toLowerCase().trim();
    return mapping[normalized] || name;
  }

  /**
   * Normalise les noms des signes
   */
  private normalizeSignName(signe: string): string {
    const signes: Record<string, string> = {
      bélier: 'Bélier',
      taureau: 'Taureau',
      gemeaux: 'Gémeaux',
      cancer: 'Cancer',
      lion: 'Lion',
      vierge: 'Vierge',
      balance: 'Balance',
      scorpion: 'Scorpion',
      sagittaire: 'Sagittaire',
      capricorne: 'Capricorne',
      verseau: 'Verseau',
      poissons: 'Poissons',
    };

    const normalized = signe.toLowerCase().trim();
    return signes[normalized] || signe;
  }

  /**
   * Parse les degrés
   */
  private parseDegree(degreeStr: string): number {
    const match = degreeStr.match(/(\d+)°(\d+)['’](\d+)["”]/);
    if (match) {
      const deg = parseInt(match[1]);
      const min = parseInt(match[2]);
      const sec = parseInt(match[3]);
      return deg + min / 60 + sec / 3600;
    }
    return 0;
  }

  /**
   * Génère une clé de cache unique
   */
  private generateCacheKey(birthData: BirthData): string {
    return `${birthData.dateNaissance}-${birthData.heureNaissance}-${birthData.villeNaissance}`.toLowerCase();
  }

  /**
   * Nettoie le cache
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.analysisCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.analysisCache.delete(key);
      }
    }
  }

  /**
   * Délai avec promesse
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Récupère les statistiques du service
   */
  getServiceStats(): {
    cacheSize: number;
    cacheHits: number;
    apiCalls: number;
  } {
    return {
      cacheSize: this.analysisCache.size,
      cacheHits: 0, // À implémenter avec un compteur
      apiCalls: 0, // À implémenter avec un compteur
    };
  }

  /**
   * Purge le cache
   */
  purgeCache(): void {
    this.analysisCache.clear();
    this.logger.log('Cache purgé');
  }
}
