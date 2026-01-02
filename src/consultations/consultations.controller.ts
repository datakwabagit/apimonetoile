 
  
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ConsultationStatus } from '../common/enums/consultation-status.enum';
import { Permission } from '../common/enums/permission.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';
import { UserDocument } from '../users/schemas/user.schema';
import { ConsultationsService } from './consultations.service';
import { BirthData, DeepseekService } from './deepseek.service';
import { SaveAnalysisDto } from './dto/save-analysis.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { getZodiacSign, getZodiacElement, getZodiacSymbol } from '../common/utils/zodiac.utils';

@ApiTags('Consultations')
@Controller('consultations')
@UseGuards(JwtAuthGuard)
export class ConsultationsController {
  constructor(
    private readonly consultationsService: ConsultationsService,
    private readonly deepseekService: DeepseekService,
    private readonly notificationsService: NotificationsService,
  ) {}
  /**
   * POST /consultations/:id/notify-user
   * Envoyer une notification à l'utilisateur de la consultation
   */
  @Post(':id/notify-user')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.UPDATE_OWN_CONSULTATION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Notifier l'utilisateur de la consultation",
    description: "Envoie une notification à l'utilisateur lié à la consultation.",
  })
  @ApiResponse({ status: 200, description: 'Notification envoyée avec succès.' })
  @ApiResponse({ status: 404, description: 'Consultation non trouvée.' })
  async notifyUser(@Param('id') id: string) {
    // Récupérer la consultation pour obtenir le client
    const consultation: any = await this.consultationsService.findOne(id);
    if (!consultation || !consultation.clientId) {
      throw new HttpException('Consultation ou utilisateur non trouvé', HttpStatus.NOT_FOUND);
    }
    // Correction : extraire l'_id si clientId est un objet
    const userId = consultation.clientId._id ? consultation.clientId._id.toString() : consultation.clientId.toString();
    await this.notificationsService.create({
      userId,
      type: NotificationType.CONSULTATION_RESULT,
      title: 'Notification de consultation',
      message: `Vous avez reçu une notification pour la consultation "${consultation.title || id}"`,
      metadata: { consultationId: id },
    });
    // Mettre à jour le champ analysisNotified à true
    await this.consultationsService.update(id, { analysisNotified: true });
    return {
      success: true,
      message: "Notification envoyée à l'utilisateur.",
    };
  }

  /**
   * POST /consultations
   * Créer une consultation pour un utilisateur authentifié
   * L'ID du client est automatiquement récupéré depuis le token JWT
   */
  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CREATE_CONSULTATION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer une consultation (utilisateur connecté)',
    description:
      "Crée une consultation en associant automatiquement l'utilisateur connecté comme client.",
  })
  @ApiResponse({ status: 201, description: 'Consultation créée avec succès.' })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  async create(@Body() body: any, @CurrentUser() user: UserDocument) {
console.log('DEBUG create consultation body:', body);
    // Utiliser la méthode create() qui enregistre correctement le clientId
    const consultation = await this.consultationsService.create(user._id.toString(), body);

       return {
      success: true,
      message: 'Consultation créée avec succès',
      ...consultation,
    };
  }

  /**
   * POST /consultations/personal
   * Créer une consultation personnelle
   */
  @Post('personal')
  async createPersonalConsultation(@Body() body: any) {
    // body contiendra tous les champs du formulaire
    // Exemples de champs attendus :
    // nom, prenoms, genre, dateNaissance, paysNaissance, villeNaissance, heureNaissance, choixConsultation
    return this.consultationsService.createPersonalConsultation(body);
  }

  /**
   * GET /consultations
   * Récupérer toutes les consultations (PUBLIC)
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: 'Lister les consultations',
    description: 'Retourne toutes les consultations (accessible publiquement).',
  })
  @ApiResponse({ status: 200, description: 'Liste des consultations.' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: ConsultationStatus,
    @Query('type') type?: string,
    @Query('userId') userId?: string,
  ) {
    const result = await this.consultationsService.findAll({
      page,
      limit,
      status,
      type,
      clientId: userId,
    });

    return {
      success: true,
      consultations: result.consultations.map((c: any) => {
        const cObj = c.toObject ? c.toObject() : c;
        return {
          id: c._id.toString(),
          consultationId: c._id.toString(),
          titre: c.title,
          prenoms: c.formData?.firstName || '',
          nom: c.formData?.lastName || '',
          dateNaissance: c.formData?.dateOfBirth || '',
          dateGeneration: cObj.createdAt || new Date(),
          statut: c.status,
        };
      }),
      total: result.total,
    };
  }

  /**
   * GET /consultations/my
   * Récupérer ses propres consultations
   */
  @Get('my')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_OWN_CONSULTATION)
  findMyConsultations(
    @CurrentUser() user: UserDocument,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.consultationsService.findByClient(user._id.toString(), { page, limit });
  }

  /**
   * GET /consultations/user/:userId
   * Récupérer les consultations d'un utilisateur spécifique (Admin only)
   */
  @Get('user/:userId')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_ANY_CONSULTATION)
  @ApiOperation({
    summary: "Récupérer les consultations d'un utilisateur",
    description:
      "Retourne toutes les consultations d'un utilisateur spécifique (réservé aux admins).",
  })
  @ApiResponse({ status: 200, description: "Liste des consultations de l'utilisateur." })
  @ApiResponse({ status: 403, description: 'Accès refusé.' })
  async getUserConsultations(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.consultationsService.findByClient(userId, { page, limit });

    return {
      success: true,
      userId,
      consultations: result.consultations,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * GET /consultations/analysis/:consultationId
   * Récupérer l'analyse d'une consultation spécifique (PUBLIC)
   */
  @Get('analysis/:consultationId')
  @Public()
  @ApiOperation({
    summary: "Récupérer l'analyse d'une consultation",
    description: "Retourne uniquement l'analyse astrologique d'une consultation donnée.",
  })
  @ApiResponse({ status: 200, description: 'Analyse trouvée.' })
  @ApiResponse({ status: 404, description: 'Analyse non trouvée.' })
  async getAnalysisByConsultationId(@Param('consultationId') consultationId: string) {
    try {
      // Récupérer la consultation pour le champ analysisNotified
      const consultation: any = await this.consultationsService.findOne(consultationId);
      const analysis = await this.consultationsService.getAstrologicalAnalysis(consultationId);

      if (!analysis) {
        throw new HttpException(
          {
            success: false,
            message: 'Aucune analyse trouvée pour cette consultation',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        consultationId,
        analyse: analysis.toObject(),
        analysisNotified: consultation?.analysisNotified ?? false,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          error: "Erreur lors de la récupération de l'analyse",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /consultations/my-analyses
   * Récupérer toutes les analyses astrologiques de l'utilisateur connecté
   */
  @Get('my-analyses')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_OWN_CONSULTATION)
  @ApiOperation({
    summary: 'Récupérer mes analyses',
    description: "Retourne toutes les analyses astrologiques de l'utilisateur connecté.",
  })
  @ApiResponse({ status: 200, description: 'Liste des analyses.' })
  async getMyAnalyses(
    @CurrentUser() user: UserDocument,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.consultationsService.getUserAnalyses(user._id.toString(), {
      page,
      limit,
    });

    return {
      success: true,
      analyses: result.analyses,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * GET /consultations/assigned
   * Récupérer les consultations attribuées au consultant connecté
   */
  @Get('assigned')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_ANY_CONSULTATION)
  findAssignedConsultations(
    @CurrentUser() user: UserDocument,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.consultationsService.findByConsultant(user._id.toString(), { page, limit });
  }

  /**
   * GET /consultations/statistics
   * Récupérer les statistiques des consultations (admin only)
   */
  @Get('statistics')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.VIEW_STATISTICS)
  getStatistics() {
    return this.consultationsService.getStatistics();
  }

  /**
   * GET /consultations/:id
   * Récupérer une consultation par ID (PUBLIC)
   */
  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Récupérer une consultation',
    description: 'Récupère une consultation complète avec son analyse (accessible publiquement).',
  })
  @ApiResponse({ status: 200, description: 'Consultation trouvée.' })
  @ApiResponse({ status: 404, description: 'Consultation non trouvée.' })
  async findOne(@Param('id') id: string) {
    const consultation: any = await this.consultationsService.findOne(id);
    const consultationObj = consultation.toObject();

    // Essayer de récupérer l'analyse depuis la collection AstrologicalAnalysis
    let analyse = consultation.resultData;
    try {
      const astroAnalysis = await this.consultationsService.getAstrologicalAnalysis(id);
      if (astroAnalysis) {
        analyse = astroAnalysis.toObject();
      }
    } catch (error) {
      console.log(
        "[API] Pas d'analyse trouvée dans AstrologicalAnalysis, utilisation de resultData",
      );
    }

    // Populate alternatives with offering details
    let alternatives = consultation.alternatives || consultationObj.alternatives || [];
    if (alternatives.length) {
      alternatives = await this.consultationsService.populateAlternatives(alternatives);
    }

    return {
      success: true,
      consultation: {
        id: consultation._id.toString(),
        consultationId: consultation._id.toString(),
        titre: consultation.title,
        prenoms: consultation.formData?.firstName || '',
        nom: consultation.formData?.lastName || '',
        dateNaissance: consultation.formData?.dateOfBirth || '',
        dateGeneration: consultationObj.createdAt || new Date(),
        statut: consultation.status,
        analyse,
        alternatives,
        ...consultationObj,
      },
    };
  }

  /**
   * POST /consultations/:id/save-analysis
   * Sauvegarder l'analyse générée (PUBLIC)
   */
  @Post(':id/save-analysis')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Sauvegarder l'analyse",
    description: "Sauvegarde l'analyse astrologique générée en base de données.",
  })
  @ApiResponse({ status: 200, description: 'Analyse sauvegardée avec succès.' })
  @ApiResponse({ status: 404, description: 'Consultation non trouvée.' })
  async saveAnalysis(@Param('id') id: string, @Body() saveAnalysisDto: SaveAnalysisDto) {
    await this.consultationsService.saveAnalysis(id, saveAnalysisDto);
    return {
      success: true,
      message: 'Analyse sauvegardée avec succès',
      consultationId: id,
    };
  }

  /**
   * POST /consultations/:id/generate-analysis
   * Générer l'analyse astrologique complète via DeepSeek (Authentifié)
   */
  @Post(':id/generate-analysis')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_OWN_CONSULTATION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Générer l'analyse astrologique",
    description: 'Génère une analyse astrologique complète via DeepSeek AI.',
  })
  @ApiResponse({ status: 200, description: 'Analyse générée avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  @ApiResponse({ status: 404, description: 'Consultation non trouvée.' })
  async generateAnalysis(
    @Param('id') id: string,
    @Body() body: { birthData: BirthData },
    @CurrentUser() user: UserDocument,
  ) {
    try {
      const { birthData } = body || {};
console.log('DEBUG received birthData:', birthData);
      // Récupérer la consultation pour fallback des données de naissance
      const consultation: any = await this.consultationsService.findOne(id);
      console.log('DEBUG consultation formData:', consultation);
      const form = consultation?.formData || {};

      const mergedBirthData: BirthData = {
        nom: birthData?.nom ?? form.nom ?? form.lastName ?? '',
        prenoms: birthData?.prenoms ?? form.prenoms ?? form.firstName ?? '',
        dateNaissance: birthData?.dateNaissance ?? form.dateNaissance ?? form.dateOfBirth ?? '',
        heureNaissance: birthData?.heureNaissance ?? form.heureNaissance ?? '',
        villeNaissance: birthData?.villeNaissance ?? form.villeNaissance ?? form.cityOfBirth ?? '',
        paysNaissance: birthData?.paysNaissance ?? form.paysNaissance ?? form.countryOfBirth ?? '',
        email: birthData?.email ?? form.email ?? '',
      } as BirthData;

      // Log temporaire pour debug : afficher les données de naissance fusionnées
      console.log('DEBUG mergedBirthData:', mergedBirthData);

      // Validation des données
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
        const birthDateStr = form.dateNaissance || form.dateOfBirth || birthData?.dateNaissance || birthData?.dateOfBirth || '';
        const birthDateObj = birthDateStr ? new Date(birthDateStr) : null;
        const zodiacSign = birthDateObj ? getZodiacSign(birthDateObj) : (form.zodiacSign || birthData?.zodiacSign || '');
        const element = getZodiacElement(zodiacSign);
        const symbol = getZodiacSymbol(zodiacSign);
        const horoscopePayload = {
          zodiacSign,
          horoscopeType: form.horoscopeType || birthData?.horoscopeType || '',
          birthDate: birthDateStr,
          partnerSign: form.partnerSign || birthData?.partnerSign || '',
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
          switch(req.horoscopeType) {
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
        const birthDateStr = form.dateNaissance || form.dateOfBirth || birthData?.dateNaissance || birthData?.dateOfBirth || '';
        const configService = (this as any).configService;
        const DEEPSEEK_API_KEY = configService?.get?.('DEEPSEEK_API_KEY') || process.env.DEEPSEEK_API_KEY || '';
        const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
        
        const SYSTEM_PROMPT = `Tu es un expert en numérologie avec plus de 25 ans d'expérience. Tu fournis des analyses numériques précises, détaillées et bienveillantes intégrant la sagesse africaine ancestrale. Tes interprétations sont basées sur la numérologie moderne et ancienne.`;
        
        const generateNumerologyPrompt = (): string => {
          return `Analyse numérique complète pour:
NOM: ${mergedBirthData.nom}
PRÉNOMS: ${mergedBirthData.prenoms}
DATE DE NAISSANCE: ${birthDateStr}

Type d'analyse demandé: ${consultation.type === 'NOMBRES_PERSONNELS' ? 'Nombres personnels' : consultation.type === 'CYCLES_PERSONNELS' ? 'Cycles personnels' : 'Numérologie générale'}

Fournis une analyse complète en JSON valide avec cette structure:

{
  "nombreDuDestinee": {
    "valeur": <nombre>,
    "signification": "<interprétation détaillée>"
  },
  "nombreExpression": {
    "valeur": <nombre>,
    "signification": "<interprétation détaillée>"
  },
  "nombrePersonnalite": {
    "valeur": <nombre>,
    "signification": "<interprétation détaillée>"
  },
  "nombreCheminDeVie": {
    "valeur": <nombre>,
    "signification": "<interprétation détaillée>"
  },
  "cyclesPersonnels": [
    {
      "age": "<intervalle>",
      "numero": <nombre>,
      "signification": "<description>"
    }
  ],
  "anNumerique": {
    "valeur": <nombre>,
    "signification": "<prédictions pour l'année numérique courante>"
  },
  "moisPersonnels": [
    {
      "mois": "<nom mois>",
      "numero": <nombre>,
      "signification": "<conseil mensuel>"
    }
  ],
  "conseils": "<3-4 conseils pratiques basés sur la numérologie>",
  "sagessAfricaine": "<Un proverbe ou sagesse africaine pertinente avec sa source>"
}

EXIGENCES:
- Calculs numériques précis
- Interprétations profondes et personnalisées
- Intègre la sagesse africaine authentique
- Ton empathique et encourageant
- Conseils pratiques et actionnables`;
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
                max_tokens: 3000,
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
        // Enregistrer dans resultData
        await this.consultationsService.update(id, { resultData: analyseComplete });
      } else {
        // Analyse astrologique classique
        const analyse = await this.deepseekService.genererAnalyseComplete(mergedBirthData, id);
        analyseComplete = {
          consultationId: id,
          ...analyse,
          dateGeneration: new Date().toISOString(),
        };
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

  /**
   * GET /consultations/:id/generate-analysis
   * Récupérer l'analyse générée d'une consultation (PUBLIC)
   */
  @Get(':id/generate-analysis')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Récupérer l'analyse générée",
    description: "Retourne l'analyse astrologique si elle a été générée et sauvegardée.",
  })
  @ApiResponse({ status: 200, description: 'Analyse trouvée.' })
  @ApiResponse({ status: 404, description: 'Analyse non trouvée ou pas encore générée.' })
  async getGeneratedAnalysis(@Param('id') id: string) {
    try {
      const consultation: any = await this.consultationsService.findOne(id);

      if (!consultation) {
        throw new HttpException('Consultation non trouvée', HttpStatus.NOT_FOUND);
      }

      // Vérifier si l'analyse existe dans resultData
      if (consultation.resultData && consultation.resultData.analyse) {
        
        return {
          success: true,
          consultationId: id,
          statut: ConsultationStatus.COMPLETED,
          analyse: consultation.resultData.analyse,
        };
      }

      // Pas d'analyse encore générée
      throw new HttpException(
        {
          success: false,
          message: 'Analyse pas encore générée',
          statut: 'pending',
        },
        HttpStatus.NOT_FOUND,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('[API] Erreur récupération analyse:', error);
      throw new HttpException(
        {
          success: false,
          error: 'Erreur lors de la récupération des analyses',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * PATCH /consultations/:id
   * Mettre à jour une consultation
   */
  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.UPDATE_OWN_CONSULTATION)
  update(@Param('id') id: string, @Body() updateConsultationDto: UpdateConsultationDto) {
    return this.consultationsService.update(id, updateConsultationDto);
  }

  /**
   * PATCH /consultations/:id/assign/:consultantId
   * Attribuer une consultation à un consultant (admin only)
   */
  @Patch(':id/assign/:consultantId')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.ASSIGN_CONSULTATION)
  assignToConsultant(@Param('id') id: string, @Param('consultantId') consultantId: string) {
    return this.consultationsService.assignToConsultant(id, consultantId);
  }

  /**
   * DELETE /consultations/:id
   * Supprimer une consultation
   */
  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.DELETE_OWN_CONSULTATION)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    await this.consultationsService.remove(id, user._id.toString(), user.role);
  }
}
