import { HttpException, HttpStatus, Inject, Injectable, forwardRef } from '@nestjs/common';
import fetch from 'node-fetch';
import { ConsultationStatus } from '../common/enums/consultation-status.enum';
import { ConsultationsService } from './consultations.service';
import { BirthData } from './deepseek.service';
import { PromptService } from './prompt.service';
import { UserConsultationChoiceService } from './user-consultation-choice.service';

@Injectable()
export class AnalysisService {
  private readonly DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
  private readonly DEFAULT_TEMPERATURE = 0.8;
  private readonly DEFAULT_MAX_TOKENS = 4500;
  private readonly DEFAULT_MODEL = 'deepseek-chat';

  constructor(
    private consultationsService: ConsultationsService,
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

  private buildUserPrompt(formData: any): string {
    const birthData = this.extractBirthData(formData);
    this.validateBirthData(birthData);

    const { prenoms, nom, dateNaissance, heureNaissance, villeNaissance, paysNaissance, genre } = birthData;
    const dateFormatee = this.formatDate(dateNaissance);
    const carteDuCielTexte = formData.carteDuCiel?.carteDuCiel?.aspectsTexte || '';

    const sections: string[] = [];
    sections.push(
      '## 👤 INFORMATIONS PERSONNELLES',
      `• **Prénoms à utiliser** : ${prenoms || ''}`,
      `• **Nom de famille** : ${nom || ''}`,
      `• **Genre** : ${genre || 'Non spécifié'}\n`,
    );

    sections.push(
      '## 🎂 DONNÉES DE NAISSANCE EXACTES',
      `• **Date de naissance** : ${dateFormatee}`,
      `• **Heure de naissance** : ${heureNaissance || 'Non spécifié'}`,
      `• **Lieu de naissance** : ${villeNaissance}, ${paysNaissance}\n`
    );

    sections.push(
      '## 📊 DONNÉES ASTROLOGIQUES DISPONIBLES\n',
      '### CARTE DU CIEL CALCULÉE :',
      carteDuCielTexte || 'Aucune carte du ciel disponible - veuillez générer une analyse basée sur les données de naissance ci-dessus\n'
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
      console.log('[generateAnalysis] Start', { id, userId: user?.id || user?._id });
      const consultation = await this.consultationsService.findOne(id);
      console.log('[generateAnalysis] Consultation loaded', { consultationId: consultation?._id });
      if (!consultation) {
        throw new HttpException('Consultation non trouvée', HttpStatus.NOT_FOUND);
      }

      const formData = consultation.formData || {};
      console.log('[generateAnalysis] formData', formData);

      let systemPrompt = this.getDefaultPrompt();
      if (consultation.choice?._id) {
        const customPrompt = await this.loadPromptFromDatabase(consultation.choice._id.toString());
        if (customPrompt) {
          systemPrompt = customPrompt;
        }
      }
      console.log('[generateAnalysis] systemPrompt', systemPrompt);

      const userPrompt = this.buildUserPrompt(formData);
      console.log('[generateAnalysis] userPrompt', userPrompt);

      const analyseComplete = await this.callDeepSeekAPI(systemPrompt, userPrompt, id);
      console.log('[generateAnalysis] analyseComplete (DeepSeek)', analyseComplete);
      const analysisDocument = {
        consultationId: id, ...analyseComplete,
        dateGeneration: new Date().toISOString(),
      };
      console.log('[generateAnalysis] analysisDocument', analysisDocument);

      await this.saveAnalysisResults(id, analysisDocument);
      console.log('[generateAnalysis] Results saved');

      const updatedConsultation = await this.consultationsService.update(id, { status: ConsultationStatus.COMPLETED });
      console.log('[generateAnalysis] Consultation updated', updatedConsultation?._id);

      const userId = this.extractUserId(consultation.clientId);
      if (userId) {
        await this.recordUserChoices(updatedConsultation, userId);
        console.log('[generateAnalysis] User choices recorded');
      }

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