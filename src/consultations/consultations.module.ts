import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SchemaFactory } from '@nestjs/mongoose';
import { AnalysisModule } from '../analysis/analysis.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Notification, NotificationSchema } from '../notifications/schemas/notification.schema';
import { OfferingsModule } from '../offerings/offerings.module';
import { ConsultationsController } from './consultations.controller';
import { DeepseekController } from './deepseek.controller';
import { ConsultationsService } from './consultations.service';
import { AnalysisService } from './analysis.service';
import { DeepseekService } from './deepseek.service';
import {
  AstrologicalAnalysis,
  AstrologicalAnalysisSchema,
} from './schemas/astrological-analysis.schema';
import { Consultation, ConsultationSchema, ConsultationChoice, ConsultationChoiceDocument, ConsultationChoiceDocument as ConsultationChoiceSchema } from './schemas/consultation.schema';
import { UserConsultationChoice, UserConsultationChoiceSchema } from './schemas/user-consultation-choice.schema';
import { UserConsultationChoiceService } from './user-consultation-choice.service';
import { UserConsultationChoiceController } from './user-consultation-choice.controller';

@Module({
  imports: [
    HttpModule,
    AnalysisModule,
    OfferingsModule,
    MongooseModule.forFeature([
      { name: Consultation.name, schema: ConsultationSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: AstrologicalAnalysis.name, schema: AstrologicalAnalysisSchema },
      { name: UserConsultationChoice.name, schema: UserConsultationChoiceSchema },
      { name: 'ConsultationChoice', schema: SchemaFactory.createForClass(ConsultationChoice) },
    ]),
    NotificationsModule,
  ],
  controllers: [ConsultationsController, DeepseekController, UserConsultationChoiceController],
  providers: [ConsultationsService, DeepseekService, UserConsultationChoiceService, AnalysisService],
  exports: [ConsultationsService, DeepseekService, UserConsultationChoiceService, AnalysisService],
})
export class ConsultationsModule { }
