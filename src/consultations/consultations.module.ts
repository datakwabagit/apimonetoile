import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalysisModule } from '../analysis/analysis.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Notification, NotificationSchema } from '../notifications/schemas/notification.schema';
import { OfferingsModule } from '../offerings/offerings.module';
import { ConsultationsController } from './consultations.controller';
import { DeepseekController } from './deepseek.controller';
import { ConsultationsService } from './consultations.service';
import { DeepseekService } from './deepseek.service';
import {
  AstrologicalAnalysis,
  AstrologicalAnalysisSchema,
} from './schemas/astrological-analysis.schema';
import { Consultation, ConsultationSchema } from './schemas/consultation.schema';

@Module({
  imports: [
    HttpModule,
    AnalysisModule,
    OfferingsModule,
    MongooseModule.forFeature([
      { name: Consultation.name, schema: ConsultationSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: AstrologicalAnalysis.name, schema: AstrologicalAnalysisSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [ConsultationsController, DeepseekController],
  providers: [ConsultationsService, DeepseekService],
  exports: [ConsultationsService, DeepseekService],
})
export class ConsultationsModule {}
