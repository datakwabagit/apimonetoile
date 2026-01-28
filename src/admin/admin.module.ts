import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Consultation, ConsultationSchema } from '../consultations/schemas/consultation.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { WalletTransaction, WalletTransactionSchema } from '../wallet/schemas/wallet-transaction.schema';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { HoroscopeController } from './horoscope.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Consultation.name, schema: ConsultationSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
     ]),
  ],
  controllers: [AdminController, HoroscopeController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}