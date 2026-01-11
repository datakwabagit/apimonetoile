import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AstrologicalAnalysis, AstrologicalAnalysisDocument } from './schemas/astrological-analysis.schema';
import { ConsultationsService } from './consultations.service';
import { UserConsultationChoiceService } from './user-consultation-choice.service';
import { DeepseekService, BirthData } from './deepseek.service';
import { getZodiacSign, getZodiacElement, getZodiacSymbol } from '../common/utils/zodiac.utils';
import { ConsultationStatus } from '../common/enums/consultation-status.enum';
import fetch from 'node-fetch';

@Injectable()
export class AnalysisService {
  constructor(
    @InjectModel(AstrologicalAnalysis.name)
    private analysisModel: Model<AstrologicalAnalysisDocument>,
    private consultationsService: ConsultationsService,
    private deepseekService: DeepseekService,
    private userConsultationChoiceService: UserConsultationChoiceService,
  ) {}

  async getAstrologicalAnalysis(consultationId: string) {
    const analysis = await this.analysisModel.findOne({ consultationId }).exec();
    if (!analysis) {
      throw new NotFoundException('Analyse non trouvée');
    }
    return analysis;
  }

  async generateAnalysis(id: string, user: any) {
     try {
      // Récupérer la consultation et utiliser formData uniquement
      const consultation: any = await this.consultationsService.findOne(id);
       const form = consultation?.formData || {};

      const mergedBirthData: BirthData = {
        nom: form.nom ?? form.lastName ?? '',
        prenoms: form.prenoms ?? form.firstName ?? '',
        dateNaissance: form.dateNaissance ?? form.dateOfBirth ?? '',
        heureNaissance: form.heureNaissance ?? form.timeOfBirth ?? '',
        villeNaissance: form.villeNaissance ?? form.cityOfBirth ?? '',
        paysNaissance:
          form.paysNaissance && form.paysNaissance.trim() !== ''
            ? form.paysNaissance
            : form.countryOfBirth && form.countryOfBirth.trim() !== ''
              ? form.countryOfBirth
              : form.country && form.country.trim() !== ''
                ? form.country
                : '',
        email: form.email ?? '',
      } as BirthData;

  
      if (
        !mergedBirthData.nom ||
        !mergedBirthData.prenoms ||
        !mergedBirthData.dateNaissance ||
        !mergedBirthData.heureNaissance ||
        !mergedBirthData.villeNaissance ||
        !mergedBirthData.paysNaissance
      ) {
        throw new HttpException('Données de naissance incomplètes', HttpStatus.BAD_REQUEST);
      }

      let analyseComplete: any;
      let horoscopeResult: any = null;
      const isNumerology = ['NUMEROLOGIE', 'CYCLES_PERSONNELS', 'NOMBRES_PERSONNELS'].includes(consultation.type);

      if (consultation.type === 'HOROSCOPE') {
        // Détermination automatique du signe, élément et symbole
        const birthDateStr = form.dateNaissance || form.dateOfBirth || '';
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
        // Appel HTTP local ou refactoriser la logique dans un service injectable
        const configService = (this as any).configService;
        const DEEPSEEK_API_KEY = configService?.get?.('DEEPSEEK_API_KEY') || process.env.DEEPSEEK_API_KEY || '';
        const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
        const SYSTEM_PROMPT = `Tu es un astrologue professionnel expert spécialisé dans l'astrologie africaine et moderne. Tu génères des horoscopes précis, profonds et inspirants qui intègrent la sagesse ancestrale africaine. Tes prédictions sont empathiques, pratiques et riches en insights spirituels.`;
        const generateHoroscopePrompt = (req: any): string => {
          const date = new Date(req.birthDate);
          let periodContext = '';
          switch (req.horoscopeType) {
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
              periodContext = req.partnerSign
                ? `concernant la compatibilité amoureuse avec le signe ${req.partnerSign}`
                : `concernant les prévisions sentimentales`;
              break;
          }
          return `Génère un horoscope ${req.horoscopeType?.toLowerCase?.()} ${periodContext} pour le signe ${req.zodiacSign} (élément ${req.element}).\n\n${req.partnerSign ? `Analyse la compatibilité avec ${req.partnerSign}.` : ''}\n\nSTRUCTURE ATTENDUE (réponds UNIQUEMENT en JSON valide) :\n\n{\n  "generalForecast": "Prévision générale détaillée intégrant l'énergie cosmique actuelle et la sagesse africaine (3-4 phrases)",\n  "love": "Prévisions amoureuses ${req.partnerSign ? `en analysant la synergie avec ${req.partnerSign}` : ''} (2-3 phrases)",\n  "work": "Prévisions professionnelles et conseils carrière (2-3 phrases)",\n  "health": "Conseils santé et bien-être énergétique (2-3 phrases)",\n  "spiritualAdvice": "Un proverbe ou sagesse africaine authentique pertinent avec sa source (ex: Proverbe Bambara, Yoruba, Swahili, Akan, etc.)",\n  "luckyColor": "Couleur porte-bonheur spécifique (ex: Rouge rubis et or)",\n  "dominantPlanet": "Planète dominante avec son influence (ex: Mars (énergie et action))"\n}\n\nEXIGENCES :\n- Intègre des références authentiques à la sagesse africaine (proverbes Bambara, Yoruba, Swahili, Akan, Peul, Wolof, Zoulou, etc.)\n- Sois précis sur les énergies planétaires actuelles\n- Adopte un ton empathique et inspirant\n- Fournis des conseils pratiques et actionnables\n- ${req.partnerSign ? 'Analyse en profondeur la dynamique relationnelle entre les deux signes' : ''}`;
        };
        if (DEEPSEEK_API_KEY) {
          const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: generateHoroscopePrompt(horoscopePayload) }
          ];
          try {
            const response = await fetch(DEEPSEEK_API_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
              },
              body: JSON.stringify({
                model: 'deepseek-chat',
                messages,
                temperature: 0.8,
                max_tokens: 2000,
              }),
            });
            if (response.ok) {
              const data = await response.json();
              const aiResponse = data.choices[0].message.content;
              const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                horoscopeResult = JSON.parse(jsonMatch[0]);
              }
            }
          } catch (e) {
            console.error('Erreur génération horoscope:', e);
          }
        }
        // Enregistrer dans resultData.horoscope
        await this.consultationsService.update(id, { resultData: { horoscope: horoscopeResult } });
        analyseComplete = horoscopeResult;
      } else if (isNumerology) {
        // Numérologie (NUMEROLOGIE, CYCLES_PERSONNELS, NOMBRES_PERSONNELS)
        const birthDateStr = form.dateNaissance || form.dateOfBirth || '';
        const configService = (this as any).configService;
        const DEEPSEEK_API_KEY = configService?.get?.('DEEPSEEK_API_KEY') || process.env.DEEPSEEK_API_KEY || '';
        const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

        const SYSTEM_PROMPT = `Tu es un expert en numérologie avec plus de 25 ans d'expérience. Tu fournis des analyses numériques précises, détaillées et bienveillantes intégrant la sagesse africaine ancestrale. Tes interprétations sont basées sur la numérologie pythagoricienne et kabbalistique. Tu maîtrises parfaitement les cycles personnels et le timing numérique.`;

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const currentDay = new Date().getDate();

        const generateNumerologyPrompt = (): string => {
          return `ANALYSE NUMÉROLOGIQUE COMPLÈTE

DONNÉES DE NAISSANCE:
NOM COMPLET: ${mergedBirthData.nom} ${mergedBirthData.prenoms}
DATE DE NAISSANCE: ${birthDateStr}
DATE ACTUELLE: ${currentDay}/${currentMonth}/${currentYear}

Type d'analyse: ${consultation.type === 'NOMBRES_PERSONNELS' ? 'Nombres personnels détaillés' : consultation.type === 'CYCLES_PERSONNELS' ? 'Cycles personnels et timing' : 'Numérologie complète'}

═══════════════════════════════════════════════════════════════════════
📐 MÉTHODES DE CALCUL OBLIGATOIRES
═══════════════════════════════════════════════════════════════════════

1️⃣ CHEMIN DE VIE (Mission de vie)
Méthode : Jour de naissance + Mois de naissance + Année de naissance (réduits séparément)
Exemple : 7 janvier 1974
  • Jour: 7 → 7
  • Mois: 1 → 1  
  • Année: 1+9+7+4 = 21 → 2+1 = 3
  • Total: 7+1+3 = 11 (maître-nombre, on ne réduit pas)
⚠️ Respecte les maîtres-nombres 11, 22, 33 dans le résultat FINAL uniquement

2️⃣ NOMBRE D'EXPRESSION (Talents et mode d'expression)
Méthode : Valeur de TOUTES les lettres du nom complet
Correspondance alphabétique :
  A J S = 1  |  B K T = 2  |  C L U = 3
  D M V = 4  |  E N W = 5  |  F O X = 6
  G P Y = 7  |  H Q Z = 8  |  I R = 9

Exemple : KOUASSI JEAN
  • KOUASSI: K(2)+O(6)+U(3)+A(1)+S(1)+S(1)+I(9) = 23 → 5
  • JEAN: J(1)+E(5)+A(1)+N(5) = 12 → 3
  • Total: 5+3 = 8
⚠️ Si résultat final est 11, 22 ou 33, ne pas réduire

3️⃣ NOMBRE DE L'ÂME (Désirs profonds et motivations intérieures)
Méthode : Valeur des VOYELLES uniquement (A E I O U Y)
Exemple : KOUASSI JEAN → voyelles : O U A I E A
  • O(6)+U(3)+A(1)+I(9)+E(5)+A(1) = 25 → 2+5 = 7
⚠️ Si résultat final est 11, 22 ou 33, ne pas réduire

4️⃣ NOMBRE DE PERSONNALITÉ (Image projetée)
Méthode : Valeur des CONSONNES uniquement
⚠️ Si résultat final est 11, 22 ou 33, ne pas réduire

5️⃣ ANNÉE PERSONNELLE (Tendance de l'année)
Méthode : Jour naissance + Mois naissance + Année courante
Exemple : Né le 7 janvier, année 2025
  • 7 + 1 + (2+0+2+5=9) = 17 → 1+7 = 8
⚠️ Toujours réduire entre 1 et 9 (PAS de maîtres-nombres pour les cycles)

6️⃣ MOIS PERSONNEL (Ambiance du mois)
Méthode : Année Personnelle + Numéro du mois courant
Exemple : Année Perso 8 + Mars (3) = 11 → 2
⚠️ Toujours réduire entre 1 et 9

7️⃣ JOUR PERSONNEL (Énergie de la journée)
Méthode : Mois Personnel + Jour du mois
Exemple : Mois Perso 2 + jour 15 = 2+1+5 = 8
⚠️ Toujours réduire entre 1 et 9

8️⃣ ANNÉE UNIVERSELLE (Énergie collective mondiale)
Méthode : Réduction de l'année civile
Exemple : 2025 = 2+0+2+5 = 9

═══════════════════════════════════════════════════════════════════════

STRUCTURE JSON ATTENDUE:

{
  "themeDeNaissance": {
    "description": "Ta carte numérologique fixe - ta partition de vie",
    "cheminDeVie": {
      "valeur": <nombre ou maître-nombre 11/22/33>,
      "calcul": "<détail du calcul effectué>",
      "signification": "Mission de vie, défis et talents fondamentaux (le plus important)",
      "interpretation": "<analyse détaillée 3-4 phrases>"
    },
    "nombreExpression": {
      "valeur": <nombre ou maître-nombre>,
      "calcul": "<détail du calcul avec toutes les lettres>",
      "signification": "Talents naturels et manière de s'exprimer dans le monde",
      "interpretation": "<analyse détaillée>"
    },
    "nombreAme": {
      "valeur": <nombre ou maître-nombre>,
      "calcul": "<détail du calcul avec les voyelles uniquement>",
      "signification": "Désirs profonds et motivations intérieures secrètes",
      "interpretation": "<analyse détaillée>"
    },
    "nombrePersonnalite": {
      "valeur": <nombre ou maître-nombre>,
      "calcul": "<détail du calcul avec les consonnes uniquement>",
      "signification": "Image projetée et première impression donnée aux autres",
      "interpretation": "<analyse détaillée>"
    }
  },
  
  "cyclesEnMouvement": {
    "description": "Les énergies du moment - la mélodie jouée maintenant",
    "anneeUniverselle": {
      "valeur": <nombre entre 1-9 pour ${currentYear}>,
      "calcul": "<détail du calcul>",
      "signification": "Énergie collective mondiale pour ${currentYear}",
      "interpretation": "<contexte global>"
    },
    "anneePersonnelle": {
      "valeur": <nombre entre 1-9>,
      "calcul": "<détail du calcul: jour + mois + année courante>",
      "signification": "Thème principal de l'année (janvier à décembre)",
      "interpretation": "<analyse détaillée des opportunités et défis 3-4 phrases>",
      "conseil": "<actions à privilégier ou éviter cette année>"
    },
    "moisPersonnel": {
      "valeur": <nombre entre 1-9>,
      "mois": "${new Date().toLocaleDateString('fr-FR', { month: 'long' })}",
      "calcul": "<Année Perso + mois courant>",
      "signification": "Ambiance et couleur du mois actuel",
      "interpretation": "<analyse du mois en cours 2-3 phrases>"
    },
    "jourPersonnel": {
      "valeur": <nombre entre 1-9>,
      "date": "${currentDay}/${currentMonth}/${currentYear}",
      "calcul": "<Mois Perso + jour du mois>",
      "signification": "Tonalité énergétique d'aujourd'hui",
      "interpretation": "<conseil pour la journée>"
    }
  },
  
  "syntheseEtTiming": {
    "accord": "<Comment ton Chemin de Vie s'accorde avec ton Année Personnelle actuelle (complémentarité ou friction)>",
    "opportunites": "<Quelles portes sont ouvertes maintenant grâce aux cycles en cours>",
    "defisActuels": "<Quels défis ou frictions peuvent survenir avec les énergies du moment>",
    "conseilsPratiques": [
      "<Action 1 alignée avec le timing actuel>",
      "<Action 2 à privilégier>",
      "<Action 3 à éviter ou reporter>"
    ],
    "prochainsJoursFavorables": [
      {
        "date": "<date dans les 7 prochains jours>",
        "jourPersonnel": <nombre>,
        "pourquoi": "<idéal pour quoi (signature, rendez-vous, lancement, déclaration, etc.)>"
      }
    ]
  },
  
  "cyclesDeVieGrands": [
    {
      "periode": "<Cycle de vie actuel ou prochain>",
      "ages": "<tranche d'âge>",
      "nombre": <nombre>,
      "theme": "<thème principal de ce grand cycle de vie>"
    }
  ],
  
  "sagessAfricaine": {
    "proverbe": "<Proverbe africain pertinent pour la situation numérologique actuelle>",
    "source": "<Origine: Bambara, Yoruba, Swahili, Akan, Peul, Wolof, etc.>",
    "lien": "<Pourquoi ce proverbe résonne avec les nombres actuels>"
  }
}

PRINCIPES ESSENTIELS À RESPECTER:

✅ RÈGLES DES MAÎTRES-NOMBRES:
• Pour le THÈME DE NAISSANCE (Chemin de Vie, Expression, Âme, Personnalité):
  Respecter les maîtres-nombres 11, 22, 33 dans le résultat FINAL uniquement
• Pour les CYCLES (Année/Mois/Jour Personnel):
  TOUJOURS réduire entre 1 et 9 (PAS de maîtres-nombres pour les cycles)

✅ SIGNIFICATIONS DES ANNÉES PERSONNELLES:
• Année 1 = nouveaux départs, initiative, indépendance, lancement de projets
• Année 2 = coopération, patience, relations, diplomatie
• Année 3 = créativité, expression, communication, socialisation
• Année 4 = structure, travail laborieux, discipline, fondations solides
• Année 5 = liberté, changement, aventure, adaptabilité
• Année 6 = responsabilité, famille, service, harmonie relationnelle
• Année 7 = introspection, étude, spiritualité, période d'isolement bénéfique
• Année 8 = pouvoir, réussite matérielle, autorité, récolte
• Année 9 = fin de cycle, lâcher-prise, conclusions, préparation au renouveau

✅ PHILOSOPHIE:
• Le libre arbitre est roi: tu décris le "temps qu'il fait", pas le destin
• La numérologie est un outil de conscience, pas de prédiction d'événements
• Sois pragmatique, empathique et encourageant
• Intègre la sagesse africaine authentiquement (pas de clichés)

✅ COMPARAISONS UTILES:
• Chemin de Vie = ce que vous êtes venu vivre
• Nombre d'Expression = comment vous agissez et vous montrez
• Nombre de l'Âme = ce que vous désirez profondément
• Nombre de Personnalité = l'image que vous projetez`;
        };

        if (DEEPSEEK_API_KEY) {
          try {
            const messages = [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: generateNumerologyPrompt() }
            ];
            const response = await fetch(DEEPSEEK_API_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
              },
              body: JSON.stringify({
                model: 'deepseek-chat',
                messages,
                temperature: 0.8,
                max_tokens: 4500,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              const aiResponse = data.choices[0].message.content;
              const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                analyseComplete = JSON.parse(jsonMatch[0]);
              }
            }
          } catch (e) {
            console.error('Erreur génération numérologie:', e);
          }
        }
        // Enregistrer dans resultData.analyse pour cohérence
        await this.consultationsService.update(id, { resultData: { analyse: analyseComplete } });
      } else {
        // Analyse astrologique classique
        const analyse = await this.deepseekService.genererAnalyseComplete(mergedBirthData, id);
        analyseComplete = {
          consultationId: id,
          ...analyse,
          dateGeneration: new Date().toISOString(),
        };
        // Enregistrer dans resultData.analyse pour cohérence
        await this.consultationsService.update(id, { resultData: { analyse: analyseComplete } });
        // Sauvegarder l'analyse dans la collection AstrologicalAnalysis
        try {
          const userId = user._id.toString();
          await this.consultationsService.saveAstrologicalAnalysis(
            userId,
            id,
            analyseComplete,
          );
        } catch (saveError) {
          console.error('[API] ❌ Erreur sauvegarde analyse:', {
            message: saveError.message,
            stack: saveError.stack,
          });
        }
      }

      // Mettre à jour le statut de la consultation à COMPLETED
      await this.consultationsService.update(id, { status: ConsultationStatus.COMPLETED });

      let messageSuccess = 'Analyse générée avec succès';
      if (consultation.type === 'HOROSCOPE') {
        messageSuccess = 'Horoscope généré avec succès';
      } else if (isNumerology) {
        messageSuccess = `Analyse numérologique (${consultation.type}) générée avec succès`;
      }
 
      // Appeler recordChoicesForConsultation après la génération de l'analyse
      if (consultation.choice?._id) {
        const choice = consultation.choice;
        // Extract userId as string from clientId object
        const userId = typeof consultation.clientId === 'object' && consultation.clientId._id
          ? consultation.clientId._id.toString()
          : consultation.clientId?.toString?.() || '';
        await this.userConsultationChoiceService.recordChoicesForConsultation(
          userId,
          consultation._id?.toString?.() || '',
          [{
            title: choice.title,
            choiceId: choice._id,
            frequence: choice.frequence || 'LIBRE',
            participants: choice.participants || 'SOLO',
          }]
        );
      }
      return {
        success: true,
        consultationId: id,
        statut: ConsultationStatus.COMPLETED,
        message: messageSuccess,
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
