import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalysisProgressService } from './analysis-progress.service';
import { AnalysisProgressController } from './analysis-progress.controller';
import { AnalysisTemplateService } from './analysis-template.service';
import { AnalysisTemplateController } from './analysis-template.controller';
import { AnalysisTemplate, AnalysisTemplateSchema } from './schemas/analysis-template.schema';
import { GeneratedAnalysis, GeneratedAnalysisSchema } from './schemas/generated-analysis.schema';
import { ConsultationsModule } from '../consultations/consultations.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AnalysisTemplate.name, schema: AnalysisTemplateSchema },
      { name: GeneratedAnalysis.name, schema: GeneratedAnalysisSchema },
    ]),
    forwardRef(() => ConsultationsModule),
  ],
  controllers: [AnalysisProgressController, AnalysisTemplateController],
  providers: [AnalysisProgressService, AnalysisTemplateService],
  exports: [AnalysisProgressService, AnalysisTemplateService],
})
export class AnalysisModule {}