import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'analyses', timestamps: true })
export class Analysis extends Document {
    @Prop({ required: true })
    consultationID: string;

    @Prop({ required: true, type: String })
    texte: string;

    @Prop({ required: false })
    clientId?: string;   

    @Prop({ required: false })
    choiceId?: string;

    @Prop({ required: false })
    type?: string;

    @Prop({ required: false })
    status?: string;

    @Prop({ required: false })
    title?: string;    

    @Prop({ required: false })
    completedDate?: Date; 
    
    @Prop({ required: false, type: Object })
    metadata?: any;

    @Prop({ required: false })
    prompt?: string;

    @Prop({ required: false })
    dateGeneration?: Date;
}

export const AnalysisSchema = SchemaFactory.createForClass(Analysis);
