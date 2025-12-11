import { Controller, Sse, Param, Logger, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AnalysisProgressService } from './analysis-progress.service';

@Controller('analysis/progress')
export class AnalysisProgressController {
  private readonly logger = new Logger(AnalysisProgressController.name);

  constructor(private readonly progressService: AnalysisProgressService) {}

  /**
   * SSE Endpoint pour streamer la progression d'analyse
   * GET /api/v1/analysis/progress/:consultationId
   */
  @Sse(':consultationId')
  streamProgress(@Param('consultationId') consultationId: string): Observable<MessageEvent> {
    this.logger.log(`📡 Client connecté au stream SSE: ${consultationId}`);
    return this.progressService.createProgressStream(consultationId);
  }
}
