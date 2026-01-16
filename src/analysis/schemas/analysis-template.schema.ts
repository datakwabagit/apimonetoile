import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AnalysisTemplateDocument = AnalysisTemplate & Document;

@Schema({ timestamps: true })
export class AnalysisTemplate {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, type: String })
  prompt: string;

  @Prop({ required: false, default: null })
  category?: string;

  @Prop({ required: false, default: null })
  icon?: string;

  @Prop({ required: false, type: [String], default: [] })
  tags?: string[];

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  createdBy?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  updatedBy?: MongooseSchema.Types.ObjectId;

  @Prop({ required: false, default: 0 })
  usageCount?: number;

  @Prop({ required: false, type: Object })
  metadata?: {
    requiredFields?: string[];
    estimatedReadTime?: number;
    difficulty?: 'easy' | 'medium' | 'advanced';
    [key: string]: any;
  };
}

export const AnalysisTemplateSchema = SchemaFactory.createForClass(AnalysisTemplate);
