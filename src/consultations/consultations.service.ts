/**
 * Générer le PDF d'une consultation
 */

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConsultationStatus } from '../common/enums/consultation-status.enum';
import { Role } from '../common/enums/role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { OfferingsService } from '../offerings/offerings.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { SaveAnalysisDto } from './dto/save-analysis.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import {
  AstrologicalAnalysis,
  AstrologicalAnalysisDocument,
} from './schemas/astrological-analysis.schema';
import { Consultation, ConsultationDocument } from './schemas/consultation.schema';

@Injectable()
export class ConsultationsService {
  constructor(
    @InjectModel(Consultation.name) private consultationModel: Model<ConsultationDocument>,
    @InjectModel(AstrologicalAnalysis.name)
    private analysisModel: Model<AstrologicalAnalysisDocument>,
    private notificationsService: NotificationsService,
    private offeringsService: OfferingsService,
  ) { }

  /**
   * Récupère les alternatives enrichies avec les données d'offrande
   */
  async populateAlternatives(alternatives: any[] = []) {
    if (!alternatives.length) return [];
    // Filtrer les offeringIds valides et uniques
    const offeringIds = Array.from(new Set(
      alternatives
        .map(a => a.offeringId)
        .filter(id => id !== null && id !== undefined)
        .map(id => id?.toString())
    ));
    const offerings = await this.offeringsService.findByIds(offeringIds);

    // Fusionner chaque alternative avec ses données d'offrande au niveau racine
    const enrichedAlternatives = alternatives.map(alt => {
      const altId = alt.offeringId?.toString();
      const found = offerings.find(o => {
        const offerId = o._id?.toString() || o.id?.toString();
        return offerId === altId;
      });
      return found
        ? {
          ...alt, // conserve offeringId et quantity
          name: found.name,
          price: found.price,
          priceUSD: found.priceUSD,
          category: found.category,
          icon: found.icon,
          description: found.description,
        }
        : alt;
    });
    return enrichedAlternatives;
  }

  /**
   * Créer une nouvelle consultation
   */
  async create(clientId: string, createConsultationDto: CreateConsultationDto) {
    // Si une offrande obligatoire est fournie, valider sa structure
    if (createConsultationDto.requiredOffering) {
      const { requiredOffering } = createConsultationDto;
      if (!['animal', 'vegetal', 'boisson'].includes(requiredOffering.selectedAlternative)) {
        throw new Error('L’alternative choisie doit être animal, vegetal ou boisson.');
      }
      if (!requiredOffering.alternatives || requiredOffering.alternatives.length !== 3) {
        throw new Error('Il doit y avoir exactement trois alternatives (animal, vegetal, boisson).');
      }
      if (!requiredOffering.alternatives.find(a => a.offeringId && a.quantity)) {
        throw new Error('Chaque alternative doit avoir un offeringId et une quantité.');
      }
    }

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
   * Créer une consultation personnelle
   */
  async createPersonalConsultation(data: any) {
    // Si une offrande obligatoire est fournie, valider sa structure
    if (data.requiredOffering) {
      const { requiredOffering } = data;
      if (!['animal', 'vegetal', 'boisson'].includes(requiredOffering.selectedAlternative)) {
        throw new Error('L’alternative choisie doit être animal, vegetal ou boisson.');
      }
      if (!requiredOffering.alternatives || requiredOffering.alternatives.length !== 3) {
        throw new Error('Il doit y avoir exactement trois alternatives (animal, vegetal, boisson).');
      }
      if (!requiredOffering.alternatives.find(a => a.offeringId && a.quantity)) {
        throw new Error('Chaque alternative doit avoir un offeringId et une quantité.');
      }
    }

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


    // Populate alternatives with offering details
    if (consultation.alternatives && consultation.alternatives.length) {
      consultation.alternatives = await this.populateAlternatives(consultation.alternatives);
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
        } catch (error) {
          console.error('[ConsultationService] Erreur création notification:', error);
        }
      } else {
        console.log('[ConsultationService] Pas de clientId, notification ignorée');
      }
    }

    await consultation.save();
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
    // Exclure explicitement les consultations de type HOROSCOPE
    const filter: any = {
      clientId,
      status: ConsultationStatus.COMPLETED,
      type: { $ne: 'HOROSCOPE' }
    };
    const { page = 1, limit = 10 } = query;
    return this.findAll({ page, limit, ...filter });
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
    const existingAnalysis = await this.analysisModel.findOne({ consultationId }).exec();

    if (existingAnalysis) {
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
      return existingAnalysis;
    }

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

    try {
      const savedAnalysis = await analysis.save();      
      return savedAnalysis;
    } catch (error) {
      console.error('[ConsultationService] ❌ Erreur lors de la sauvegarde:', {
        message: error.message,
        code: error.code,
        errors: error.errors,
      });
      throw error;
    }
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
