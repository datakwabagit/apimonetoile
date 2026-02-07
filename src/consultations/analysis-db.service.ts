import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Analysis } from './schemas/analysis.schema';
import { SaveAnalysisDto } from './dto/save-analysis.dto';

@Injectable()
export class AnalysisDbService {
  constructor(
    @InjectModel(Analysis.name)
    private readonly analysisModel: Model<Analysis>,
  ) { }

  async createAnalysis(dto: SaveAnalysisDto): Promise<Analysis> {
    // On ne prend que les champs pertinents pour Analysis
    const {
      consultationID,
      texte,
      clientId,
      choiceId,
      type,
      status,
      title,
      completedDate,
    } = dto;

    if (!consultationID) {
      throw new Error('consultationID is required to create or update an analysis');
    }

    return this.analysisModel.findOneAndUpdate(
      { consultationID },
      {
        $set: {
          consultationID,
          texte,
          clientId,
          choiceId,
          type,
          status,
          title,
          completedDate,
          prompt: dto.prompt,
          dateGeneration: dto.dateGeneration,
          metadata: dto.metadata,
        },
      },
      { new: true, upsert: true },
    );
  }
}
