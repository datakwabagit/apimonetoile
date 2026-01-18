import { HttpModule } from '@nestjs/axios';
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SchemaFactory } from '@nestjs/mongoose';
import { AnalysisModule } from '../analysis/analysis.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Notification, NotificationSchema } from '../notifications/schemas/notification.schema';
import { OfferingsModule } from '../offerings/offerings.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ConsultationsController } from './consultations.controller';
import { DeepseekController } from './deepseek.controller';
import { ConsultationsService } from './consultations.service';
import { AnalysisService } from './analysis.service';
import { DeepseekService } from './deepseek.service';
import {
  AstrologicalAnalysis,
  AstrologicalAnalysisSchema,
} from './schemas/astrological-analysis.schema';
import { Consultation, ConsultationSchema } from './schemas/consultation.schema';
import { ConsultationChoice, ConsultationChoiceSchema } from './schemas/consultation-choice.schema';
import { UserConsultationChoice, UserConsultationChoiceSchema } from './schemas/user-consultation-choice.schema';
import { Prompt, PromptSchema } from './schemas/prompt.schema';
import { UserConsultationChoiceService } from './user-consultation-choice.service';
import { UserConsultationChoiceController } from './user-consultation-choice.controller';
import { ConsultationChoiceStatusService } from './consultation-choice-status.service';
import { ConsultationChoiceStatusController } from './consultation-choice-status.controller';
import { ConsultationChoiceService } from './consultation-choice.service';
import { ConsultationChoiceController } from './consultation-choice.controller';
import { PromptService } from './prompt.service';
import { PromptController } from './prompt.controller';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => AnalysisModule),
    OfferingsModule,
    MongooseModule.forFeature([
      { name: Consultation.name, schema: ConsultationSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: AstrologicalAnalysis.name, schema: AstrologicalAnalysisSchema },
      { name: UserConsultationChoice.name, schema: UserConsultationChoiceSchema },
      { name: 'ConsultationChoice', schema: ConsultationChoiceSchema },
      { name: Prompt.name, schema: PromptSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [ConsultationsController, DeepseekController, UserConsultationChoiceController, ConsultationChoiceStatusController, ConsultationChoiceController, PromptController],
  providers: [ConsultationsService, DeepseekService, UserConsultationChoiceService, AnalysisService, ConsultationChoiceStatusService, ConsultationChoiceService, PromptService],
  exports: [ConsultationsService, DeepseekService, UserConsultationChoiceService, AnalysisService, ConsultationChoiceStatusService, ConsultationChoiceService, PromptService],
})
export class ConsultationsModule { }
