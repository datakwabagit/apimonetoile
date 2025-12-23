import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RubriqueDocument = Rubrique & Document;

@Schema({ timestamps: true })
export class Rubrique {
  @Prop({ required: true, default: 'GENERAL' })
  categorie: string;

  @Prop({ required: true })
  titre: string;

  @Prop({ required: true })
  description: string;

  @Prop({
    type: [
      {
        title: String,
        description: String,
        offering: {
          alternatives: [
            {
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
