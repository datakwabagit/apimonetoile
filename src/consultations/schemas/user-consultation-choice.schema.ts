import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type UserConsultationChoiceDocument = UserConsultationChoice & Document;

@Schema({ timestamps: true })
export class UserConsultationChoice {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Consultation', required: true })
  consultationId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  choiceTitle: string;

   @Prop({ required: true })
  choiceId: string;

  @Prop({ required: true })
  frequence: 'UNE_FOIS_VIE' | 'ANNUELLE' | 'MENSUELLE' | 'QUOTIDIENNE' | 'LIBRE';

  @Prop({ required: true })
  participants: 'SOLO' | 'AVEC_TIERS' | 'GROUPE';

  @Prop({ required: true })
  createdAt: Date;
}

export const UserConsultationChoiceSchema = SchemaFactory.createForClass(UserConsultationChoice);
