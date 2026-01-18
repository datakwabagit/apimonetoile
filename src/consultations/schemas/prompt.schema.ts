import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PromptDocument = Prompt & Document;

@Schema({ timestamps: true })
export class Prompt {
  @Prop({ required: true, unique: true })
  title: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: true })
  role: string;

  @Prop({ required: true })
  objective: string;

  @Prop({ type: [String], required: false })
  styleAndTone?: string[];

  @Prop({ type: Object, required: true })
  structure: {
    introduction?: string;
    sections: Array<{
      title: string;
      content: string;
      guidelines?: string[];
    }>;
    synthesis?: string;
    conclusion?: string;
  };

  @Prop({ type: Object, required: false })
  variables?: {
    [key: string]: string; // ex: { "PRÉNOM": "Prénom de la personne" }
  };

  @Prop({ type: [String], required: false })
  tags?: string[];

  @Prop({ type: String, required: true, unique: true })
  choiceId: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const PromptSchema = SchemaFactory.createForClass(Prompt);
