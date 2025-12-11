import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface AnalysisProgressUpdate {
  consultationId: string;
  stage: string;
  stageIndex: number;
  progress: number;
  message: string;
  timestamp: string;
  completed: boolean;
}

interface ProgressSubscriber {
  consultationId: string;
  subject: Subject<AnalysisProgressUpdate>;
}

@Injectable()
export class AnalysisProgressService {
  private readonly logger = new Logger(AnalysisProgressService.name);
  private subscribers: Map<string, ProgressSubscriber[]> = new Map();

  /**
   * Créer un flux SSE pour une consultation
   */
  createProgressStream(consultationId: string): Observable<MessageEvent> {
    const subject = new Subject<AnalysisProgressUpdate>();

    if (!this.subscribers.has(consultationId)) {
      this.subscribers.set(consultationId, []);
    }
    this.subscribers.get(consultationId)!.push({ consultationId, subject });

    this.logger.log(`📡 Nouveau flux SSE créé pour consultation: ${consultationId}`);

    return subject.asObservable().pipe(
      map(
        (update: AnalysisProgressUpdate) =>
          ({
            data: JSON.stringify(update),
            type: 'progress',
          }) as MessageEvent,
      ),
    );
  }

  /**
   * Publier une mise à jour de progression
   */
  publishProgress(update: AnalysisProgressUpdate): void {
    const subscribers = this.subscribers.get(update.consultationId);

    if (!subscribers || subscribers.length === 0) {
      this.logger.warn(`⚠️ Aucun subscriber pour consultation: ${update.consultationId}`);
      return;
    }

    this.logger.log(
      `📤 Publication progression: ${update.consultationId} - ${update.progress}% - ${update.message}`,
    );

    subscribers.forEach(({ subject }) => {
      subject.next(update);
    });

    if (update.completed) {
      setTimeout(() => {
        this.cleanupSubscribers(update.consultationId);
      }, 5000);
    }
  }

  /**
   * Nettoyer les subscribers d'une consultation
   */
  private cleanupSubscribers(consultationId: string): void {
    const subscribers = this.subscribers.get(consultationId);

    if (subscribers) {
      subscribers.forEach(({ subject }) => {
        subject.complete();
      });
      this.subscribers.delete(consultationId);
      this.logger.log(`🧹 Subscribers nettoyés pour consultation: ${consultationId}`);
    }
  }

  /**
   * Fermer un subscriber spécifique
   */
  closeSubscriber(consultationId: string): void {
    this.cleanupSubscribers(consultationId);
  }
}
