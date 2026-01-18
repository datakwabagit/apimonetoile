import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AstrologicalAnalysisDocument = AstrologicalAnalysis & Document;

@Schema({ timestamps: true })
export class AstrologicalAnalysis {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Consultation', required: true, index: true })
  consultationId: MongooseSchema.Types.ObjectId;

  @Prop({ type: Object, required: true })
  carteDuCiel: {
    sujet: {
      nom: string;
      prenoms: string;
      dateNaissance: string;
      heureNaissance: string;
      lieuNaissance: string;
    };
    positions: any;
  };

  @Prop({ type: Object })
  missionDeVie: {
    titre: string;
    analyseKarmique: {
      noeudNord: {
        position: string;
        signification: string;
      };
      noeudSud: {
        position: string;
        signification: string;
      };
    };
    synthese: string[];
  };

  @Prop({ type: Object })
  talentsNaturels: {
    titre: string;
    intellectCommunication: {
      soleil: string;
      mercure: string;
      description: string;
      talents: string[];
    };
    synthese: string[];
  };

  @Prop({ type: Object })
  defisViePersonnelle: {
    titre: string;
    defis: any[];
  };

  @Prop({ type: Object })
  relations: {
    titre: string;
    styleRelationnel: {
      venus: string;
      description: string;
    };
    compatibilite: {
      signesCompatibles: string[];
    };
  };

  @Prop({ type: Object })
  carriereVocation: {
    titre: string;
    milieuDuCiel: {
      position: string;
      description: string;
    };
    domainesRecommandes: string[];
  };

  @Prop({ type: Object })
  spiritualiteCroissance: {
    titre: string;
    cheminSpirituel: {
      description: string;
    };
    pratiquesRecommandees: string[];
  };

  @Prop({ type: Date, default: Date.now })
  dateGeneration: Date;
}

export const AstrologicalAnalysisSchema = SchemaFactory.createForClass(AstrologicalAnalysis);

AstrologicalAnalysisSchema.index({ userId: 1, createdAt: -1 });
