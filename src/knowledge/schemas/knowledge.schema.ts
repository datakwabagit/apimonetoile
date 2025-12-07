import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type KnowledgeDocument = Knowledge & Document;

/**
 * Catégories de connaissances
 */
export enum KnowledgeCategory {
  ASTROLOGIE = 'ASTROLOGIE',
  NUMEROLOGIE = 'NUMEROLOGIE',
  TAROT = 'TAROT',
  SPIRITUALITE = 'SPIRITUALITE',
  MEDITATION = 'MEDITATION',
  DEVELOPPEMENT_PERSONNEL = 'DEVELOPPEMENT_PERSONNEL',
  RITUELS = 'RITUELS',
  AUTRES = 'AUTRES',
}

/**
 * Schéma MongoDB pour le partage de connaissances
 */
@Schema({ timestamps: true })
export class Knowledge {
  @Prop({ required: true })
  title: string; // Titre de la connaissance

  @Prop({ required: true })
  content: string; // Contenu principal (peut être long)

  @Prop({ type: String, enum: KnowledgeCategory, required: true })
  category: KnowledgeCategory;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  authorId: MongooseSchema.Types.ObjectId; // Auteur (consultant/admin)

  @Prop({ type: [String], default: [] })
  tags: string[]; // Tags pour la recherche

  @Prop({ default: null })
  imageUrl?: string; // Image d'illustration

  @Prop({ default: true })
  isPublished: boolean; // Publié ou brouillon

  @Prop({ default: 0 })
  viewsCount: number; // Nombre de vues

  @Prop({ default: 0 })
  likesCount: number; // Nombre de likes

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'User', default: [] })
  likedBy: MongooseSchema.Types.ObjectId[]; // Liste des utilisateurs qui ont aimé

  @Prop()
  publishedAt?: Date; // Date de publication
}

export const KnowledgeSchema = SchemaFactory.createForClass(Knowledge);

// Indexes
KnowledgeSchema.index({ category: 1, isPublished: 1, publishedAt: -1 });
KnowledgeSchema.index({ authorId: 1 });
KnowledgeSchema.index({ tags: 1 });
KnowledgeSchema.index({ isPublished: 1, viewsCount: -1 });
