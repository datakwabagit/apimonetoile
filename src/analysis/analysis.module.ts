import { Module } from '@nestjs/common';
import { AnalysisProgressService } from './analysis-progress.service';
import { AnalysisProgressController } from './analysis-progress.controller';

@Module({
  controllers: [AnalysisProgressController],
  providers: [AnalysisProgressService],
  exports: [AnalysisProgressService],
})
export class AnalysisModule {}