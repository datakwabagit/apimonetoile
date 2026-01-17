import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { Role } from '../common/enums/role.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';
import { UserDocument } from '../users/schemas/user.schema';
import { AnalysisService } from './analysis.service';
import { ConsultationsService } from './consultations.service';
import { SaveAnalysisDto } from './dto/save-analysis.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';

@ApiTags('Consultations')
@Controller('consultations')
@UseGuards(JwtAuthGuard)
export class ConsultationsController {

  constructor(
    private readonly consultationsService: ConsultationsService,
    private readonly notificationsService: NotificationsService,
    private readonly analysisService: AnalysisService,
  ) { }

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
      console.log(`[API] Envoi notification pour consultation ${id}`);
      // Récupérer la consultation pour obtenir le client
      const consultation: any = await this.consultationsService.findOne(id);
      console.log('Consultation récupérée:', consultation);
      if (!consultation || !consultation.clientId) {
        console.error('Consultation ou utilisateur non trouvé', { consultation });
        throw new HttpException('Consultation ou utilisateur non trouvé', HttpStatus.NOT_FOUND);
      }
      // Correction : extraire l'_id si clientId est un objet
      console.log('consultation.clientId:', consultation.clientId);
      const userId = consultation.clientId._id ? consultation.clientId._id.toString() : consultation.clientId.toString();
      console.log('userId utilisé pour notification:', userId);
      const notif = await this.notificationsService.create({
        userId,
        type: NotificationType.CONSULTATION_RESULT,
        title: 'Notification de consultation',
        message: `Vous avez reçu une notification pour la consultation "${consultation.title || id}"`,
        metadata: { consultationId: id },
      });
      console.log('Notification créée:', notif);
      // Mettre à jour le champ analysisNotified à true
      const updateResult = await this.consultationsService.update(id, { analysisNotified: true });
      console.log('Consultation mise à jour (analysisNotified: true):', updateResult);
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
      // Récupérer la consultation
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

      // Essayer de récupérer l'analyse depuis la collection AstrologicalAnalysis
      let analysisData = null;
      try {
        const analysis = await this.analysisService.getAstrologicalAnalysis(consultationId);
        if (analysis) {
          analysisData = analysis.toObject();
        }
      } catch (error) {
        // Si pas trouvé dans AstrologicalAnalysis, on essaie dans resultData
        console.log('Analyse non trouvée dans AstrologicalAnalysis, tentative dans resultData');
      }

      // Fallback: vérifier dans resultData de la consultation
      if (!analysisData && consultation.resultData) {
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
    // Réutiliser la même logique que getAnalysisByConsultationId
    return this.getAnalysisByConsultationId(id);
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
      const astroAnalysis = await this.analysisService.getAstrologicalAnalysis(id);
      if (astroAnalysis) {
        analyse = astroAnalysis.toObject();
      }
    } catch (error) {
      console.warn(
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
      // Vérifier que l'utilisateur est propriétaire de la consultation (sauf admin)
      const consultation = await this.consultationsService.findOne(id);
      if (consultation && user) {
        const userRole = user.role || (typeof user.toObject === 'function' ? user.toObject().role : undefined);
        const userId = user._id?.toString() || (typeof user.toObject === 'function' ? user.toObject()._id?.toString() : undefined);
        const consultationClientId = consultation.clientId?.toString();
        
        if (userRole && userRole !== Role.ADMIN && userRole !== Role.SUPER_ADMIN) {
          if (consultationClientId && userId && consultationClientId !== userId) {
            throw new ForbiddenException('You can only view your own consultations');
          }
        }
      }
      
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
  update(@Param('id') id: string, @Body() updateConsultationDto: UpdateConsultationDto, @CurrentUser() user: UserDocument) {
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