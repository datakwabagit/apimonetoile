// /**
//  * Service pour générer des analyses astrologiques via DeepSeek AI
//  */

// import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';

// export interface BirthData {
//   nom: string;
//   prenoms: string;
//   genre: string;
//   dateNaissance: string;
//   heureNaissance: string;
//   paysNaissance: string;
//   villeNaissance: string;
//   email?: string;
// }

// export interface DeepSeekMessage {
//   role: 'system' | 'user' | 'assistant';
//   content: string;
// }

// export interface DeepSeekRequest {
//   model: string;
//   messages: DeepSeekMessage[];
//   temperature?: number;
//   max_tokens?: number;
// }

// export interface DeepSeekResponse {
//   choices: Array<{
//     message: {
//       role: string;
//       content: string;
//     };
//   }>;
// }

// @Injectable()
// export class DeepseekService {
//   private readonly DEEPSEEK_API_KEY: string;
//   private readonly DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
//   private readonly SYSTEM_PROMPT = `Tu es un astrologue professionnel expert. Tu analyses les cartes du ciel avec précision et profondeur. Tes réponses sont structurées, empathiques et riches en insights pratiques.`;

//   constructor(private configService: ConfigService) {
//     this.DEEPSEEK_API_KEY = this.configService.get<string>('DEEPSEEK_API_KEY') || '';
//     if (!this.DEEPSEEK_API_KEY) {
//       console.warn('[DeepSeek] DEEPSEEK_API_KEY non configurée');
//     }
//   }

//   /**
//    * Appelle l'API DeepSeek avec timeout étendu
//    */
//   private async callDeepSeek(messages: DeepSeekMessage[]): Promise<string> {
//     if (!this.DEEPSEEK_API_KEY) {
//       throw new HttpException('DEEPSEEK_API_KEY non configurée', HttpStatus.SERVICE_UNAVAILABLE);
//     }

//     const request: DeepSeekRequest = {
//       model: 'deepseek-chat',
//       messages,
//       temperature: 0.7,
//       max_tokens: 4000,
//     };

//     console.log('[DeepSeek] Envoi requête API...');
//     const startTime = Date.now();

//     // Utiliser AbortController pour timeout personnalisé
//     const controller = new AbortController();
//     const timeoutId = setTimeout(() => controller.abort(), 400000); // 6 minutes 40 secondes

//     try {
//       const response = await fetch(this.DEEPSEEK_API_URL, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${this.DEEPSEEK_API_KEY}`,
//         },
//         body: JSON.stringify(request),
//         signal: controller.signal,
//       });

//       clearTimeout(timeoutId);

//       if (!response.ok) {
//         const errorText = await response.text();
//         throw new HttpException(
//           `Erreur DeepSeek API: ${response.status} - ${errorText}`,
//           HttpStatus.BAD_GATEWAY,
//         );
//       }

//       const data: DeepSeekResponse = await response.json();

//       if (!data.choices || data.choices.length === 0) {
//         throw new HttpException('Aucune réponse de DeepSeek', HttpStatus.BAD_GATEWAY);
//       }

//       const duration = Date.now() - startTime;
//       console.log(`[DeepSeek] Réponse reçue en ${duration}ms`);

//       return data.choices[0].message.content;
//     } catch (error) {
//       clearTimeout(timeoutId);

//       if (error.name === 'AbortError') {
//         throw new HttpException(
//           'Timeout DeepSeek API (120s dépassé)',
//           HttpStatus.REQUEST_TIMEOUT,
//         );
//       }
//       throw error;
//     }
//   }

//   /**
//    * Génère le prompt pour la carte du ciel
//    */
//   private generateCarteDuCielPrompt(birthData: BirthData): string {
//     return `Génère la CARTE DU CIEL complète pour :

// NOM: ${birthData.nom}
// PRÉNOMS: ${birthData.prenoms}
// DATE DE NAISSANCE: ${birthData.dateNaissance}
// HEURE DE NAISSANCE: ${birthData.heureNaissance}
// LIEU DE NAISSANCE: ${birthData.villeNaissance}, ${birthData.paysNaissance}

// Fournis UNIQUEMENT les positions suivantes au format précis :
// - Soleil en [Signe]
// - Ascendant en [Signe]
// - Lune en [Signe]
// - Milieu du Ciel en [Signe]
// - MERCURE EN [SIGNE] EN MAISON [X]
// - VÉNUS EN [SIGNE] EN MAISON [X]
// - MARS EN [SIGNE] EN MAISON [X]
// - JUPITER [RÉTROGRADE] EN [SIGNE] EN MAISON [X]
// - SATURNE [RÉTROGRADE] EN [SIGNE] EN MAISON [X]
// - URANUS [RÉTROGRADE] EN [SIGNE] EN MAISON [X]
// - NEPTUNE [RÉTROGRADE] EN [SIGNE] EN MAISON [X]
// - PLUTON [RÉTROGRADE] EN [SIGNE] EN MAISON [X]
// - Nœud Nord en [Signe] en Maison [X]
// - Nœud Sud en [Signe] en Maison [X]
// - CHIRON EN [SIGNE] : MAISON [X]
// - VERTEX EN [SIGNE] : MAISON [X]
// - LILITH VRAIE [RÉTROGRADE] EN [SIGNE] – MAISON [X]
// - PALLAS EN [SIGNE] EN MAISON [X]
// - VESTA EN [SIGNE] EN MAISON [X]
// - CÉRÈS EN [SIGNE] EN MAISON [X]
// - PART DE FORTUNE & JUNON EN [SIGNE] EN MAISON [X]

// Réponds UNIQUEMENT avec les positions, sans explication.`;
//   }

//   /**
//    * Génère le prompt pour la mission de vie
//    */
//   private generateMissionDeViePrompt(birthData: BirthData, carteDuCiel: string): string {
//     return `Dans la carte du ciel de ${birthData.prenoms} ${birthData.nom}, prends en compte les positions des astres ci-dessous pour faire une analyse astrologique lui permettant de comprendre et connaître sa MISSION DE VIE :

// CARTE DU CIEL :
// ${carteDuCiel}

// ÉLÉMENTS À ANALYSER :
// • Nœud Nord & Nœud Sud (position, maison, aspects) — indicateur principal du but karmique et des thèmes à développer/éviter.
// • Milieu du Ciel (MC) & Maison 10 — vocation publique / impact social lié à la mission.
// • Soleil (position, maison, aspects) — vitalité, expression essentielle de l'âme.
// • Jupiter (expansion, sens, vocation spirituelle) et Saturne (structure, leçon) — grand cadre de mission.
// • Chiron (si relié aux nœuds ou au Soleil) — appel à transformer la blessure en service.
// • Part of Fortune (localise chance alignée à la vocation).
// • Astéroïdes : Vesta (consécration / vocation spirituelle), Pallas (stratégie/mission intellectuelle), Cérès (service/soin).

// ASPECTS À ANALYSER :
// • Conjonctions Nœud-Soleil/MC/Jupiter (forte empreinte de mission).
// • Trigones/Sextiles Nœud-planètes rapides (facilitant) vs Carrés/Oppositions (épreuves formatrices).
// • Aspects majeurs impliquant Saturne (obligation/discipline) ou Neptune (vocation spirituelle, possible confusion).

// Fournis une analyse détaillée et structurée.`;
//   }

//   /**
//    * Génère l'analyse complète
//    */
//   async genererAnalyseComplete(birthData: BirthData): Promise<any> {
//     console.log(
//       '[DeepSeek] Début génération analyse complète pour',
//       birthData.prenoms,
//       birthData.nom,
//     );

//     try {
//       // 1. Générer la carte du ciel
//       const carteDuCielPrompt = this.generateCarteDuCielPrompt(birthData);
//       const carteDuCielTexte = await this.callDeepSeek([
//         { role: 'system', content: this.SYSTEM_PROMPT },
//         { role: 'user', content: carteDuCielPrompt },
//       ]);

//       console.log('[DeepSeek] Carte du ciel générée');

//       // 2. Générer la mission de vie
//       const missionDeViePrompt = this.generateMissionDeViePrompt(birthData, carteDuCielTexte);
//       const missionDeVieTexte = await this.callDeepSeek([
//         { role: 'system', content: this.SYSTEM_PROMPT },
//         { role: 'user', content: missionDeViePrompt },
//       ]);

//       console.log('[DeepSeek] Mission de vie générée');

//       // Construire l'analyse complète
//       const analyseComplete = {
//         carteDuCiel: {
//           sujet: {
//             nom: birthData.nom,
//             prenoms: birthData.prenoms,
//             dateNaissance: birthData.dateNaissance,
//             lieuNaissance: `${birthData.villeNaissance}, ${birthData.paysNaissance}`,
//             heureNaissance: birthData.heureNaissance,
//           },
//           positions: this.parsePositions(carteDuCielTexte),
//           aspectsTexte: carteDuCielTexte,
//         },
//         missionDeVie: {
//           titre: 'Mission de Vie',
//           contenu: missionDeVieTexte,
//         },
//         talentsNaturels: {
//           titre: 'Talents Naturels',
//           contenu: 'Analyse en cours de développement',
//         },
//         relations: {
//           titre: 'Relations',
//           contenu: 'Analyse en cours de développement',
//         },
//         carriereVocation: {
//           titre: 'Carrière & Vocation',
//           contenu: 'Analyse en cours de développement',
//         },
//         spiritualiteCroissance: {
//           titre: 'Spiritualité & Croissance',
//           contenu: 'Analyse en cours de développement',
//         },
//       };

//       console.log('[DeepSeek] Analyse complète générée avec succès');
//       return analyseComplete;
//     } catch (error) {
//       console.error('[DeepSeek] Erreur génération analyse:', error);
//       throw error;
//     }
//   }

//   /**
//    * Parse les positions planétaires depuis le texte brut
//    */
//   private parsePositions(texte: string): any[] {
//     const positions: any[] = [];
//     const lignes = texte.split('\n').filter((l) => l.trim());

//     for (const ligne of lignes) {
//       const match = ligne.match(
//         /^([\w\s]+?)\s+(?:RÉTROGRADE\s+)?EN\s+([\wéèêàâùç]+)(?:\s+[E:–-]\s*MAISON\s+(\d+))?/i,
//       );

//       if (match) {
//         const planete = match[1].trim();
//         const signe = match[2].trim();
//         const maison = match[3] ? parseInt(match[3]) : undefined;
//         const retrograde = /RÉTROGRADE/i.test(ligne);

//         positions.push({
//           planete,
//           signe,
//           maison: maison || 1,
//           retrograde,
//         });
//       }
//     }

//     return positions;
//   }
// }
/**
 * Service optimisé pour générer des analyses astrologiques via DeepSeek AI
 */

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

    this.logger.debug(`[${requestId}] Appel API DeepSeek démarré`, {
      messages: messages.length,
      model,
    });

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
          this.logger.log(`[${requestId}] API call réussie en ${duration}ms`, {
            attempt,
            tokens: response.data.usage?.total_tokens,
            duration,
          });

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
      this.logger.debug(`[${sessionId}] Carte du ciel générée`, {
        tokens: carteDuCielResponse.usage?.total_tokens,
      });

      // 2. Générer la mission de vie en parallèle si possible
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
      this.logger.debug(`[${sessionId}] Mission de vie générée`, {
        tokens: missionDeVieResponse.usage?.total_tokens,
      });

      // 3. Parser les positions
      const positions = this.parsePositionsAmeliore(carteDuCielTexte);

      // 4. Construire le résultat
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
