import { HttpException, HttpStatus, Inject, Injectable, forwardRef } from '@nestjs/common';
import fetch from 'node-fetch';
import { ConsultationStatus } from '../common/enums/consultation-status.enum';
import { ConsultationsService } from './consultations.service';
import { BirthData, DeepseekService } from './deepseek.service';
import { PromptService } from './prompt.service';
import { UserConsultationChoiceService } from './user-consultation-choice.service';

@Injectable()
export class AnalysisService {
  private readonly DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
  private readonly DEFAULT_TEMPERATURE = 0.8;
  private readonly DEFAULT_MAX_TOKENS = 4500;
  private readonly DEFAULT_MODEL = 'deepseek-chat';
  private readonly NUMEROLOGY_TYPES = new Set(['NUMEROLOGIE', 'CYCLES_PERSONNELS', 'NOMBRES_PERSONNELS']);

  constructor(
    private consultationsService: ConsultationsService,
    private deepseekService: DeepseekService,
    private userConsultationChoiceService: UserConsultationChoiceService,
    @Inject(forwardRef(() => PromptService))
    private promptService: PromptService,
  ) { }

  private async loadPromptFromDatabase(choiceId: string): Promise<string | null> {
    try {
      const prompt: any = await this.promptService.findByChoiceId(choiceId);
      if (!prompt) return null;
      return this.formatPromptSections(prompt);
    } catch {
      return null;
    }
  }

  private formatPromptSections(prompt: any): string {
    const sections: string[] = [];

    if (prompt.title) sections.push(`${prompt.title}\n\n`);
    if (prompt.description) sections.push(`${prompt.description}\n\n`);
    if (prompt.role) sections.push(`Rôle : ${prompt.role}\n`);
    if (prompt.objective) sections.push(`Objectif : ${prompt.objective}\n`);

    if (prompt.styleAndTone?.length) {
      sections.push(`Style et Ton :\n${prompt.styleAndTone.map(style => `- ${style}`).join('\n')}\n`);
    }

    if (prompt.structure) {
      sections.push(`\nSTRUCTURE DE L'ANALYSE À RESPECTER\n`);

      if (prompt.structure.introduction) {
        sections.push(`Introduction : ${prompt.structure.introduction}\n`);
      }

      if (prompt.structure.sections?.length) {
        prompt.structure.sections.forEach((section, idx) => {
          if (section.title) sections.push(`${idx + 1}. ${section.title}\n`);
          if (section.content) sections.push(`  • ${section.content}\n`);

          if (section.guidelines?.length) {
            section.guidelines.forEach(guide => sections.push(`    - ${guide}\n`));
          }
        });
      }

      if (prompt.structure.synthesis) {
        sections.push(`\nSynthèse : ${prompt.structure.synthesis}\n`);
      }

      if (prompt.structure.conclusion) {
        sections.push(`\nConclusion : ${prompt.structure.conclusion}\n`);
      }
    }

    return sections.join('').trim();
  }

  private getDefaultPrompt(): string {
    return `Génère une analyse astrologique approfondie.`;
  }

  private extractBirthData(form: any): BirthData {
    return {
      nom: form.nom ?? form.lastName ?? '',
      prenoms: form.prenoms ?? form.firstName ?? '',
      dateNaissance: form.dateNaissance ?? form.dateOfBirth ?? '',
      heureNaissance: form.heureNaissance ?? form.timeOfBirth ?? '',
      villeNaissance: form.villeNaissance ?? form.cityOfBirth ?? '',
      paysNaissance: (form.paysNaissance || form.countryOfBirth || form.country || '').trim(),
      email: form.email ?? '',
      genre: form.genre || form.gender || '',
      phone: form.phone || '',
    } as BirthData;
  }

  private validateBirthData(birthData: BirthData): void {
    const fieldLabels: Record<keyof BirthData, string> = {
      nom: 'Nom',
      prenoms: 'Prénom(s)',
      dateNaissance: 'Date de naissance',
      heureNaissance: 'Heure de naissance',
      villeNaissance: 'Ville de naissance',
      paysNaissance: 'Pays de naissance',
      email: 'Email',
      genre: 'Genre',
      zodiacSign: 'Signe zodiacal',
      horoscopeType: 'Type d\'horoscope',
      dateOfBirth: 'Date de naissance',
      partnerSign: 'Signe du partenaire',
      element: 'Élément',
      symbol: 'Symbole',
    };

    const requiredFields: (keyof BirthData)[] = [
      'nom', 'prenoms', 'dateNaissance', 'heureNaissance', 'villeNaissance', 'paysNaissance'
    ];

    const missingFields = requiredFields
      .filter(field => !birthData[field]?.toString().trim())
      .map(field => fieldLabels[field] || field);

    if (missingFields.length) {
      throw new HttpException(
        `Données de naissance incomplètes. Champ(s) manquant(s) : ${missingFields.join(', ')}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  private async callDeepSeekAPI(
    systemPrompt: string,
    userPrompt: string,
    consultationId?: string
  ): Promise<any> {
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    if (!DEEPSEEK_API_KEY) {
      throw new HttpException('Clé API DeepSeek non configurée', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await fetch(this.DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: this.DEFAULT_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: this.DEFAULT_TEMPERATURE,
          max_tokens: this.DEFAULT_MAX_TOKENS,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur API DeepSeek (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || '';

      // Tentative de parsing JSON, sinon retourne le texte brut
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        return {
          consultationId,
          ...(jsonMatch ? JSON.parse(jsonMatch[0]) : { texte: aiResponse }),
          dateGeneration: new Date().toISOString(),
        };
      } catch {
        return {
          consultationId,
          texte: aiResponse,
          dateGeneration: new Date().toISOString(),
        };
      }

    } catch (error) {
      throw new HttpException(
        `Échec de l'appel à l'API DeepSeek: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async saveAnalysisResults(
    consultationId: string,
    analysisData: any,
  ): Promise<void> {
    const resultDataKey = 'analyse';
    await this.consultationsService.update(consultationId, {
      resultData: { [resultDataKey]: analysisData }
    });
  }

  private async recordUserChoices(consultation: any, userId: string): Promise<void> {
    if (!consultation.choice?._id) return;

    const { choice } = consultation;
    await this.userConsultationChoiceService.recordChoicesForConsultation(
      userId,
      consultation._id?.toString() || '',
      [{
        title: choice.title,
        choiceId: choice._id,
        frequence: choice.frequence || 'LIBRE',
        participants: choice.participants || 'SOLO',
      }]
    );
  }

  private getSuccessMessage(consultationType: string): string {
    const messages: Record<string, string> = {
      'HOROSCOPE': 'Horoscope généré avec succès',
      'NUMEROLOGIE': 'Analyse numérologique générée avec succès',
      'CYCLES_PERSONNELS': 'Analyse des cycles personnels générée avec succès',
      'NOMBRES_PERSONNELS': 'Analyse des nombres personnels générée avec succès',
    };

    return messages[consultationType] || 'Analyse générée avec succès';
  }

  private formatDate(date: string | Date, options: Intl.DateTimeFormatOptions = {}): string {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    };

    try {
      return new Date(date).toLocaleDateString('fr-FR', defaultOptions);
    } catch {
      return String(date);
    }
  }

  private buildUserPrompt(formData: any, consultation: any): string {
    const birthData = this.extractBirthData(formData);
    this.validateBirthData(birthData);

    const { prenoms, nom, dateNaissance, heureNaissance, villeNaissance, paysNaissance, genre, email } = birthData;
    const dateFormatee = this.formatDate(dateNaissance);
    const dateDemande = this.formatDate(new Date());
    const carteDuCielTexte = formData.carteDuCiel?.carteDuCiel?.aspectsTexte || '';
    const missionDeVie = formData.carteDuCiel?.missionDeVie?.contenu || '';

    const sections: string[] = [];
    sections.push(`🌌 ANALYSE DES TALENTS INNÉS - DONNÉES PERSONNELLISÉES\n`);
    sections.push(
      '## 👤 INFORMATIONS PERSONNELLES',
      `• **Prénom à utiliser** : ${prenoms || 'le consultant'}`,
      `• **Nom de famille** : ${nom || ''}`,
      `• **Genre** : ${genre || 'Non spécifié'}`,
      `• **Email** : ${email || 'Non fourni'}\n`
    );

    sections.push(
      '## 🎂 DONNÉES DE NAISSANCE EXACTES',
      `• **Date de naissance** : ${dateFormatee}`,
      `• **Heure de naissance** : ${heureNaissance}`,
      `• **Lieu de naissance** : ${villeNaissance}, ${paysNaissance}\n`
    );

    sections.push(
      '## 📊 DONNÉES ASTROLOGIQUES DISPONIBLES\n',
      '### CARTE DU CIEL CALCULÉE :',
      carteDuCielTexte || 'Aucune carte du ciel disponible - veuillez générer une analyse basée sur les données de naissance ci-dessus\n'
    );

    if (missionDeVie) {
      sections.push(
        '### ANALYSE DE MISSION DE VIE EXISTANTE (contexte supplémentaire) :',
        `${missionDeVie.substring(0, 300)}${missionDeVie.length > 300 ? '...' : ''}\n`
      );
    }

    sections.push(
      '## 🎯 CONTEXTE DE LA CONSULTATION',
      `• **Type d'analyse demandée** : ${consultation.type || 'Analyse standard'}`,
      `• **Date de la demande** : ${dateDemande}`,
      `• **Identifiant consultation** : ${consultation._id || 'N/A'}`,
      consultation.choice?.title ? `• **Forfait choisi** : ${consultation.choice.title}` : '',
      ''
    );

    sections.push(
      '## 📝 CONSIGNES SPÉCIFIQUES POUR CETTE ANALYSE\n',
      `1. **Adresse-toi directement à ${prenoms}** en utilisant systématiquement le tutoiement`,
      `2. **Personnalise l'analyse** avec son prénom "${prenoms}" tout au long du texte`,
      '3. **Base-toi sur les données astrologiques fournies** (carte du ciel ci-dessus)',
      '4. **Si certaines données manquent**, utilise tes connaissances astrologiques pour compléter',
      `5. **Propose des exemples concrets** adaptés au profil de ${prenoms}`,
      '6. **Mets l\'accent sur les applications pratiques** dans la vie quotidienne',
      `7. **Prends en compte le lieu de naissance** : ${villeNaissance}, ${paysNaissance}\n`
    );

    sections.push(
      '## 💫 DOMAINES À EXPLORER EN PRIORITÉ\n',
      '### 1. IDENTIFICATION DES TALENTS NATURELS',
      `• Quels sont les dons innés de ${prenoms} basés sur ses positions planétaires ?`,
      `• Comment ces talents se manifestent-ils dans sa vie actuelle ?`,
      '• Quels potentiels restent à développer ou sont sous-utilisés ?\n',

      '### 2. APPLICATIONS PROFESSIONNELLES',
      `• Comment ${prenoms} peut-il/elle valoriser ses talents dans son travail ?`,
      '• Quels métiers, secteurs ou activités seraient les plus épanouissants ?',
      '• Comment transformer ses forces astrologiques en avantages compétitifs ?\n',

      '### 3. DÉVELOPPEMENT PERSONNEL',
      '• Quels exercices pratiques pour renforcer ses talents spécifiques ?',
      '• Comment surmonter les blocages éventuels liés à sa configuration astrologique ?',
      '• Quelles habitudes développer pour exprimer pleinement son potentiel astrologique ?\n',

      '### 4. SYNERGIE DES COMPÉTENCES',
      `• Comment les différents talents de ${prenoms} (basés sur Soleil, Mercure, Maison 2, etc.) interagissent-ils ?`,
      '• Quelles combinaisons créerait un effet multiplicateur ?',
      '• Comment équilibrer ses différentes facettes astrologiques ?\n'
    );

    sections.push(
      '## 🏁 ATTENTES SPÉCIFIQUES\n',
      'L\'analyse doit être :',
      `• **Inspirante et encourageante** : motive ${prenoms} à exploiter son potentiel astrologique`,
      '• **Concrète et applicable** : propose des actions réalisables dès maintenant',
      '• **Personnalisée** : fait référence à son profil astrologique unique',
      '• **Structurée** : suit le plan défini dans le prompt système',
      '• **Bienveillante** : adopte un ton chaleureux et soutenant',
      `• **Contextualisée** : prend en compte le contexte géographique (${paysNaissance})\n`,

      '---',
      `**Note importante** : Toute cette analyse doit être adaptée spécifiquement à ${prenoms} en utilisant ses données exactes de naissance (${dateFormatee} à ${heureNaissance} à ${villeNaissance}, ${paysNaissance}) et son contexte personnel.`
    );

    return sections.join('\n');
  }

  private extractUserId(clientId: any): string | null {
    if (!clientId) return null;

    if (typeof clientId === 'string') {
      return clientId;
    }

    if (typeof clientId === 'object' && clientId !== null) {
      if ('toHexString' in clientId && typeof clientId.toHexString === 'function') {
        return clientId.toHexString();
      }
      if ('_id' in clientId && clientId._id) {
        return String(clientId._id);
      }
      if (typeof clientId.toString === 'function') {
        return clientId.toString();
      }
    }

    return null;
  }

  async generateAnalysis(id: string, user: any) {
    try {
      const consultation = await this.consultationsService.findOne(id);
      if (!consultation) {
        throw new HttpException('Consultation non trouvée', HttpStatus.NOT_FOUND);
      }

      const formData = consultation.formData || {};

      let systemPrompt = this.getDefaultPrompt();
      if (consultation.choice?._id) {
        const customPrompt = await this.loadPromptFromDatabase(consultation.choice._id.toString());
        if (customPrompt) {
          systemPrompt = customPrompt;
        }
      }

      const userPrompt = this.buildUserPrompt(formData, consultation);

      let analyseComplete: any;
      const isNumerology = this.NUMEROLOGY_TYPES.has(consultation.type);
      const hasCarteDuCiel = !!formData.carteDuCiel?.carteDuCiel?.aspectsTexte;

      if (consultation.type === 'HOROSCOPE' || isNumerology || hasCarteDuCiel) {
        analyseComplete = await this.callDeepSeekAPI(systemPrompt, userPrompt, id);
      } else {
        analyseComplete = await this.deepseekService.genererAnalyseComplete(userPrompt, systemPrompt);
      }

      const analysisDocument = {
        consultationId: id, ...analyseComplete,
        dateGeneration: new Date().toISOString(),
      };

      await this.saveAnalysisResults(id, analysisDocument);

      const updatedConsultation = await this.consultationsService.update(id, { status: ConsultationStatus.COMPLETED });

      const userId = this.extractUserId(consultation.clientId);
      if (userId) {
        await this.recordUserChoices(updatedConsultation, userId);
      }

      console.log("Updated consultation now", updatedConsultation);

      return {
        success: true,
        consultationId: id,
        statut: ConsultationStatus.COMPLETED,
        message: this.getSuccessMessage(consultation.type),
        consultation: updatedConsultation,
      };

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          error: `Erreur lors de la génération: ${error.message}`,
          statut: 'error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}