import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ConsultationChoiceDocument = ConsultationChoice & Document;

@Schema({ timestamps: true })
export class ConsultationChoice {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  frequence: string;

  @Prop({ required: true })
  participants: string;

  @Prop({ type: Object, required: true })
  offering: any;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Prompt', required: false })
  promptId?: MongooseSchema.Types.ObjectId;
}

export const ConsultationChoiceSchema = SchemaFactory.createForClass(ConsultationChoice);
