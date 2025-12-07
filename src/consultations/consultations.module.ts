import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConsultationsService } from './consultations.service';
import { ConsultationsController } from './consultations.controller';
import { Consultation, ConsultationSchema } from './schemas/consultation.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { DeepseekService } from './deepseek.service';
import { EmailService } from '../common/services/email.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Consultation.name, schema: ConsultationSchema }]),
    NotificationsModule,
  ],
  controllers: [ConsultationsController],
  providers: [ConsultationsService, DeepseekService, EmailService],
  exports: [ConsultationsService, DeepseekService, EmailService],
})
export class ConsultationsModule {}
