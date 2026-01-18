import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PromptDocument = Prompt & Document;

@Schema({ timestamps: true })
export class Prompt {
  @Prop({ required: true, unique: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const PromptSchema = SchemaFactory.createForClass(Prompt);
