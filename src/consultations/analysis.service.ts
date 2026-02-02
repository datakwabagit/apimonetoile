import { HttpException, HttpStatus, Inject, Injectable, forwardRef } from '@nestjs/common';
import fetch from 'node-fetch';
import { ConsultationStatus } from '../common/enums/consultation-status.enum';
import { ConsultationsService } from './consultations.service';
import { BirthData, DeepseekService } from './deepseek.service';
import { PromptService } from './prompt.service';
import { UserConsultationChoiceService } from './user-consultation-choice.service';
import { AnalysisDbService } from './analysis-db.service';
import { User, UserDocument } from '@/users/schemas/user.schema';
import { Cons } from 'rxjs';

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
    private analysisDbService: AnalysisDbService,
    private deepseekService: DeepseekService,
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
      gender: form.genre || form.gender || '',
      country: form.country || '',
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
      gender: 'Genre',
      dateOfBirth: 'Date de naissance',
      country: 'Pays',
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
      const requestBody = {
        model: this.DEFAULT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: this.DEFAULT_TEMPERATURE,
        max_tokens: this.DEFAULT_MAX_TOKENS,
      };


      // Timeout helper for fetch
      const fetchWithTimeout = (url, options, timeoutMs = 60000) => {
        return Promise.race([
          fetch(url, options),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout API DeepSeek')), timeoutMs))
        ]);
      };

      let response;
      try {
        response = await fetchWithTimeout(this.DEEPSEEK_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify(requestBody),
        }, 60000);
      } catch (err) {
        if (err && err.code === 'ERR_STREAM_PREMATURE_CLOSE') {
          console.error('[DeepSeek] Erreur de flux réseau (fermeture prématurée):', err);
          throw new HttpException('Connexion interrompue prématurément avec DeepSeek', HttpStatus.BAD_GATEWAY);
        }
        console.error('[DeepSeek] Erreur lors de la requête fetch:', err);
        throw new HttpException('Erreur réseau lors de l’appel à DeepSeek: ' + err.message, HttpStatus.BAD_GATEWAY);
      }

      let rawResponseText = '';
      try {
        rawResponseText = await response.clone().text();
        console.debug('[DeepSeek] Réponse brute:', rawResponseText);
      } catch (e) {
        console.warn('[DeepSeek] Impossible de lire la réponse brute:', e);
      }

      if (!response.ok) {
        throw new Error(`Erreur API DeepSeek (${response.status}): ${rawResponseText}`);
      }

      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error('[DeepSeek] Erreur parsing JSON:', e, 'Réponse brute:', rawResponseText);
        throw new Error('Réponse DeepSeek non valide (JSON)');
      }

      const aiResponse = data.choices?.[0]?.message?.content || '';

      try {
        // Remove code block markers if present
        let cleaned = aiResponse.trim();
        if (cleaned.startsWith('```json')) {
          cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        } else if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```\s*/i, '').replace(/```$/, '').trim();
        }
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        return {
          consultationId,
          ...(jsonMatch ? JSON.parse(jsonMatch[0]) : { texte: cleaned }),
          dateGeneration: new Date().toISOString(),
        };
      } catch (e) {
        console.warn('[DeepSeek] Erreur parsing JSON dans le message AI:', e, 'Texte:', aiResponse);
        return {
          consultationId,
          texte: aiResponse,
          dateGeneration: new Date().toISOString(),
        };
      }

    } catch (error) {
      console.error('[DeepSeek] Erreur lors de l’appel API:', error);
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

    // Récupérer la consultation pour enrichir l'analyse
    const consultation = await this.consultationsService.findOne(consultationId);
    if (!consultation) {
      console.warn(`[AnalysisService] Consultation non trouvée pour enrichir l'analyse (${consultationId})`);
      return;
    }

    // Préparer tous les champs pertinents pour l'analyse
    const analysisToSave = {
      consultationID: consultationId,
      texte: analysisData.texte,
      clientId: consultation.clientId?.toString?.() || consultation.clientId,
      type: consultation.type,
      status: consultation.status,
      title: consultation.title,
      completedDate: consultation.completedDate,
    };

    await this.analysisDbService.createAnalysis(analysisToSave as any);
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

  private buildUserPrompt(formData: any, user: UserDocument): string {
    const birthData = this.extractBirthData(formData);
    this.validateBirthData(birthData);
    const { prenoms, nom, dateNaissance, heureNaissance, villeNaissance, paysNaissance, gender } = birthData;
    const dateFormatee = this.formatDate(dateNaissance);
    const sections: string[] = [];

    // Format gender to French
    let genderFr = 'Non spécifié';
    if (gender) {
      const g = gender.toLowerCase();
      if (g === 'male' || g === 'masculin' || g === 'm') genderFr = 'Homme';
      else if (g === 'female' || g === 'feminin' || g === 'f') genderFr = 'Femme';
      else genderFr = gender;
    }

    sections.push(
      '## 👤 INFORMATIONS PERSONNELLES',
      `• **Prénoms à utiliser** : ${prenoms || ''}`,
      `• **Nom de famille** : ${nom || ''}`,
      `• **Genre** : ${genderFr}\n`,
    );

    sections.push(
      '## 🎂 DONNÉES DE NAISSANCE EXACTES',
      `• **Date de naissance** : ${dateFormatee}`,
      `• **Heure de naissance** : ${heureNaissance || 'Non spécifié'}`,
      `• **Lieu de naissance** : ${villeNaissance}, ${paysNaissance}\n`
    );

    sections.push(
      '## CARTE DU CIEL :\n',
      user.aspectsTexte,
    );

    return sections.join('\n');
  }

    private buildUserPrompttiercenouveau(formData: any, user: UserDocument, tierce: any, consultation:any): string {
    // Si la consultation est pour une tierce personne uniquement
    if (
      consultation?.choice?.frequence === 'LIBRE' &&
      consultation?.choice?.participants === 'POUR_TIERS'
    ) {
      // Tierce data extraction and formatting
      const tiercePrenoms = tierce?.prenoms || '';
      const tierceNom = tierce?.nom || '';
      const tierceDateNaissance = tierce?.dateNaissance || '';
      const tierceHeureNaissance = tierce?.heureNaissance || '';
      const tierceVilleNaissance = tierce?.villeNaissance || '';
      const tiercePaysNaissance = tierce?.paysNaissance || tierce?.country || '';
      const tierceGender = this.normalizeGenderFr(tierce?.gender);
      const tierceDateFormatee = this.formatDate(tierceDateNaissance);
      const lieuTierce = [tierceVilleNaissance, tiercePaysNaissance].filter(Boolean).join(", ").trim() || "Non spécifié";

      const sections: string[] = [];
      sections.push(
        '## 👤 INFORMATIONS PERSONNELLES',
        this.safeLine('Prénoms à utiliser', tiercePrenoms),
        this.safeLine('Nom de famille', tierceNom),
        this.safeLine('Genre', tierceGender),
        '',
        '## 🎂 DONNÉES DE NAISSANCE EXACTES',
        this.safeLine('Date de naissance', tierceDateFormatee, 'Non spécifié'),
        this.safeLine('Heure de naissance', tierceHeureNaissance, 'Non spécifié'),
        this.safeLine('Lieu de naissance', lieuTierce, 'Non spécifié'),
        '',
      );
      return sections.join('\n');
    }

    // Sinon, comportement standard (utilisateur + tierce)
    const birthData = this.extractBirthData(formData);
    this.validateBirthData(birthData);
    const { prenoms, nom, dateNaissance, heureNaissance, villeNaissance, paysNaissance, gender } = birthData;
    const dateFormatee = this.formatDate(dateNaissance);
    const genderFr = this.normalizeGenderFr(gender);

    // Tierce data extraction and formatting
    const tiercePrenoms = tierce?.prenoms || '';
    const tierceNom = tierce?.nom || '';
    const tierceDateNaissance = tierce?.dateNaissance || '';
    const tierceHeureNaissance = tierce?.heureNaissance || '';
    const tierceVilleNaissance = tierce?.villeNaissance || '';
    const tiercePaysNaissance = tierce?.paysNaissance || tierce?.country || '';
    const tierceGender = this.normalizeGenderFr(tierce?.gender);
    const tierceDateFormatee = this.formatDate(tierceDateNaissance);
    const lieuUser = [villeNaissance, paysNaissance].filter(Boolean).join(", ").trim() || "Non spécifié";
    const lieuTierce = [tierceVilleNaissance, tiercePaysNaissance].filter(Boolean).join(", ").trim() || "Non spécifié";

    const sections: string[] = [];

    // Utilisateur principal
    sections.push(
      '## 👤 INFORMATIONS PERSONNELLES',
      this.safeLine('Prénoms à utiliser', prenoms),
      this.safeLine('Nom de famille', nom),
      this.safeLine('Genre', genderFr),
      '',
      '## 🎂 DONNÉES DE NAISSANCE EXACTES',
      this.safeLine('Date de naissance', dateFormatee, 'Non spécifié'),
      this.safeLine('Heure de naissance', heureNaissance, 'Non spécifié'),
      this.safeLine('Lieu de naissance', lieuUser, 'Non spécifié'),
      '',
      '## 🌌 CARTE DU CIEL UTILISATEUR',
      user.aspectsTexte || 'Non disponible',
      '',
      '---',
      '',
      '## 👤 INFORMATIONS PERSONNELLES — PERSONNE TIERCe',
      this.safeLine('Prénoms de la personne tierce à utiliser', tiercePrenoms),
      this.safeLine('Nom de famille de la personne tierce', tierceNom),
      this.safeLine('Genre de la personne tierce', tierceGender),
      '',
      '## 🎂 DONNÉES DE NAISSANCE EXACTES — PERSONNE TIERCe',
      this.safeLine('Date de naissance de la personne tierce', tierceDateFormatee, 'Non spécifié'),
      this.safeLine('Heure de naissance de la personne tierce', tierceHeureNaissance, 'Non spécifié'),
      this.safeLine('Lieu de naissance de la personne tierce', lieuTierce, 'Non spécifié'),
      '',
    );
    

      const messections = sections.join('\n');
      console.log('MES SECTIONS:', messections);
    return messections;
  }
  safeLine(label: string, value: unknown, fallback = ""): string {
    const v = typeof value === "string" ? value.trim() : value == null ? "" : String(value);
    return `• **${label}** : ${v || fallback}`;
  }

  normalizeGenderFr(g: any): string {
    if (!g) return "Non spécifié";
    const v = String(g).trim().toLowerCase();

    if (v === "male" || v === "masculin" || v === "m" || v === "homme") return "Homme";
    if (v === "female" || v === "feminin" || v === "féminin" || v === "f" || v === "femme") return "Femme";

    // fallback: on garde tel quel (mais propre)
    return String(g).trim() || "Non spécifié";
  }

  buildUserPrompttierce(formData: unknown, user: UserDocument, tierce: any): string {
    const birthData = this.extractBirthData(formData);
    this.validateBirthData(birthData);

    const {
      prenoms,
      nom,
      dateNaissance,
      heureNaissance,
      villeNaissance,
      paysNaissance,
      gender,
    } = birthData;

    const dateFormatee = this.formatDate(dateNaissance);
    const genderFr = this.normalizeGenderFr(gender);
    const genderTierceFr = this.normalizeGenderFr(tierce?.gender);
    const final = "\nCarte du ciel brute utilisateur : \n" + user?.aspectsTexteBrute + "\ncarte du ciel brute personne tierce : \n" + tierce?.carteDuCielTexte;

    // Pour éviter les "undefined, undefined"
    const lieuUser = [villeNaissance, paysNaissance].filter(Boolean).join(", ").trim() || "Non spécifié";
    const lieuTierce = [tierce?.villeNaissance, tierce?.paysNaissance].filter(Boolean).join(", ").trim() || "Non spécifié";

    const sections: string[] = [
      "## 👤 INFORMATIONS PERSONNELLES",
      this.safeLine("Prénoms à utiliser", prenoms),
      this.safeLine("Nom de famille", nom),
      this.safeLine("Genre", genderFr),
      "",
      "## 🎂 DONNÉES DE NAISSANCE EXACTES",
      this.safeLine("Date de naissance", dateFormatee, "Non spécifié"),
      this.safeLine("Heure de naissance", heureNaissance, "Non spécifié"),
      this.safeLine("Lieu de naissance", lieuUser, "Non spécifié"),
      // "",
      // "---",
      // "",
      // "## 🌌 CARTE DU CIEL CONJOINTE",
      // final,
      // "",
      // "---",
      // "",
      // "## 👤 INFORMATIONS PERSONNELLES — PERSONNE TIERCe",
      // this.safeLine("Prénoms de la personne tierce à utiliser", tierce?.prenoms),
      // this.safeLine("Nom de famille de la personne tierce", tierce?.nom),
      // this.safeLine("Genre de la personne tierce", genderTierceFr),
      // "",
      // "## 🎂 DONNÉES DE NAISSANCE EXACTES — PERSONNE TIERCe",
      // this.safeLine("Lieu de naissance de la personne tierce", lieuTierce, "Non spécifié"),
      // this.safeLine("Date de naissance de la personne tierce", tierce?.dateNaissance, "Non spécifié"),
      // this.safeLine("Heure de naissance de la personne tierce", tierce?.heureNaissance, "Non spécifié"),
    ];

    return sections.join("\n");
  }


  private buildUserPromptuser(formData: any, user: UserDocument): string {
    const birthData = this.extractBirthData(formData);
    this.validateBirthData(birthData);

    const { prenoms, nom, dateNaissance, heureNaissance, villeNaissance, paysNaissance, gender } = birthData;
    const dateFormatee = this.formatDate(dateNaissance);

    const sections: string[] = [];
    sections.push(
      '## 👤 INFORMATIONS PERSONNELLES',
      `• **Prénoms à utiliser** : ${prenoms || ''}`,
      `• **Nom de famille** : ${nom || ''}`,
      `• **Genre** : ${gender || 'Non spécifié'}\n`,
    );

    sections.push(
      '## 🎂 DONNÉES DE NAISSANCE EXACTES',
      `• **Date de naissance** : ${dateFormatee}`,
      `• **Heure de naissance** : ${heureNaissance || 'Non spécifié'}`,
      `• **Pays de naissance** : ${paysNaissance || 'Non spécifié'}`,
      `• **Lieu de naissance** : ${villeNaissance}, ${paysNaissance}\n`
    );

    sections.push(
      '## CARTE DU CIEL\n',
      user.aspectsTexte,
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
      let userPrompt = null;

      if (consultation.tierce) {
        console.log('Génération avec tierce personne');
        const tierceBirthData: BirthData = {
              nom: consultation.tierce.nom || '',
              prenoms: consultation.tierce.prenoms || '',
              dateNaissance: consultation.tierce.dateNaissance || '',
              heureNaissance: consultation.tierce.heureNaissance || '',
              villeNaissance: consultation.tierce.villeNaissance || '',
              paysNaissance: consultation.tierce.paysNaissance || consultation.tierce.country || '',
              country: consultation.tierce.country || consultation.tierce.paysNaissance || '',
              gender: consultation.tierce.gender || '',
            };
         userPrompt = this.buildUserPrompttiercenouveau(formData, user,tierceBirthData,consultation);
        // Générer la carte du ciel de la personne tierce
        // let carteDuCielTierce = '';
        // if (consultation.tierce) {
        //   try {
        //     // S'assure que tous les champs requis sont présents pour BirthData
            
        //     const skyChart = await this.deepseekService.generateSkyChartTierce(tierceBirthData);
        //     carteDuCielTierce = skyChart?.aspectsTexte || 'Carte du ciel de la personne tierce non disponible';
        //   } catch (e) {
        //     carteDuCielTierce = 'Carte du ciel de la personne tierce non disponible';
        //   }
        // }
       
        // userPrompt = this.buildUserPrompttierce(formData, user, {
        //   ...consultation.tierce,
        //   carteDuCielTexte: carteDuCielTierce,
        // });
      } else {
        userPrompt = this.buildUserPrompt(formData, user);
      }
      console.log('USER PROMPT NOUVEAU:', userPrompt);
      const analyseComplete = await this.callDeepSeekAPI(systemPrompt, userPrompt, id);
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

      return {
        success: true,
        consultationId: id,
        statut: ConsultationStatus.COMPLETED,
        message: 'Analyse générée avec succès',
        consultation: updatedConsultation,
      };
      // return null;
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

  async generateAnalysisuser(id: string, user: UserDocument) {
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

      const userPrompt = this.buildUserPromptuser(formData, user);
      console.log('USER PROMPT:', userPrompt);

      console.log('SYSTEM PROMPT:', systemPrompt);

      const analyseComplete = await this.callDeepSeekAPI(systemPrompt, userPrompt, id);
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

      return {
        success: true,
        consultationId: id,
        statut: ConsultationStatus.COMPLETED,
        message: 'Analyse générée avec succès',
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