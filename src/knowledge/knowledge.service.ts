import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Knowledge, KnowledgeDocument } from './schemas/knowledge.schema';
import { CreateKnowledgeDto } from './dto/create-knowledge.dto';
import { UpdateKnowledgeDto } from './dto/update-knowledge.dto';
import { Role } from '../common/enums/role.enum';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectModel(Knowledge.name) private knowledgeModel: Model<KnowledgeDocument>,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Créer une nouvelle connaissance
   */
  async create(authorId: string, createKnowledgeDto: CreateKnowledgeDto) {
    const knowledge = new this.knowledgeModel({
      ...createKnowledgeDto,
      authorId,
      publishedAt: createKnowledgeDto.isPublished ? new Date() : null,
    });

    await knowledge.save();

    // Si la connaissance est publiée immédiatement, créer une notification
    if (createKnowledgeDto.isPublished) {
      try {
        // Note: Dans une implémentation complète, on pourrait envoyer cette notification
        // à tous les utilisateurs abonnés ou intéressés par cette catégorie
        // Pour l'instant, on log juste l'information
        const notificationData = await this.notificationsService.createNewKnowledgeNotification(
          knowledge._id.toString(),
          knowledge.title,
          knowledge.category,
        );
        console.log('Notification de nouvelle connaissance créée:', notificationData);
      } catch (error) {
        console.error('Erreur lors de la création de la notification:', error);
      }
    }

    return knowledge.populate('authorId', 'firstName lastName email role');
  }

  /**
   * Récupérer toutes les connaissances avec pagination et filtres
   */
  async findAll(query: {
    page?: number;
    limit?: number;
    category?: string;
    tag?: string;
    authorId?: string;
    isPublished?: boolean;
    search?: string;
  }) {
    const { page = 1, limit = 10, category, tag, authorId, isPublished, search } = query;
    const skip = (page - 1) * limit;

    // Construire le filtre
    const filter: any = {};

    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    if (authorId) filter.authorId = authorId;
    if (isPublished !== undefined) filter.isPublished = isPublished;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    const [knowledges, total] = await Promise.all([
      this.knowledgeModel
        .find(filter)
        .populate('authorId', 'firstName lastName email role')
        .skip(skip)
        .limit(limit)
        .sort({ publishedAt: -1, createdAt: -1 })
        .exec(),
      this.knowledgeModel.countDocuments(filter).exec(),
    ]);

    return {
      knowledges,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Récupérer une connaissance par ID
   */
  async findOne(id: string) {
    const knowledge = await this.knowledgeModel
      .findById(id)
      .populate('authorId', 'firstName lastName email role bio specialties')
      .exec();

    if (!knowledge) {
      throw new NotFoundException('Connaissance non trouvée');
    }

    // Incrémenter le compteur de vues
    knowledge.viewsCount += 1;
    await knowledge.save();

    return knowledge;
  }

  /**
   * Mettre à jour une connaissance
   */
  async update(id: string, userId: string, userRole: Role, updateKnowledgeDto: UpdateKnowledgeDto) {
    const knowledge = await this.knowledgeModel.findById(id);

    if (!knowledge) {
      throw new NotFoundException('Connaissance non trouvée');
    }

    // Vérifier les permissions
    if (
      knowledge.authorId.toString() !== userId &&
      userRole !== Role.ADMIN &&
      userRole !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException("Vous n'avez pas la permission de modifier cette connaissance");
    }

    const wasUnpublished = !knowledge.isPublished;

    // Si on publie pour la première fois
    if (updateKnowledgeDto.isPublished && !knowledge.isPublished) {
      updateKnowledgeDto['publishedAt'] = new Date();

      // Créer une notification pour la nouvelle publication
      if (wasUnpublished) {
        try {
          const notificationData = await this.notificationsService.createNewKnowledgeNotification(
            knowledge._id.toString(),
            updateKnowledgeDto.title || knowledge.title,
            updateKnowledgeDto.category || knowledge.category,
          );
          console.log('Notification de nouvelle connaissance créée:', notificationData);
        } catch (error) {
          console.error('Erreur lors de la création de la notification:', error);
        }
      }
    }

    Object.assign(knowledge, updateKnowledgeDto);
    await knowledge.save();

    return knowledge.populate('authorId', 'firstName lastName email role');
  }

  /**
   * Supprimer une connaissance
   */
  async remove(id: string, userId: string, userRole: Role) {
    const knowledge = await this.knowledgeModel.findById(id);

    if (!knowledge) {
      throw new NotFoundException('Connaissance non trouvée');
    }

    // Vérifier les permissions
    if (
      knowledge.authorId.toString() !== userId &&
      userRole !== Role.ADMIN &&
      userRole !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException("Vous n'avez pas la permission de supprimer cette connaissance");
    }

    await knowledge.deleteOne();
    return { message: 'Connaissance supprimée avec succès' };
  }

  /**
   * Aimer/retirer le like d'une connaissance
   */
  async toggleLike(id: string, userId: string) {
    const knowledge = await this.knowledgeModel.findById(id);

    if (!knowledge) {
      throw new NotFoundException('Connaissance non trouvée');
    }

    const userIdObj = userId as any;
    const likedIndex = knowledge.likedBy.findIndex((id) => id.toString() === userId);

    if (likedIndex > -1) {
      // Retirer le like
      knowledge.likedBy.splice(likedIndex, 1);
      knowledge.likesCount = Math.max(0, knowledge.likesCount - 1);
    } else {
      // Ajouter le like
      knowledge.likedBy.push(userIdObj);
      knowledge.likesCount += 1;
    }

    await knowledge.save();
    return {
      liked: likedIndex === -1,
      likesCount: knowledge.likesCount,
    };
  }

  /**
   * Récupérer les connaissances les plus populaires
   */
  async findPopular(limit: number = 5) {
    return this.knowledgeModel
      .find({ isPublished: true })
      .populate('authorId', 'firstName lastName email role')
      .sort({ viewsCount: -1, likesCount: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Récupérer les dernières connaissances publiées
   */
  async findRecent(limit: number = 10) {
    return this.knowledgeModel
      .find({ isPublished: true })
      .populate('authorId', 'firstName lastName email role')
      .sort({ publishedAt: -1 })
      .limit(limit)
      .exec();
  }
}
