import { HttpException, HttpStatus, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import fetch from 'node-fetch';
import { ConsultationStatus } from '../common/enums/consultation-status.enum';
import { getZodiacElement, getZodiacSign, getZodiacSymbol } from '../common/utils/zodiac.utils';
import { ConsultationsService } from './consultations.service';
import { BirthData, DeepseekService } from './deepseek.service';
import { PromptService } from './prompt.service';
import { AstrologicalAnalysis, AstrologicalAnalysisDocument } from './schemas/astrological-analysis.schema';
import { UserConsultationChoiceService } from './user-consultation-choice.service';

@Injectable()
export class AnalysisService {
  private readonly DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

  constructor(
    @InjectModel(AstrologicalAnalysis.name)
    private analysisModel: Model<AstrologicalAnalysisDocument>,
    private consultationsService: ConsultationsService,
    private deepseekService: DeepseekService,
    private userConsultationChoiceService: UserConsultationChoiceService,
    @Inject(forwardRef(() => PromptService))
    private promptService: PromptService,
  ) { }

  async getAstrologicalAnalysis(consultationId: string) {
    const analysis = await this.analysisModel.findOne({ consultationId }).exec();
    if (!analysis) {
      throw new NotFoundException('Analyse non trouvée');
    }
    return analysis;
  }

  private async loadPromptFromDatabase(choiceId: string): Promise<string> {
    try {
      const prompt = await this.promptService.findByChoiceId(choiceId);

      if (!prompt) {
        console.log('[ANALYSE] Aucun prompt personnalisé trouvé, utilisation du prompt par défaut');
        return null;
      }

      let customPrompt = '';

      // Titre et description
      if (prompt.title) customPrompt += `${prompt.title}\n\n`;
      if (prompt.description) customPrompt += `${prompt.description}\n\n`;

      // Rôle et objectif
      if (prompt.role) customPrompt += `Rôle : ${prompt.role}\n`;
      if (prompt.objective) customPrompt += `Objectif : ${prompt.objective}\n`;

      // Style et ton
      if (prompt.styleAndTone?.length > 0) {
        customPrompt += `Style et Ton :\n`;
        prompt.styleAndTone.forEach(style => {
          customPrompt += `- ${style}\n`;
        });
      }

      // Structure
      if (prompt.structure) {
        customPrompt += `\nSTRUCTURE DE L'ANALYSE À RESPECTER\n`;

        if (prompt.structure.introduction) {
          customPrompt += `Introduction : ${prompt.structure.introduction}\n`;
        }

        if (prompt.structure.sections?.length > 0) {
          prompt.structure.sections.forEach((section: any, idx: number) => {
            if (section.title) customPrompt += `${idx + 1}. ${section.title}\n`;
            if (section.content) customPrompt += `  • ${section.content}\n`;

            if (section.guidelines?.length > 0) {
              section.guidelines.forEach((guide: string) => {
                customPrompt += `    - ${guide}\n`;
              });
            }
          });
        }

        if (prompt.structure.synthesis) {
          customPrompt += `\nSynthèse : ${prompt.structure.synthesis}\n`;
        }

        if (prompt.structure.conclusion) {
          customPrompt += `\nConclusion : ${prompt.structure.conclusion}\n`;
        }
      }

      return customPrompt.trim();

    } catch (error) {
      console.error('[ANALYSE] Erreur lors du chargement du prompt:', error?.message || error);
      return null;
    }
  }

  private getDefaultPrompt(): string {
    return `RÉVÉLATION DES TALENTS INNÉS\n\nRôle : Agis comme un astrologue professionnel spécialisé dans l'astrologie du potentiel et du développement personnel. Ton expertise consiste à décoder les "cadeaux de naissance" inscrits dans le thème natal, souvent invisibles pour la personne elle-même.\n\nObjectif : À partir de la carte du ciel de [PRÉNOM], réalise une analyse inspirante, claire et bienveillante de ses capacités naturelles. L'objectif est de réveiller ses potentiels enfouis, de mettre en lumière ses forces instinctives et d'éclairer son chemin vers un épanouissement total (personnel et professionnel).\n\nStyle et Ton :\n- Utilise impérativement le tutoiement.\n- Adopte un ton chaleureux, encourageant et révélateur.\n- Interpelle la personne par son prénom pour renforcer l'aspect personnalisé de la consultation.\n- Utilise une approche pédagogique : explique comment une position planétaire se traduit concrètement en un talent exploitable au quotidien.\n\nSTRUCTURE DE L'ANALYSE À RESPECTER\n1. Le Soleil – Ton "Génie" Central\n  • Signe et Maison : Explique ton talent pour briller. Quelle est cette force vitale unique qui te permet de prendre ta place naturellement ?\n  • Aspects au Soleil : Quelles planètes viennent colorer ou amplifier ta capacité à diriger, créer ou rayonner ?\n2. La Maison 2 – Ton Coffre-Fort Personnel\n  • Signe sur la Cuspide et Planètes présentes : Analyse ton rapport à tes propres ressources. Quels sont les outils que tu possèdes déjà pour générer de la valeur (matérielle ou morale) ?\n  • Identifie si tes talents sont plutôt d'ordre pratique, intellectuel, artistique ou relationnel.\n3. Mercure – Ton Intelligence et ta Dextérité\n  • Signe et Maison : Quel est ton talent de communication et de réflexion ? Es-tu un stratège, un médiateur, un artisan du verbe ou un analyste hors pair ?\n  • Explique comment ta manière d'apprendre et de transmettre est un atout majeur pour ton entourage.\n4. La Maison 6 – Tes Compétences Opérationnelles\n  • Analyse de la Maison 6 : Quels sont les talents que tu exprimes dans l'action quotidienne et le service ? Comment ton organisation ou ton sens du détail te rend indispensable ?\n5. Uranus – Ton Originalité et ton Innovation\n  • Position d'Uranus (Maison et Aspects) : Quel est ton "talent rebelle" ou visionnaire ? Ce domaine où tu es capable d'apporter des solutions nouvelles et de faire preuve d'un génie hors du commun.\n6. Les Astéroïdes de Sagesse (si activés)\n  • Pallas (Stratégie), Vesta (Focus), Cérès (Soin) : Si l'un de ces astéroïdes est dominant, explique quelle capacité spécifique (intelligence créative, dévouement extrême ou talent nourricier) en découle.\n\nEXPLOITER TES FORCES AU QUOTIDIEN\n- Le Talent "Sommeil" : Identifie un potentiel que [PRÉNOM] possède mais qu'il/elle n'ose peut-être pas utiliser pleinement par manque de confiance.\n- Synergie Professionnelle : Comment combiner ces talents pour une carrière ou une mission de vie fluide ?\n- Conseils d'Activation : Propose 3 exercices ou réflexes simples pour "muscler" ces talents dès maintenant.\n\nCONCLUSION ATTENDUE\n- Dresse le "Portrait d'Excellence" de [PRÉNOM] en trois mots-clés puissants (ex : Le Diplomate Intuitif, L'Architecte de l'Invisible, Le Communicateur Inspiré...).\n- Explique comment l'acceptation de ces forces permet de cesser de lutter contre sa nature et d'ouvrir les portes d'une réussite authentique.`;
  }

  private extractBirthData(form: any): BirthData {
    return {
      nom: form.nom ?? form.lastName ?? '',
      prenoms: form.prenoms ?? form.firstName ?? '',
      dateNaissance: form.dateNaissance ?? form.dateOfBirth ?? '',
      heureNaissance: form.heureNaissance ?? form.timeOfBirth ?? '',
      villeNaissance: form.villeNaissance ?? form.cityOfBirth ?? '',
      paysNaissance: form.paysNaissance?.trim() ||
        form.countryOfBirth?.trim() ||
        form.country?.trim() || '',
      email: form.email ?? '',
    } as BirthData;
  }

  private validateBirthData(birthData: BirthData): void {
    const requiredFields = ['nom', 'prenoms', 'dateNaissance', 'heureNaissance', 'villeNaissance', 'paysNaissance'];
    const missingFields = requiredFields.filter(field => !birthData[field]?.trim());

    if (missingFields.length > 0) {
      throw new HttpException(
        `Données de naissance incomplètes. Champs manquants: ${missingFields.join(', ')}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  private generateHoroscopePrompt(horoscopePayload: any): string {
    const date = new Date(horoscopePayload.birthDate);
    let periodContext = '';

    switch (horoscopePayload.horoscopeType) {
      case 'Quotidien':
        periodContext = `pour aujourd'hui ${date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
        break;
      case 'Mensuel':
        periodContext = `pour le mois de ${date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
        break;
      case 'Annuel':
        periodContext = `pour l'année ${date.getFullYear()}`;
        break;
      case 'Amoureux':
        periodContext = horoscopePayload.partnerSign
          ? `concernant la compatibilité amoureuse avec le signe ${horoscopePayload.partnerSign}`
          : `concernant les prévisions sentimentales`;
        break;
    }

    return `Génère un horoscope ${horoscopePayload.horoscopeType?.toLowerCase?.()} ${periodContext} pour le signe ${horoscopePayload.zodiacSign} (élément ${horoscopePayload.element}).\n\n${horoscopePayload.partnerSign ? `Analyse la compatibilité avec ${horoscopePayload.partnerSign}.` : ''}\n\nSTRUCTURE ATTENDUE (réponds UNIQUEMENT en JSON valide) :\n\n{\n  "generalForecast": "Prévision générale détaillée intégrant l'énergie cosmique actuelle et la sagesse africaine (3-4 phrases)",\n  "love": "Prévisions amoureuses ${horoscopePayload.partnerSign ? `en analysant la synergie avec ${horoscopePayload.partnerSign}` : ''} (2-3 phrases)",\n  "work": "Prévisions professionnelles et conseils carrière (2-3 phrases)",\n  "health": "Conseils santé et bien-être énergétique (2-3 phrases)",\n  "spiritualAdvice": "Un proverbe ou sagesse africaine authentique pertinent avec sa source (ex: Proverbe Bambara, Yoruba, Swahili, Akan, etc.)",\n  "luckyColor": "Couleur porte-bonheur spécifique (ex: Rouge rubis et or)",\n  "dominantPlanet": "Planète dominante avec son influence (ex: Mars (énergie et action))"\n}\n\nEXIGENCES :\n- Intègre des références authentiques à la sagesse africaine (proverbes Bambara, Yoruba, Swahili, Akan, Peul, Wolof, Zoulou, etc.)\n- Sois précis sur les énergies planétaires actuelles\n- Adopte un ton empathique et inspirant\n- Fournis des conseils pratiques et actionnables\n- ${horoscopePayload.partnerSign ? 'Analyse en profondeur la dynamique relationnelle entre les deux signes' : ''}`;
  }

  private generateNumerologyPrompt(consultationType: string, birthData: BirthData): string {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const currentDay = currentDate.getDate();

    let analysisType = 'Numérologie complète';
    switch (consultationType) {
      case 'NOMBRES_PERSONNELS':
        analysisType = 'Nombres personnels détaillés';
        break;
      case 'CYCLES_PERSONNELS':
        analysisType = 'Cycles personnels et timing';
        break;
    }

    return `ANALYSE NUMÉROLOGIQUE COMPLÈTE
DONNÉES DE NAISSANCE:
NOM COMPLET: ${birthData.nom} ${birthData.prenoms}
DATE DE NAISSANCE: ${birthData.dateNaissance}
DATE ACTUELLE: ${currentDay}/${currentMonth}/${currentYear}
Type d'analyse: ${analysisType}`;
  }

  private async callDeepSeekAPI(systemPrompt: string, userPrompt: string): Promise<any> {
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
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.8,
          max_tokens: 4500,
        }),
      });

      if (!response.ok) {
        throw new Error(`API DeepSeek: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return aiResponse;

    } catch (error) {
      console.error('Erreur appel DeepSeek API:', error);
      throw error;
    }
  }

  private async saveAnalysisResults(
    consultationId: string,
    analysisData: any,
    analysisType: string
  ): Promise<void> {
    const resultDataKey = analysisType === 'HOROSCOPE' ? 'horoscope' : 'analyse';
    await this.consultationsService.update(consultationId, {
      resultData: { [resultDataKey]: analysisData }
    });
  }

  private async recordUserChoices(consultation: any, userId: string): Promise<void> {
    if (!consultation.choice?._id) return;

    const choice = consultation.choice;
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
    if (consultationType === 'HOROSCOPE') {
      return 'Horoscope généré avec succès';
    }

    if (['NUMEROLOGIE', 'CYCLES_PERSONNELS', 'NOMBRES_PERSONNELS'].includes(consultationType)) {
      return `Analyse numérologique (${consultationType}) générée avec succès`;
    }

    return 'Analyse générée avec succès';
  }

  async generateAnalysis(id: string, user: any) {
    try {
      const consultation = await this.consultationsService.findOne(id);
      let systemPrompt = this.getDefaultPrompt();
      if (consultation.choice && consultation.choice._id) {
        const customPrompt = await this.loadPromptFromDatabase(consultation.choice._id.toString());
        if (customPrompt) {
          systemPrompt = customPrompt;
        }
      }

      console.log('SYSTEM_PROMPT utilisé pour la génération:', systemPrompt);

      const form = consultation?.formData || {};
      const birthData = this.extractBirthData(form);
      this.validateBirthData(birthData);
      let analyseComplete: any;
      const isNumerology = ['NUMEROLOGIE', 'CYCLES_PERSONNELS', 'NOMBRES_PERSONNELS'].includes(consultation.type);

      if (consultation.type === 'HOROSCOPE') {
        const birthDateStr = birthData.dateNaissance;
        const birthDateObj = birthDateStr ? new Date(birthDateStr) : null;
        const zodiacSign = birthDateObj ? getZodiacSign(birthDateObj) : (form.zodiacSign || '');
        const element = getZodiacElement(zodiacSign);
        const symbol = getZodiacSymbol(zodiacSign);

        const horoscopePayload = {
          zodiacSign,
          horoscopeType: form.horoscopeType || '',
          birthDate: birthDateStr,
          partnerSign: form.partnerSign || '',
          element,
          symbol,
        };

        const userPrompt = this.generateHoroscopePrompt(horoscopePayload);
        analyseComplete = await this.callDeepSeekAPI(systemPrompt, userPrompt);
        await this.saveAnalysisResults(id, analyseComplete, 'HOROSCOPE');

      } else if (isNumerology) {
        const userPrompt = this.generateNumerologyPrompt(consultation.type, birthData);
        analyseComplete = await this.callDeepSeekAPI(systemPrompt, userPrompt);
        await this.saveAnalysisResults(id, analyseComplete, 'NUMEROLOGIE');

      } else {
        analyseComplete = await this.deepseekService.genererAnalyseComplete(birthData, id, systemPrompt);
        const analysisDocument = {
          consultationId: id,
          ...analyseComplete,
          dateGeneration: new Date().toISOString(),
        };

        await this.saveAnalysisResults(id, analysisDocument, 'ASTROLOGIE');

        try {
          const userId = user._id.toString();
          await this.consultationsService.saveAstrologicalAnalysis(
            userId,
            id,
            analysisDocument,
          );
        } catch (saveError) {
          console.error('[API] ❌ Erreur sauvegarde analyse:', {
            message: saveError.message,
            stack: saveError.stack,
          });
        }
      }

      await this.consultationsService.update(id, {
        status: ConsultationStatus.COMPLETED
      });

      if (consultation.clientId) {
        let userId: string | undefined;
        if (
          typeof consultation.clientId === 'object' &&
          consultation.clientId !== null &&
          'toHexString' in consultation.clientId &&
          typeof consultation.clientId.toHexString === 'function'
        ) {
          // Mongoose ObjectId natif
          userId = consultation.clientId.toHexString();
        } else if (
          typeof consultation.clientId === 'object' &&
          consultation.clientId !== null &&
          '_id' in consultation.clientId &&
          consultation.clientId._id
        ) {
          userId = consultation.clientId._id.toString();
        } else if (typeof consultation.clientId === 'string') {
          userId = consultation.clientId;
        } else if (typeof consultation.clientId?.toString === 'function') {
          userId = consultation.clientId.toString();
        }
        if (userId) {
          await this.recordUserChoices(consultation, userId);
        } else {
          console.error('[ANALYSE] Impossible de déterminer un userId valide pour recordUserChoices', { clientId: consultation.clientId });
        }
      }

      return {
        success: true,
        consultationId: id,
        statut: ConsultationStatus.COMPLETED,
        statuts: ConsultationStatus.COMPLETED,
        message: this.getSuccessMessage(consultation.type),
        analyse: analyseComplete,
      };
    } catch (error) {
      console.error('[API] Erreur génération analyse:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      throw new HttpException(
        {
          success: false,
          error: `Erreur lors de la génération: ${errorMessage}`,
          statut: 'error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}