import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConsultationsService } from './consultations.service';
import { ConsultationsController } from './consultations.controller';
import { Consultation, ConsultationSchema } from './schemas/consultation.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Consultation.name, schema: ConsultationSchema }]),
    NotificationsModule,
  ],
  controllers: [ConsultationsController],
  providers: [ConsultationsService],
  exports: [ConsultationsService],
})
export class ConsultationsModule {}
