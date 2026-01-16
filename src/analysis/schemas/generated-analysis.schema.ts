import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type GeneratedAnalysisDocument = GeneratedAnalysis & Document;

@Schema({ timestamps: true })
export class GeneratedAnalysis {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'AnalysisTemplate', required: true })
  templateId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  templateTitle: string;

  @Prop({ required: true, type: String })
  content: string;

  @Prop({ required: true, type: String })
  prompt: string;

  @Prop({ required: false, type: Object })
  astrologicalData?: {
    birthDate?: string;
    birthTime?: string;
    birthPlace?: string;
    planets?: any;
    houses?: any;
    aspects?: any;
    asteroids?: any;
    [key: string]: any;
  };

  @Prop({ required: false, type: String })
  model?: string;

  @Prop({ required: false, type: Number })
  generationTime?: number;

  @Prop({ required: false, type: Number, default: 0 })
  rating?: number;

  @Prop({ required: false, type: String })
  userFeedback?: string;

  @Prop({ required: false, type: Boolean, default: false })
  isPublic?: boolean;

  @Prop({ required: false, type: Boolean, default: false })
  isFavorite?: boolean;

  @Prop({ required: false, type: String })
  category?: string;

  @Prop({ required: false, type: [String], default: [] })
  tags?: string[];
}

export const GeneratedAnalysisSchema = SchemaFactory.createForClass(GeneratedAnalysis);
