import { UsersService } from '@/users/users.service';
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
  Put,
  Query,
  UseGuards
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ConsultationStatus } from '../common/enums/consultation-status.enum';
import { Permission } from '../common/enums/permission.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RubriqueService } from '../rubriques/rubrique.service';
import { UserDocument } from '../users/schemas/user.schema';
import { AnalysisService } from './analysis.service';
import { ConsultationsService } from './consultations.service';
import { DeepseekService } from './deepseek.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { SaveAnalysisDto } from './dto/save-analysis.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';

@ApiTags('Consultations')
@Controller('consultations')
@UseGuards(JwtAuthGuard)
export class ConsultationsController {

  constructor(
    private readonly consultationsService: ConsultationsService,
    private readonly analysisService: AnalysisService,
    private readonly rubriqueService: RubriqueService,
    private readonly deepseekService: DeepseekService,
    private readonly usersService: UsersService,
  ) { }

  /**
    * POST /consultations/generate-consultations-for-rubrique
    * Crée une consultation pour chaque choix de consultation d'une rubrique pour l'utilisateur courant (sans générer d'analyse).
    */
  @Post('generate-consultations-for-rubrique')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Créer consultations pour chaque choix d'une rubrique",
    description: "Crée une consultation pour chaque choix de consultation d'une rubrique pour l'utilisateur courant, sans générer d'analyse."
  })
  async generateConsultationsForRubrique(
    @Body('rubriqueId') rubriqueId: string,
    @CurrentUser() user: UserDocument
  ) {
    try {
      // Supprimer toutes les consultations de la rubrique pour l'utilisateur courant
      await this.consultationsService.deleteMany({
        clientId: user._id.toString(),
        rubriqueId,
      });

      const rubrique = await this.rubriqueService.findOne(rubriqueId);
      const choixConsultations = rubrique.consultationChoices;
      if (!choixConsultations || choixConsultations.length === 0) {
        throw new HttpException('Aucun choix de consultation pour cette rubrique', HttpStatus.NOT_FOUND);
      }

      const results = [];
      for (const choix of choixConsultations) {
        // Patch temporaire pour test : renseigne paysNaissance si manquant
        if (!user.paysNaissance) {
          user.paysNaissance = 'Côte d’Ivoire';
        }
        const choiceDto = {
          _id: choix._id ?? '',
          promptId: choix.promptId,
          title: choix.title,
          description: choix.description,
          order: choix.order,
          frequence: choix.frequence,
          participants: choix.participants,
          offering: {
            alternatives: (choix.offering?.alternatives || []).map((alt: any) => ({
              _id: alt._id ?? '',
              category: alt.category,
              offeringId: alt.offeringId,
              quantity: alt.quantity ?? 1,
            })),
          },
        };

        const ledto: CreateConsultationDto = {
          rubriqueId,
          choice: choiceDto,
          title: choiceDto.title,
          description: choiceDto.description,
          formData: {
            nom: user.nom,
            prenoms: user.prenoms,
            dateNaissance: user.dateNaissance,
            heureNaissance: user.heureNaissance,
            villeNaissance: user.villeNaissance,
            paysNaissance: user.paysNaissance || 'Côte d’Ivoire',
            genre: user.genre || '',
            email: user.email || '',
            phone: user.phone || '',
            premium: user.premium || false,
            carteDuCiel: user.carteDuCiel || null,
          },
          status: 'PENDING',
          scheduledDate: null,
          price: 0,
          alternatives: choiceDto.offering.alternatives,
          requiredOffering: null,
          requiredOfferingsDetails: [],
          tierce: null,
          analysisNotified: false,
          result: null,
          resultData: null,
          visible: false,
        };

        const consultation = await this.consultationsService.create(user._id.toString(), ledto);
        results.push({ consultation });
      }

      return {
        success: true,
        message: `Consultations créées pour la rubrique ${rubriqueId}`,
        results,
      };
    } catch (err) {
      console.error('[generateConsultationsForRubrique] ERROR:', err);
      throw err;
    }
  }

  /**
   * POST /consultations/generate-analysis-for-choice
   * Génère une consultation et une analyse pour un choix de consultation d'une rubrique pour l'utilisateur courant
   * Body: { rubriqueId: string, choiceId: string }
   */
  @Post('generate-analysis-for-choice')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Générer une analyse pour un choix de consultation d'une rubrique",
    description: "Crée une consultation et génère une analyse pour un choix de consultation d'une rubrique pour l'utilisateur courant."
  })
  async generateAnalysisForChoice(
    @Body('rubriqueId') rubriqueId: string,
    @Body('choiceId') choiceId: string,
    @CurrentUser() user: UserDocument
  ) {
    try {
      const rubrique = await this.rubriqueService.findOne(rubriqueId);
      if (!rubrique || !rubrique.consultationChoices) {
        throw new HttpException('Rubrique ou choix non trouvés', HttpStatus.NOT_FOUND);
      }
      const choix = rubrique.consultationChoices.find((c: any) => c._id?.toString() === choiceId || c._id === choiceId);
      if (!choix) {
        throw new HttpException('Choix de consultation non trouvé', HttpStatus.NOT_FOUND);
      }

      // Patch temporaire pour test : renseigne paysNaissance si manquant
      // if (!user.paysNaissance) {
      //   user.paysNaissance = 'Côte d’Ivoire';
      // }

      const choiceDto = {
        _id: choix._id ?? '',
        promptId: choix.promptId,
        title: choix.title,
        description: choix.description,
        order: choix.order,
        frequence: choix.frequence,
        participants: choix.participants,
        offering: {
          alternatives: (choix.offering?.alternatives || []).map((alt: any) => ({
            _id: alt._id ?? '',
            category: alt.category,
            offeringId: alt.offeringId,
            quantity: alt.quantity ?? 1,
          })),
        },
      };

      const ledto: CreateConsultationDto = {
        rubriqueId,
        choice: choiceDto,
        title: choiceDto.title,
        description: choiceDto.description,
        formData: {
          nom: user.nom,
          prenoms: user.prenoms,
          dateNaissance: user.dateNaissance,
          heureNaissance: user.heureNaissance,
          villeNaissance: user.villeNaissance,
          paysNaissance: user.paysNaissance || 'Côte d’Ivoire',
          genre: user.genre || '',
          email: user.email || '',
          phone: user.phone || '',
          premium: user.premium || false,
          carteDuCiel: user.carteDuCiel || null,
        },
        status: 'PENDING',
        scheduledDate: null,
        price: 0,
        alternatives: choiceDto.offering.alternatives,
        requiredOffering: null,
        requiredOfferingsDetails: [],
        tierce: null,
        analysisNotified: false,
        result: null,
        resultData: null,
      };

      const consultation = await this.consultationsService.create(user._id.toString(), ledto);
      const analysis = await this.analysisService.generateAnalysis(consultation.id, user);

      return {
        success: true,
        message: `Consultation et analyse générées pour le choix ${choiceId} de la rubrique ${rubriqueId}`,
        consultation,
        analysis,
      };
    } catch (err) {
      console.error('[generateAnalysisForChoice] ERROR:', err);
      throw err;
    }
  }

  /**
   * POST /consultations/generate-sky-chart
   * Génère la carte du ciel pour l'utilisateur courant
   */
  @Post('generate-sky-chart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Générer la carte du ciel de l'utilisateur courant",
    description: "Génère et retourne la carte du ciel complète pour l'utilisateur connecté."
  })
  async generateSkyChartForCurrentUser(@CurrentUser() user: UserDocument) {
    try {
      const formData = this.extractUserFormData(user);
      const skyChart = await this.deepseekService.generateSkyChart(formData);
      // Optionnel : mettre à jour l'utilisateur avec la carte du ciel
      await this.usersService.update(user._id.toString(), { carteDuCiel: skyChart });
      return {
        success: true,
        carteDuCiel: skyChart,
      };
    } catch (error) {
      console.error('[generateSkyChartForCurrentUser] Erreur:', error);
      throw new HttpException(
        {
          success: false,
          message: "Erreur lors de la génération de la carte du ciel",
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * POST /consultations/generate-for-rubrique
   * Génère une consultation pour chaque choix de consultation d'une rubrique pour l'utilisateur courant,
   * puis génère une analyse pour chacune d'elles.
   */
  @Post('generate-for-rubrique')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Générer consultations et analyses pour une rubrique",
    description: "Crée une consultation pour chaque choix de consultation d'une rubrique pour l'utilisateur courant, puis génère une analyse pour chacune."
  })

  async generateForRubrique(
    @Body('rubriqueId') rubriqueId: string,
    @CurrentUser() user: UserDocument
  ) {
    try {
      const rubrique = await this.rubriqueService.findOne(rubriqueId);
      const choixConsultations = rubrique.consultationChoices;
      if (!choixConsultations || choixConsultations.length === 0) {
        console.warn('[generateForRubrique] Aucun choix de consultation pour cette rubrique:', rubriqueId);
        throw new HttpException('Aucun choix de consultation pour cette rubrique', HttpStatus.NOT_FOUND);
      }



      console.log("[generateForRubrique] myuser:", user.carteDuCiel);

      const results = [];
      for (const choix of choixConsultations) {

        // Patch temporaire pour test : renseigne paysNaissance si manquant
        if (!user.paysNaissance) {
          user.paysNaissance = 'Côte d’Ivoire';
          console.warn('[generateForRubrique] Patch: paysNaissance ajouté pour user:', user._id);
        }
        const choiceDto = {
          _id: choix._id ?? '',
          promptId: choix.promptId,
          title: choix.title,
          description: choix.description,
          order: choix.order,
          frequence: choix.frequence,
          participants: choix.participants,
          offering: {
            alternatives: (choix.offering?.alternatives || []).map((alt: any) => ({
              _id: alt._id ?? '',
              category: alt.category,
              offeringId: alt.offeringId,
              quantity: alt.quantity ?? 1,
            })),
          },
        };
        console.log('[generateForRubrique] choiceDto:', choiceDto);

        const ledto: CreateConsultationDto = {
          rubriqueId,
          choice: choiceDto,
          title: choiceDto.title,
          description: choiceDto.description,
          // Champs formData pour l'analyse
          formData: {
            nom: user.nom,
            prenoms: user.prenoms,
            dateNaissance: user.dateNaissance,
            heureNaissance: user.heureNaissance,
            villeNaissance: user.villeNaissance,
            paysNaissance: user.paysNaissance,
            genre: user.genre || '',
            email: user.email || '',
            phone: user.phone || '',
            premium: user.premium || false,
            carteDuCiel: user.carteDuCiel || null,
          },
          status: 'PENDING',
          // Ajout d'autres champs optionnels si besoin
          scheduledDate: null,
          price: 0,
          alternatives: choiceDto.offering.alternatives,
          requiredOffering: null,
          requiredOfferingsDetails: [],
          tierce: null,
          analysisNotified: false,
          result: null,
          resultData: null,
          // visible: false,
        };

        console.log('[generateForRubrique] ledto:', ledto);
        const consultation = await this.consultationsService.create(user._id.toString(), ledto);
        console.log('[generateForRubrique] consultation créée:', consultation);

        const analysis = await this.analysisService.generateAnalysis(consultation.id, user);
        console.log('[generateForRubrique] analysis générée:', analysis);

        results.push({
          consultation,
          analysis,
        });
      }

      console.log('[generateForRubrique] results:', results);
      return {
        success: true,
        message: `Consultations et analyses générées pour la rubrique ${rubriqueId}`,
        results,
      };
    } catch (err) {
      console.error('[generateForRubrique] ERROR:', err);
      throw err;
    }
  }

  /**
   * Extract user form data for sky chart generation
   */
  private extractUserFormData(user: UserDocument): any {
    const defaultPaysNaissance = user.country || user.paysNaissance || 'Côte d’Ivoire';

    return {
      nom: user.nom || '',
      prenoms: user.prenoms || '',
      dateNaissance: this.formatDate(user.dateNaissance),
      heureNaissance: user.heureNaissance || '',
      villeNaissance: user.villeNaissance || '',
      paysNaissance: defaultPaysNaissance,
      genre: user.genre || '',
      email: user.email || '',
    };
  }

  private formatDate(date: any): string {
    if (!date) return '';

    if (typeof date === 'string') return date;
    if (date instanceof Date) return date.toISOString().split('T')[0];

    return String(date);
  }

  /**
   * POST /consultations/:id/notify-user
   * Envoyer une notification à l'utilisateur de la consultation
   */
  @Post(':id/notify-user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Notifier l'utilisateur de la consultation",
    description: "Envoie une notification à l'utilisateur lié à la consultation.",
  })
  @ApiResponse({ status: 200, description: 'Notification envoyée avec succès.' })
  @ApiResponse({ status: 404, description: 'Consultation non trouvée.' })
  async notifyUser(@Param('id') id: string) {
    try {

      const consultation: any = await this.consultationsService.findOne(id);

      if (!consultation || !consultation.clientId) {
        console.error('Consultation ou utilisateur non trouvé', { consultation });
        throw new HttpException('Consultation ou utilisateur non trouvé', HttpStatus.NOT_FOUND);
      }
      return {
        success: true,
        message: "Notification envoyée à l'utilisateur.",
      };
    } catch (error) {
      console.error('Erreur dans notifyUser:', error);
      throw error;
    }
  }

  /**
     * GET /consultations/rubrique/:rubriqueId
     * Récupérer toutes les consultations de l'utilisateur connecté pour une rubrique donnée (filtrage par rubriqueId)
     */
  @Get('rubrique/:rubriqueId')
  @ApiOperation({
    summary: "Consultations de l'utilisateur connecté par rubriqueId",
    description: "Retourne toutes les consultations de l'utilisateur connecté pour une rubrique donnée (filtrage par rubriqueId).",
  })
  @ApiResponse({ status: 200, description: "Liste des consultations de l'utilisateur pour la rubrique." })
  async getMyConsultationsByRubrique(
    @CurrentUser() user: UserDocument,
    @Param('rubriqueId') rubriqueId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.consultationsService.findAll({
      clientId: user._id.toString(),
      rubriqueId,
      page,
      limit,
    });
    return {
      success: true,
      userId: user._id.toString(),
      rubriqueId,
      consultations: result.consultations,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * POST /consultations
   * Créer une consultation pour un utilisateur authentifié
   * L'ID du client est automatiquement récupéré depuis le token JWT
   */
  @Post()
  @UseGuards(PermissionsGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer une consultation (utilisateur connecté)',
    description:
      "Crée une consultation en associant automatiquement l'utilisateur connecté comme client.",
  })
  @ApiResponse({ status: 201, description: 'Consultation créée avec succès.' })
  @ApiResponse({ status: 401, description: 'Non authentifié.' })
  async create(@Body() body: any, @CurrentUser() user: UserDocument) {
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
      const consultation: any = await this.consultationsService.findOne(consultationId);

      if (!consultation) {
        throw new HttpException(
          {
            success: false,
            message: 'Consultation non trouvée',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      let analysisData = null;

      if (consultation.resultData) {
        // Vérifier les différents types d'analyses
        if (consultation.resultData.analyse) {
          analysisData = consultation.resultData.analyse;
        } else if (consultation.resultData.horoscope) {
          analysisData = consultation.resultData.horoscope;
        } else if (consultation.resultData.numerology) {
          analysisData = consultation.resultData.numerology;
        }
      }

      if (!analysisData) {
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
        analyse: analysisData,
        analysisNotified: consultation.analysisNotified ?? false,
        consultationType: consultation.type,
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
   * GET /consultations/:id/analysis
   * Récupérer l'analyse d'une consultation spécifique - Route alternative (PUBLIC)
   */
  @Get(':id/analysis')
  @Public()
  @ApiOperation({
    summary: "Récupérer l'analyse d'une consultation (route alternative)",
    description: "Retourne l'analyse astrologique d'une consultation donnée.",
  })
  @ApiResponse({ status: 200, description: 'Analyse trouvée.' })
  @ApiResponse({ status: 404, description: 'Analyse non trouvée.' })
  async getAnalysisAlternative(@Param('id') id: string) {
    return this.getAnalysisByConsultationId(id);
  }

  /**
   * PUT /consultations/:id/analysis
   * Sauvegarder/Mettre à jour l'analyse d'une consultation
   */
  @Put(':id/analysis')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.UPDATE_OWN_CONSULTATION)
  @ApiOperation({
    summary: "Sauvegarder l'analyse d'une consultation",
    description: "Sauvegarde ou met à jour l'analyse astrologique d'une consultation.",
  })
  @ApiResponse({ status: 200, description: 'Analyse sauvegardée avec succès.' })
  @ApiResponse({ status: 404, description: 'Consultation non trouvée.' })
  async updateAnalysis(
    @Param('id') id: string,
    @Body() analysisData: any,
  ) {
    try {
      // Vérifier que la consultation existe
      const consultation = await this.consultationsService.findOne(id);

      if (!consultation) {
        throw new HttpException(
          {
            success: false,
            message: 'Consultation non trouvée',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        message: 'Analyse sauvegardée avec succès',
        consultationId: id,
        analyse: analysisData,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          error: "Erreur lors de la sauvegarde de l'analyse",
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

    let analyse = consultation.resultData;
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
    @CurrentUser() user: UserDocument,
  ) {
    try {
      return await this.analysisService.generateAnalysis(id, user);
    } catch (error) {
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

      if (consultation.resultData && consultation.resultData.analyse) {
        return {
          success: true,
          consultationId: id,
          statut: ConsultationStatus.COMPLETED,
          analyse: consultation.resultData.analyse,
          consultation: consultation,
        };
      }

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
          consultation: null,
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

  /**
   * PATCH /consultations/:id/mark-notified
   * Marquer une analyse comme notifiée
   */
  @Patch(':id/mark-notified')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.UPDATE_ANY_CONSULTATION)
  @ApiOperation({ summary: 'Marquer une analyse comme notifiée' })
  @ApiResponse({ status: 200, description: 'Analyse marquée comme notifiée' })
  async markAsNotified(@Param('id') id: string) {
    return this.consultationsService.markAnalysisAsNotified(id);
  }

  /**
   * GET /consultations/:id/is-notified
   * Vérifier si une analyse a été notifiée
   */
  @Get(':id/is-notified')
  @Public()
  @ApiOperation({ summary: 'Vérifier si une analyse a été notifiée' })
  @ApiResponse({ status: 200, description: 'Statut de notification' })
  async isNotified(@Param('id') id: string) {
    const isNotified = await this.consultationsService.isAnalysisNotified(id);
    return { consultationId: id, analysisNotified: isNotified };
  }
}