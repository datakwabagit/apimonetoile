/**
 * Service pour générer des analyses astrologiques via DeepSeek AI
 */

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
}

export interface DeepSeekResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
}

@Injectable()
export class DeepseekService {
  private readonly DEEPSEEK_API_KEY: string;
  private readonly DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
  private readonly SYSTEM_PROMPT = `Tu es un astrologue professionnel expert. Tu analyses les cartes du ciel avec précision et profondeur. Tes réponses sont structurées, empathiques et riches en insights pratiques.`;

  constructor(private configService: ConfigService) {
    this.DEEPSEEK_API_KEY = this.configService.get<string>('DEEPSEEK_API_KEY') || '';
    if (!this.DEEPSEEK_API_KEY) {
      console.warn('[DeepSeek] DEEPSEEK_API_KEY non configurée');
    }
  }

  /**
   * Appelle l'API DeepSeek
   */
  private async callDeepSeek(messages: DeepSeekMessage[]): Promise<string> {
    if (!this.DEEPSEEK_API_KEY) {
      throw new HttpException(
        'DEEPSEEK_API_KEY non configurée',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const request: DeepSeekRequest = {
      model: 'deepseek-chat',
      messages,
      temperature: 0.7,
      max_tokens: 4000,
    };

    const response = await fetch(this.DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new HttpException(
        `Erreur DeepSeek API: ${response.status} - ${errorText}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    const data: DeepSeekResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new HttpException('Aucune réponse de DeepSeek', HttpStatus.BAD_GATEWAY);
    }

    return data.choices[0].message.content;
  }

  /**
   * Génère le prompt pour la carte du ciel
   */
  private generateCarteDuCielPrompt(birthData: BirthData): string {
    return `Génère la CARTE DU CIEL complète pour :

NOM: ${birthData.nom}
PRÉNOMS: ${birthData.prenoms}
DATE DE NAISSANCE: ${birthData.dateNaissance}
HEURE DE NAISSANCE: ${birthData.heureNaissance}
LIEU DE NAISSANCE: ${birthData.villeNaissance}, ${birthData.paysNaissance}

Fournis UNIQUEMENT les positions suivantes au format précis :
- Soleil en [Signe]
- Ascendant en [Signe]
- Lune en [Signe]
- Milieu du Ciel en [Signe]
- MERCURE EN [SIGNE] EN MAISON [X]
- VÉNUS EN [SIGNE] EN MAISON [X]
- MARS EN [SIGNE] EN MAISON [X]
- JUPITER [RÉTROGRADE] EN [SIGNE] EN MAISON [X]
- SATURNE [RÉTROGRADE] EN [SIGNE] EN MAISON [X]
- URANUS [RÉTROGRADE] EN [SIGNE] EN MAISON [X]
- NEPTUNE [RÉTROGRADE] EN [SIGNE] EN MAISON [X]
- PLUTON [RÉTROGRADE] EN [SIGNE] EN MAISON [X]
- Nœud Nord en [Signe] en Maison [X]
- Nœud Sud en [Signe] en Maison [X]
- CHIRON EN [SIGNE] : MAISON [X]
- VERTEX EN [SIGNE] : MAISON [X]
- LILITH VRAIE [RÉTROGRADE] EN [SIGNE] – MAISON [X]
- PALLAS EN [SIGNE] EN MAISON [X]
- VESTA EN [SIGNE] EN MAISON [X]
- CÉRÈS EN [SIGNE] EN MAISON [X]
- PART DE FORTUNE & JUNON EN [SIGNE] EN MAISON [X]

Réponds UNIQUEMENT avec les positions, sans explication.`;
  }

  /**
   * Génère le prompt pour la mission de vie
   */
  private generateMissionDeViePrompt(birthData: BirthData, carteDuCiel: string): string {
    return `Dans la carte du ciel de ${birthData.prenoms} ${birthData.nom}, prends en compte les positions des astres ci-dessous pour faire une analyse astrologique lui permettant de comprendre et connaître sa MISSION DE VIE :

CARTE DU CIEL :
${carteDuCiel}

ÉLÉMENTS À ANALYSER :
• Nœud Nord & Nœud Sud (position, maison, aspects) — indicateur principal du but karmique et des thèmes à développer/éviter.
• Milieu du Ciel (MC) & Maison 10 — vocation publique / impact social lié à la mission.
• Soleil (position, maison, aspects) — vitalité, expression essentielle de l'âme.
• Jupiter (expansion, sens, vocation spirituelle) et Saturne (structure, leçon) — grand cadre de mission.
• Chiron (si relié aux nœuds ou au Soleil) — appel à transformer la blessure en service.
• Part of Fortune (localise chance alignée à la vocation).
• Astéroïdes : Vesta (consécration / vocation spirituelle), Pallas (stratégie/mission intellectuelle), Cérès (service/soin).

ASPECTS À ANALYSER :
• Conjonctions Nœud-Soleil/MC/Jupiter (forte empreinte de mission).
• Trigones/Sextiles Nœud-planètes rapides (facilitant) vs Carrés/Oppositions (épreuves formatrices).
• Aspects majeurs impliquant Saturne (obligation/discipline) ou Neptune (vocation spirituelle, possible confusion).

Fournis une analyse détaillée et structurée.`;
  }

  /**
   * Génère l'analyse complète
   */
  async genererAnalyseComplete(birthData: BirthData): Promise<any> {
    console.log('[DeepSeek] Début génération analyse complète pour', birthData.prenoms, birthData.nom);

    try {
      // 1. Générer la carte du ciel
      const carteDuCielPrompt = this.generateCarteDuCielPrompt(birthData);
      const carteDuCielTexte = await this.callDeepSeek([
        { role: 'system', content: this.SYSTEM_PROMPT },
        { role: 'user', content: carteDuCielPrompt },
      ]);

      console.log('[DeepSeek] Carte du ciel générée');

      // 2. Générer la mission de vie
      const missionDeViePrompt = this.generateMissionDeViePrompt(birthData, carteDuCielTexte);
      const missionDeVieTexte = await this.callDeepSeek([
        { role: 'system', content: this.SYSTEM_PROMPT },
        { role: 'user', content: missionDeViePrompt },
      ]);

      console.log('[DeepSeek] Mission de vie générée');

      // Construire l'analyse complète
      const analyseComplete = {
        carteDuCiel: {
          sujet: {
            nom: birthData.nom,
            prenoms: birthData.prenoms,
            dateNaissance: birthData.dateNaissance,
            lieuNaissance: `${birthData.villeNaissance}, ${birthData.paysNaissance}`,
            heureNaissance: birthData.heureNaissance,
          },
          positions: this.parsePositions(carteDuCielTexte),
          aspectsTexte: carteDuCielTexte,
        },
        missionDeVie: {
          titre: 'Mission de Vie',
          contenu: missionDeVieTexte,
        },
        talentsNaturels: {
          titre: 'Talents Naturels',
          contenu: 'Analyse en cours de développement',
        },
        relations: {
          titre: 'Relations',
          contenu: 'Analyse en cours de développement',
        },
        carriereVocation: {
          titre: 'Carrière & Vocation',
          contenu: 'Analyse en cours de développement',
        },
        spiritualiteCroissance: {
          titre: 'Spiritualité & Croissance',
          contenu: 'Analyse en cours de développement',
        },
      };

      console.log('[DeepSeek] Analyse complète générée avec succès');
      return analyseComplete;
    } catch (error) {
      console.error('[DeepSeek] Erreur génération analyse:', error);
      throw error;
    }
  }

  /**
   * Parse les positions planétaires depuis le texte brut
   */
  private parsePositions(texte: string): any[] {
    const positions: any[] = [];
    const lignes = texte.split('\n').filter((l) => l.trim());

    for (const ligne of lignes) {
      const match = ligne.match(
        /^([\w\s]+?)\s+(?:RÉTROGRADE\s+)?EN\s+([\wéèêàâùç]+)(?:\s+[E:–-]\s*MAISON\s+(\d+))?/i,
      );

      if (match) {
        const planete = match[1].trim();
        const signe = match[2].trim();
        const maison = match[3] ? parseInt(match[3]) : undefined;
        const retrograde = /RÉTROGRADE/i.test(ligne);

        positions.push({
          planete,
          signe,
          maison: maison || 1,
          retrograde,
        });
      }
    }

    return positions;
  }
}
