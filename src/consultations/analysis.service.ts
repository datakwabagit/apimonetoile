import { NotFoundException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AstrologicalAnalysis, AstrologicalAnalysisDocument } from './schemas/astrological-analysis.schema';

@Injectable()
export class AnalysisService {
  constructor(
    @InjectModel(AstrologicalAnalysis.name)
    private analysisModel: Model<AstrologicalAnalysisDocument>,
  ) {}

  async getAstrologicalAnalysis(consultationId: string) {
    const analysis = await this.analysisModel.findOne({ consultationId }).exec();
    if (!analysis) {
      throw new NotFoundException('Analyse non trouvée');
    }
    return analysis;
  }
}
