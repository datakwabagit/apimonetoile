import { UsersService } from '@/users/users.service';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
// import { AnalysisModule } from '../analysis/analysis.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Notification, NotificationSchema } from '../notifications/schemas/notification.schema';
import { OfferingsModule } from '../offerings/offerings.module';
import { RubriqueModule } from '../rubriques/rubrique.module';
import { Rubrique, RubriqueSchema } from '../rubriques/rubrique.schema';
import { RubriqueService } from '../rubriques/rubrique.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AnalysisDbService } from './analysis-db.service';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { ConsultationChoiceStatusController } from './consultation-choice-status.controller';
import { ConsultationChoiceStatusService } from './consultation-choice-status.service';
import { ConsultationChoiceController } from './consultation-choice.controller';
import { ConsultationChoiceService } from './consultation-choice.service';
import { ConsultationsController } from './consultations.controller';
import { ConsultationsService } from './consultations.service';
import { DeepseekController } from './deepseek.controller';
import { DeepseekService } from './deepseek.service';
import { Analysis, AnalysisSchema } from './schemas/analysis.schema';
import { ConsultationChoiceSchema } from './schemas/consultation-choice.schema';
import { Consultation, ConsultationSchema } from './schemas/consultation.schema';
import { UserConsultationChoice, UserConsultationChoiceSchema } from './schemas/user-consultation-choice.schema';
import { UserConsultationChoiceController } from './user-consultation-choice.controller';
import { UserConsultationChoiceService } from './user-consultation-choice.service';

@Module({
  imports: [
    HttpModule,
    // forwardRef(() => AnalysisModule),
    OfferingsModule,
    MongooseModule.forFeature([
      { name: Consultation.name, schema: ConsultationSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: UserConsultationChoice.name, schema: UserConsultationChoiceSchema },
      { name: 'ConsultationChoice', schema: ConsultationChoiceSchema },
      { name: User.name, schema: UserSchema },
      { name: Rubrique.name, schema: RubriqueSchema },
      { name: Analysis.name, schema: AnalysisSchema },
    ]),
    NotificationsModule,
    RubriqueModule,
  ],
  controllers: [ConsultationsController, DeepseekController, UserConsultationChoiceController, ConsultationChoiceStatusController, ConsultationChoiceController,  AnalysisController],
  providers: [ConsultationsService, DeepseekService, UserConsultationChoiceService, AnalysisService, AnalysisDbService, ConsultationChoiceStatusService, ConsultationChoiceService,  RubriqueService, UsersService],
  exports: [ConsultationsService, DeepseekService, UserConsultationChoiceService, AnalysisService, AnalysisDbService, ConsultationChoiceStatusService, ConsultationChoiceService, RubriqueService, UsersService],
})
export class ConsultationsModule { }
