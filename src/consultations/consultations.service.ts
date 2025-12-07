import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Consultation, ConsultationDocument } from './schemas/consultation.schema';
import { AstrologicalAnalysis, AstrologicalAnalysisDocument } from './schemas/astrological-analysis.schema';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { SaveAnalysisDto } from './dto/save-analysis.dto';
import { ConsultationStatus } from '../common/enums/consultation-status.enum';
import { Role } from '../common/enums/role.enum';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ConsultationsService {
  constructor(
    @InjectModel(Consultation.name) private consultationModel: Model<ConsultationDocument>,
    @InjectModel(AstrologicalAnalysis.name) private analysisModel: Model<AstrologicalAnalysisDocument>,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Créer une nouvelle consultation
   */
  async create(clientId: string, createConsultationDto: CreateConsultationDto) {
    const consultation = new this.consultationModel({
      ...createConsultationDto,
      clientId,
      status: ConsultationStatus.PENDING,
    });

    await consultation.save();

    const populatedConsultation = await consultation.populate(['clientId', 'serviceId']);

    // Retourner avec l'ID explicitement dans la réponse
    return {
      ...populatedConsultation.toObject(),
      id: populatedConsultation._id.toString(),
      consultationId: populatedConsultation._id.toString(),
    };
  }

  /**
   * Créer une consultation publique (sans authentification)
   */
  async createPublicConsultation(data: any) {
    const consultation = new this.consultationModel({
      serviceId: data.serviceId,
      type: data.type,
      title: data.title,
      description: data.description,
      formData: data.formData,
      status: ConsultationStatus.PENDING,
    });

    await consultation.save();

    console.log('[ConsultationService] Consultation publique créée:', consultation._id);

    // Retourner avec l'ID explicitement dans la réponse
    return {
      ...consultation.toObject(),
      id: consultation._id.toString(),
      consultationId: consultation._id.toString(),
    };
  }

  /**
   * Créer une consultation personnelle
   */
  async createPersonalConsultation(data: any) {
    const consultation = new this.consultationModel({
      ...data,
      type: 'personal',
      createdAt: new Date(),
    });
    await consultation.save();

    // Retourner avec l'ID explicitement dans la réponse
    return {
      ...consultation.toObject(),
      id: consultation._id.toString(),
      consultationId: consultation._id.toString(),
    };
  }

  /**
   * Récupérer toutes les consultations avec pagination et filtres
   */
  async findAll(query: {
    page?: number;
    limit?: number;
    status?: ConsultationStatus;
    type?: string;
    clientId?: string;
    consultantId?: string;
  }) {
    const { page = 1, limit = 10, status, type, clientId, consultantId } = query;
    const skip = (page - 1) * limit;

    // Construire le filtre
    const filter: any = {};

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (clientId) filter.clientId = clientId;
    if (consultantId) filter.consultantId = consultantId;

    // Récupérer les consultations
    const [consultations, total] = await Promise.all([
      this.consultationModel
        .find(filter)
        .populate('clientId', 'firstName lastName email')
        .populate('consultantId', 'firstName lastName email specialties')
        .populate('serviceId', 'name description price')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.consultationModel.countDocuments(filter).exec(),
    ]);

    return {
      consultations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Récupérer une consultation par ID
   */
  async findOne(id: string) {
    const consultation = await this.consultationModel
      .findById(id)
      .populate('clientId', 'firstName lastName email phoneNumber')
      .populate('consultantId', 'firstName lastName email specialties rating')
      .populate('serviceId', 'name description price duration')
      .exec();

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    return consultation;
  }

  /**
   * Mettre à jour une consultation
   */
  async update(id: string, updateConsultationDto: UpdateConsultationDto) {
    const currentConsultation = await this.consultationModel.findById(id).exec();

    if (!currentConsultation) {
      throw new NotFoundException('Consultation not found');
    }

    // Si le statut passe à COMPLETED, mettre la date de complétion
    if (updateConsultationDto.status === ConsultationStatus.COMPLETED) {
      updateConsultationDto['completedDate'] = new Date();

      // Créer une notification si un résultat a été ajouté
      if (updateConsultationDto.result || updateConsultationDto.resultData) {
        try {
          await this.notificationsService.createConsultationResultNotification(
            currentConsultation.clientId.toString(),
            id,
            currentConsultation.title,
          );
        } catch (error) {
          console.error('Erreur lors de la création de la notification:', error);
          // Ne pas bloquer la mise à jour si la notification échoue
        }
      }
    }

    const consultation = await this.consultationModel
      .findByIdAndUpdate(id, updateConsultationDto, { new: true })
      .populate('clientId', 'firstName lastName email')
      .populate('consultantId', 'firstName lastName email')
      .populate('serviceId', 'name description price')
      .exec();

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    return consultation;
  }

  /**
   * Attribuer une consultation à un consultant
   */
  async assignToConsultant(consultationId: string, consultantId: string) {
    const consultation = await this.consultationModel
      .findByIdAndUpdate(
        consultationId,
        {
          consultantId,
          status: ConsultationStatus.ASSIGNED,
        },
        { new: true },
      )
      .populate('clientId', 'firstName lastName email')
      .populate('consultantId', 'firstName lastName email')
      .exec();

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    // Créer une notification pour le consultant
    try {
      await this.notificationsService.createConsultationAssignedNotification(
        consultantId,
        consultationId,
        consultation.title,
      );
    } catch (error) {
      console.error('Erreur lors de la création de la notification:', error);
    }

    return consultation;
  }

  /**
   * Sauvegarder l'analyse générée
   */
  async saveAnalysis(id: string, saveAnalysisDto: SaveAnalysisDto) {
    console.log('[ConsultationService] Sauvegarde analyse pour:', id, 'statut:', saveAnalysisDto.statut);
    
    const consultation = await this.consultationModel.findById(id).exec();

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    // Mettre à jour avec l'analyse
    consultation.resultData = saveAnalysisDto.analyse;
    consultation.status =
      saveAnalysisDto.statut === 'completed'
        ? ConsultationStatus.COMPLETED
        : ConsultationStatus.PENDING;

    if (saveAnalysisDto.statut === 'completed') {
      consultation.completedDate = new Date();

      // Créer une notification pour le client (uniquement si clientId existe)
      if (consultation.clientId) {
        try {
          await this.notificationsService.createConsultationResultNotification(
            consultation.clientId.toString(),
            id,
            consultation.title,
          );
          console.log('[ConsultationService] Notification créée pour client:', consultation.clientId);
        } catch (error) {
          console.error('[ConsultationService] Erreur création notification:', error);
        }
      } else {
        console.log('[ConsultationService] Pas de clientId, notification ignorée');
      }
    }

    await consultation.save();
    console.log('[ConsultationService] Analyse sauvegardée avec succès');
    return consultation;
  }

  /**
   * Supprimer une consultation
   */
  async remove(id: string, userId: string, userRole: Role) {
    const consultation = await this.consultationModel.findById(id).exec();

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    // Vérifier les permissions
    if (
      userRole !== Role.ADMIN &&
      userRole !== Role.SUPER_ADMIN &&
      consultation.clientId.toString() !== userId
    ) {
      throw new ForbiddenException('You can only delete your own consultations');
    }

    await this.consultationModel.findByIdAndDelete(id).exec();
  }

  /**
   * Obtenir les statistiques des consultations
   */
  async getStatistics() {
    const [total, byStatus, byType, avgRating, totalRevenue] = await Promise.all([
      this.consultationModel.countDocuments().exec(),
      this.consultationModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      this.consultationModel.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      this.consultationModel.aggregate([
        { $match: { rating: { $ne: null } } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } },
      ]),
      this.consultationModel.aggregate([
        { $match: { isPaid: true } },
        { $group: { _id: null, total: { $sum: '$price' } } },
      ]),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byType: byType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      avgRating: avgRating[0]?.avgRating || 0,
      totalRevenue: totalRevenue[0]?.total || 0,
    };
  }

  /**
   * Récupérer les consultations d'un client
   */
  async findByClient(clientId: string, query: { page?: number; limit?: number }) {
    return this.findAll({ ...query, clientId });
  }

  /**
   * Récupérer les consultations d'un consultant
   */
  async findByConsultant(consultantId: string, query: { page?: number; limit?: number }) {
    return this.findAll({ ...query, consultantId });
  }

  /**
   * Sauvegarder une analyse astrologique complète
   */
  async saveAstrologicalAnalysis(userId: string, consultationId: string, analysisData: any) {
    console.log('[ConsultationService] Sauvegarde analyse astrologique pour user:', userId);

    // Vérifier si une analyse existe déjà pour cette consultation
    const existingAnalysis = await this.analysisModel.findOne({ consultationId }).exec();

    if (existingAnalysis) {
      // Mettre à jour l'analyse existante
      Object.assign(existingAnalysis, {
        userId,
        carteDuCiel: analysisData.carteDuCiel,
        missionDeVie: analysisData.missionDeVie,
        talentsNaturels: analysisData.talentsNaturels,
        defisViePersonnelle: analysisData.defisViePersonnelle,
        relations: analysisData.relations,
        carriereVocation: analysisData.carriereVocation,
        spiritualiteCroissance: analysisData.spiritualiteCroissance,
        dateGeneration: new Date(),
      });

      await existingAnalysis.save();
      console.log('[ConsultationService] Analyse mise à jour:', existingAnalysis._id);
      return existingAnalysis;
    }

    // Créer une nouvelle analyse
    const analysis = new this.analysisModel({
      userId,
      consultationId,
      carteDuCiel: analysisData.carteDuCiel,
      missionDeVie: analysisData.missionDeVie,
      talentsNaturels: analysisData.talentsNaturels,
      defisViePersonnelle: analysisData.defisViePersonnelle,
      relations: analysisData.relations,
      carriereVocation: analysisData.carriereVocation,
      spiritualiteCroissance: analysisData.spiritualiteCroissance,
      dateGeneration: new Date(),
    });

    await analysis.save();
    console.log('[ConsultationService] Nouvelle analyse créée:', analysis._id);
    return analysis;
  }

  /**
   * Récupérer l'analyse astrologique d'une consultation
   */
  async getAstrologicalAnalysis(consultationId: string) {
    const analysis = await this.analysisModel.findOne({ consultationId }).exec();

    if (!analysis) {
      throw new NotFoundException('Analyse non trouvée');
    }

    return analysis;
  }

  /**
   * Récupérer toutes les analyses d'un utilisateur
   */
  async getUserAnalyses(userId: string, query: { page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [analyses, total] = await Promise.all([
      this.analysisModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('consultationId')
        .exec(),
      this.analysisModel.countDocuments({ userId }).exec(),
    ]);

    return {
      analyses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
