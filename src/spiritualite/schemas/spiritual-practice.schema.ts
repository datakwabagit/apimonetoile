import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class SpiritualPractice extends Document {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  iconName: string;

  @Prop({ required: true })
  category: string;

  @Prop({ default: true })
  published: boolean;

  @Prop({ required: true })
  order: number;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  introduction: string;

  @Prop({ required: true, type: [String] })
  keyElements: string[];

  @Prop({ required: true })
  detailedGuide: string;

  @Prop({ required: true, type: [String] })
  benefits: string[];

  @Prop({ required: true, type: [String] })
  practicalSteps: string[];

  @Prop({ required: true, type: [String] })
  warnings: string[];

  @Prop({ required: true })
  affirmation: string;

  @Prop({ type: [String], default: [] })
  materials?: string[];

  @Prop({ type: String, default: null })
  bestTiming?: string;
}

export const SpiritualPracticeSchema = SchemaFactory.createForClass(SpiritualPractice);
