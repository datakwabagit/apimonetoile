import { ConsultationType } from '../common/enums/consultation-status.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RubriqueDocument = Rubrique & Document;

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

  @Prop({
    type: [
      {
        _id: { type: 'ObjectId', auto: true },
        title: String,
        description: String,
        order: { type: Number, default: 0 },
        frequence: {
          type: String,
          enum: ['UNE_FOIS_VIE', 'ANNUELLE', 'MENSUELLE', 'QUOTIDIENNE', 'LIBRE'],
          default: 'LIBRE',
        },
        participants: {
          type: String,
          enum: ['SOLO', 'AVEC_TIERS', 'GROUPE', 'POUR_TIERS'],
          default: 'SOLO',
        },
        offering: {
          alternatives: [
            {
              _id: { type: 'ObjectId', auto: true },
              category: { type: String, enum: ['animal', 'vegetal', 'beverage'], required: true },
              offeringId: { type: String, required: true },
              quantity: { type: Number, required: true, default: 1 },
            },
          ],
        },
      },
    ],
    default: [],
  })
  consultationChoices: any[];
}

export const RubriqueSchema = SchemaFactory.createForClass(Rubrique);
