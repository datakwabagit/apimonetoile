import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ConsultationStatus, ConsultationType } from '../../common/enums/consultation-status.enum';

export type ConsultationDocument = Consultation & Document;

/**
 * Schéma MongoDB pour les consultations
 */
@Schema({ timestamps: true })
export class Consultation {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  clientId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  consultantId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Service' })
  serviceId: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, enum: ConsultationType})
  type: ConsultationType;

  @Prop({ type: String, enum: ConsultationStatus, default: ConsultationStatus.PENDING })
  status: ConsultationStatus;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Object, default: {} })
  formData: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    question?: string;
    [key: string]: any; // Données spécifiques à chaque type de consultation
  };

  @Prop({ default: null })
  result: string; // Résultat de la consultation (texte long)

  @Prop({ type: Object, default: null })
  resultData: {
    // Données structurées du résultat
    horoscope?: any;
    numerology?: any;
    astrology?: any;
    [key: string]: any;
  };

  @Prop({ default: null })
  scheduledDate: Date; // Date programmée pour la consultation

  @Prop({ default: null })
  completedDate: Date; // Date de complétion

  @Prop({ default: 0 })
  price: number; // Prix en euros

  @Prop({ default: false })
  isPaid: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Payment', default: null })
  paymentId: MongooseSchema.Types.ObjectId;

  @Prop({ type: Number, min: 0, max: 5, default: null })
  rating: number; // Note du client (0-5)

  @Prop({ default: null })
  review: string; // Avis du client

  @Prop({ type: [String], default: [] })
  attachments: string[]; // URLs des fichiers joints

  @Prop({ default: null })
  notes: string; // Notes privées du consultant
}

export const ConsultationSchema = SchemaFactory.createForClass(Consultation);

// Indexes
ConsultationSchema.index({ clientId: 1, createdAt: -1 });
ConsultationSchema.index({ consultantId: 1, status: 1 });
ConsultationSchema.index({ status: 1 });
ConsultationSchema.index({ type: 1 });
