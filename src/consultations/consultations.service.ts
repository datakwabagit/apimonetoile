import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Consultation, ConsultationDocument } from './schemas/consultation.schema';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { ConsultationStatus } from '../common/enums/consultation-status.enum';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class ConsultationsService {
  constructor(
    @InjectModel(Consultation.name) private consultationModel: Model<ConsultationDocument>,
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

    return consultation.populate(['clientId', 'serviceId']);
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
    return consultation;
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
    // Si le statut passe à COMPLETED, mettre la date de complétion
    if (updateConsultationDto.status === ConsultationStatus.COMPLETED) {
      updateConsultationDto['completedDate'] = new Date();
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
}
