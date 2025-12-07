import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConsultationsService } from './consultations.service';
import { ConsultationsController } from './consultations.controller';
import { Consultation, ConsultationSchema } from './schemas/consultation.schema';
import { DeepseekService } from './deepseek.service';
import { EmailService } from '../common/services/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Notification, NotificationSchema } from '../notifications/schemas/notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Consultation.name, schema: ConsultationSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  controllers: [ConsultationsController],
  providers: [ConsultationsService, DeepseekService, EmailService, NotificationsService],
  exports: [ConsultationsService, DeepseekService, EmailService],
})
export class ConsultationsModule {}
