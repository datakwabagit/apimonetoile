import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConsultationsService } from './consultations.service';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { SaveAnalysisDto } from './dto/save-analysis.dto';
import { DeepseekService, BirthData } from './deepseek.service';
import { EmailService } from '../common/services/email.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permission } from '../common/enums/permission.enum';
import { ConsultationStatus } from '../common/enums/consultation-status.enum';
import { UserDocument } from '../users/schemas/user.schema';

@ApiTags('Consultations')
@Controller('consultations')
@UseGuards(JwtAuthGuard)
export class ConsultationsController {
  constructor(
    private readonly consultationsService: ConsultationsService,
    private readonly deepseekService: DeepseekService,
    private readonly emailService: EmailService,
  ) {}

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
    console.log('[ConsultationController] Création consultation pour utilisateur:', user._id);

    // Utiliser la méthode create() qui enregistre correctement le clientId
    const consultation = await this.consultationsService.create(user._id.toString(), body);

    console.log('[ConsultationController] ✅ Consultation créée avec clientId:', {
      id: consultation.id,
      clientId: user._id.toString(),
    });

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
      const { birthData } = body;

      // Validation des données
      if (
        !birthData ||
        !birthData.nom ||
        !birthData.prenoms ||
        !birthData.dateNaissance ||
        !birthData.heureNaissance ||
        !birthData.villeNaissance ||
        !birthData.paysNaissance
      ) {
        throw new HttpException('Données de naissance incomplètes', HttpStatus.BAD_REQUEST);
      }

      console.log('[API] 🚀 Génération analyse pour consultation:', id);
      console.log('[API] 📋 Données naissance:', {
        nom: birthData.nom,
        prenoms: birthData.prenoms,
        dateNaissance: birthData.dateNaissance,
        lieu: `${birthData.villeNaissance}, ${birthData.paysNaissance}`,
      });

      // Générer l'analyse complète via DeepSeek
      console.log('[API] ⏳ Appel DeepSeek en cours...');
      const analyse = await this.deepseekService.genererAnalyseComplete(birthData, id);
      console.log('[API] ✅ Analyse générée, structure:', {
        sessionId: analyse.sessionId,
        hasCarteDuCiel: !!analyse.carteDuCiel,
        hasMissionDeVie: !!analyse.missionDeVie,
        positionsCount: analyse.carteDuCiel?.positions?.length || 0,
      });

      // Construire l'objet AnalyseAstrologique complet
      const analyseComplete = {
        consultationId: id,
        ...analyse,
        dateGeneration: new Date().toISOString(),
      };

      console.log('[API] 📦 Analyse complète construite');

      // Sauvegarder l'analyse dans la collection AstrologicalAnalysis
      try {
        const userId = user._id.toString();
        console.log('[API] 💾 Sauvegarde analyse pour userId:', userId);

        const savedAnalysis = await this.consultationsService.saveAstrologicalAnalysis(
          userId,
          id,
          analyseComplete,
        );
        console.log('[API] ✅ Analyse sauvegardée avec succès, ID:', savedAnalysis._id);
      } catch (saveError) {
        console.error('[API] ❌ Erreur sauvegarde analyse:', {
          message: saveError.message,
          stack: saveError.stack,
        });
      }

      // Envoyer l'email de notification (non-bloquant)
      if (birthData.email) {
        this.emailService
          .sendAnalysisReadyEmail(birthData.email, birthData.prenoms, birthData.nom, id)
          .then((result) => {
            if (result.success) {
              console.log('[API] Email de notification envoyé à:', birthData.email);
            } else {
              console.error('[API] Échec envoi email:', result.error);
            }
          })
          .catch((err) => {
            console.error('[API] Erreur envoi email:', err);
          });
      } else {
        console.warn("[API] Pas d'email fourni - notification non envoyée");
      }

      return {
        success: true,
        consultationId: id,
        statut: 'completed',
        message: 'Analyse astrologique générée avec succès',
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
          statut: consultation.resultData.statut || 'completed',
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
