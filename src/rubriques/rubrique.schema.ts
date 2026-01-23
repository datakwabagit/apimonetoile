import { ConsultationType } from '../common/enums/consultation-status.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document } from 'mongoose';

export type RubriqueDocument = Rubrique & Document;


@Schema({ _id: false })
export class OfferingAlternative {
  @Prop({ type: 'ObjectId', auto: true })
  _id?: string;

  @Prop({ type: String, enum: ['animal', 'vegetal', 'beverage'], required: true })
  category: 'animal' | 'vegetal' | 'beverage';

  @Prop({ type: String, required: true })
  offeringId: string;

  @Prop({ type: Number, required: true, default: 1 })
  quantity: number;
}

export const OfferingAlternativeSchema = SchemaFactory.createForClass(OfferingAlternative);

@Schema({ _id: false })
export class Offering {
  @Prop({ type: [OfferingAlternativeSchema], required: true, default: [] })
  alternatives: OfferingAlternative[];
}

export const OfferingSchema = SchemaFactory.createForClass(Offering);

@Schema({ _id: false })
export class ConsultationChoice {
  @Prop({ type: 'ObjectId', auto: true })
  _id?: string;

  @Prop({ type: 'ObjectId', ref: 'Prompt', required: false })
  promptId?: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Number, default: 0 })
  order: number;

  @Prop({
    type: String,
    enum: ['UNE_FOIS_VIE', 'ANNUELLE', 'MENSUELLE', 'QUOTIDIENNE', 'LIBRE'],
    default: 'LIBRE',
    required: true,
  })
  frequence: string;

  @Prop({
    type: String,
    enum: ['SOLO', 'AVEC_TIERS', 'GROUPE', 'POUR_TIERS'],
    default: 'SOLO',
    required: true,
  })
  participants: string;

  @Prop({ type: OfferingSchema, required: true })
  offering: Offering;
  
}

export const ConsultationChoiceSchema = SchemaFactory.createForClass(ConsultationChoice);

@Schema({ timestamps: true })
export class Rubrique {
  @Prop({ required: true, default: 'GENERAL' })
  categorie: string;

  @Prop({ type: 'ObjectId', ref: 'Categorie', required: false })
  categorieId?: string;

  @Prop({ required: true })
  titre: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: String, enum: ConsultationType, default: ConsultationType.AUTRE })
  typeconsultation: ConsultationType;

  @Prop({ type: [ConsultationChoiceSchema], default: [] })
  @Type(() => ConsultationChoice)
  consultationChoices: ConsultationChoice[];
}

export const RubriqueSchema = SchemaFactory.createForClass(Rubrique);
