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
  ) {}

  async createAnalysis(dto: SaveAnalysisDto): Promise<Analysis> {
    // On ne prend que les champs pertinents pour Analysis
    const {
      consultationID,
      texte,
      clientId,
      type,
      status,
      title,
      completedDate,
    } = dto;
    const created = new this.analysisModel({
      consultationID,
      texte,
      clientId,
      type,
      status,
      title,
      completedDate,
    });
    return created.save();
  }
}
