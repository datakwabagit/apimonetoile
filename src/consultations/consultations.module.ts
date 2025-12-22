import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ConsultationsService } from './consultations.service';
import { ConsultationsController } from './consultations.controller';
import { Consultation, ConsultationSchema } from './schemas/consultation.schema';
import {
  AstrologicalAnalysis,
  AstrologicalAnalysisSchema,
} from './schemas/astrological-analysis.schema';
import { DeepseekService } from './deepseek.service';
import { EmailService } from '../common/services/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Notification, NotificationSchema } from '../notifications/schemas/notification.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { AnalysisModule } from '../analysis/analysis.module';
import { OfferingsModule } from '../offerings/offerings.module';

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
  controllers: [ConsultationsController],
  providers: [ConsultationsService, DeepseekService, EmailService],
  exports: [ConsultationsService, DeepseekService, EmailService],
})
export class ConsultationsModule {}
