import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConsultationStatus } from '../common/enums/consultation-status.enum';
import { Role } from '../common/enums/role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { OfferingsService } from '../offerings/offerings.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { SaveAnalysisDto } from './dto/save-analysis.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { Consultation, ConsultationDocument } from './schemas/consultation.schema';
import { UserConsultationChoiceService } from './user-consultation-choice.service';

@Injectable()
export class ConsultationsService {
  /**
   * Met à jour uniquement le champ resultData.analyse.texte d'une consultation
   */
  async updateAnalyseTexte(id: string, texte: string) {
    const consultation = await this.consultationModel.findById(id).exec();
    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }
    if (!consultation.resultData) {
      consultation.resultData = {};
    }
    if (!consultation.resultData.analyse) {
      consultation.resultData.analyse = {};
    }
    consultation.resultData.analyse.texte = texte;
    await consultation.save();
    return consultation;
  }

  /**
   * Supprimer plusieurs consultations selon un filtre
   */
  async deleteMany(filter: any): Promise<{ deletedCount: number }> {
    const result = await this.consultationModel.deleteMany(filter).exec();
    return { deletedCount: result.deletedCount || 0 };
  }

  constructor(
    @InjectModel(Consultation.name) private consultationModel: Model<ConsultationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private notificationsService: NotificationsService,
    private offeringsService: OfferingsService,
    private userConsultationChoiceService: UserConsultationChoiceService,
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
    // Adaptation du payload frontend
    const {
      type,
      title,
      description,
      formData,
      status,
      alternatives,
      choice,
      requiredOffering,
      requiredOfferingsDetails,
      tierce,
      tierces,
      rubriqueId
    } = createConsultationDto;


    // Mapping des alternatives et choix
    let mappedAlternatives = alternatives || [];
    if (choice && choice.offering && Array.isArray(choice.offering.alternatives)) {
      mappedAlternatives = choice.offering.alternatives;
    }

    // Mapping du formData (incluant carteDuCiel, missionDeVie, etc.)
    const mappedFormData = formData || {};

    // Création de la consultation
    const consultation = new this.consultationModel({
      clientId,
      type,
      title,
      description,
      rubriqueId,
      formData: mappedFormData,
      tierce: tierce || null,
      tierces: tierces || null,
      status: status || ConsultationStatus.PENDING,
      alternatives: mappedAlternatives,
      requiredOffering: requiredOffering || null,
      requiredOfferingsDetails: requiredOfferingsDetails || [],
      choice: choice || null,
    });

    await consultation.save();

    // Incrémenter les compteurs de consultations de l'utilisateur
    await this.userModel.findByIdAndUpdate(
      clientId,
      {
        $inc: {
          totalConsultations: 1,
          consultationsCount: 1,
        },
      },
      { new: true }
    ).exec();

    const populatedConsultation = await consultation.populate(['clientId', 'serviceId']);

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
    rubriqueId?: string;
  }) {
    const { page = 1, limit = 10, status, type, clientId, consultantId, rubriqueId } = query;
    const skip = (page - 1) * limit;

    // Construire le filtre
    const filter: any = {};

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (clientId) filter.clientId = clientId;
    if (consultantId) filter.consultantId = consultantId;
    if (rubriqueId) filter.rubriqueId = rubriqueId;

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

    const previousStatus = currentConsultation.status;
    const newStatus = updateConsultationDto.status;

    // Si le statut passe à COMPLETED, mettre la date de complétion
    if (newStatus === ConsultationStatus.COMPLETED) {
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

    // Gérer les changements de statut affectant les compteurs
    if (previousStatus !== newStatus) {
      const wasActive = previousStatus !== ConsultationStatus.CANCELLED;
      const willBeActive = newStatus !== ConsultationStatus.CANCELLED;

      if (wasActive && !willBeActive) {
        // Passage à CANCELLED: décrémenter consultationsCount
        await this.userModel.findByIdAndUpdate(
          currentConsultation.clientId,
          { $inc: { consultationsCount: -1 } },
          { new: true }
        ).exec();
      } else if (!wasActive && willBeActive) {
        // Passage de CANCELLED à un statut actif: incrémenter consultationsCount
        await this.userModel.findByIdAndUpdate(
          currentConsultation.clientId,
          { $inc: { consultationsCount: 1 } },
          { new: true }
        ).exec();
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

    // Vérifier si une analyse existe déjà pour ce choix de consultation
    const choiceId = consultation.choice?._id;
    if (choiceId && consultation.clientId) {
      const executedChoiceIds = await this.userConsultationChoiceService.getExecutedChoiceIds(consultation.clientId.toString(), id);
      if (executedChoiceIds.includes(choiceId)) {
        throw new ForbiddenException('Une analyse existe déjà pour ce choix de consultation.');
      }
    }

    // Mettre à jour avec l'analyse
    consultation.resultData = saveAnalysisDto.analyse;
    consultation.status =
      saveAnalysisDto.statut === 'completed'
        ? ConsultationStatus.COMPLETED
        : ConsultationStatus.PENDING;

    // Enregistrer le choix de consultation utilisateur pour manipulation des fréquences (une seule fois)
    if (consultation.clientId && choiceId) {
      await this.userConsultationChoiceService.recordChoicesForConsultation(
        consultation.clientId.toString(),
        consultation._id.toString(),
        [{
          title: consultation.title,
          choiceId,
          frequence: consultation.choice?.frequence || 'LIBRE',
          participants: consultation.choice?.participants || 'SOLO',
        }]
      );
    }

    if (saveAnalysisDto.statut === 'completed') {
      consultation.completedDate = new Date();
      consultation.analysisNotified = true; // Marquer comme notifié

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

    // Décrémenter les compteurs de consultations de l'utilisateur
    const isActive = consultation.status !== ConsultationStatus.CANCELLED;
    await this.userModel.findByIdAndUpdate(
      consultation.clientId,
      {
        $inc: {
          totalConsultations: -1,
          consultationsCount: isActive ? -1 : 0,
        },
      },
      { new: true }
    ).exec();

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
  async findByClient(userId: string, query: { page?: number; limit?: number }) {
    // Utilise l'enum pour le statut
    return this.findAll({ ...query, clientId: userId, status: ConsultationStatus.COMPLETED });
  }

  /**
   * Récupérer les consultations d'un consultant
   */
  async findByConsultant(consultantId: string, query: { page?: number; limit?: number }) {
    return this.findAll({ ...query, consultantId });
  }


  /**
   * Marquer une analyse comme notifiée
   * Utilisé lorsqu'une notification est envoyée à l'utilisateur
   */
  async markAnalysisAsNotified(consultationId: string): Promise<Consultation> {
    const consultation = await this.consultationModel.findById(consultationId).exec();

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    if (!consultation.result && !consultation.resultData) {
      throw new ForbiddenException('Cannot mark as notified: analysis not yet generated');
    }

    consultation.analysisNotified = true;
    await consultation.save();

    return consultation;
  }

  /**
   * Vérifier si une analyse a été notifiée
   */
  async isAnalysisNotified(consultationId: string): Promise<boolean> {
    const consultation = await this.consultationModel
      .findById(consultationId)
      .select('analysisNotified')
      .exec();

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    return consultation.analysisNotified === true;
  }
}