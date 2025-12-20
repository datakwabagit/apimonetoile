import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Consultation, ConsultationSchema } from '../consultations/schemas/consultation.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { WalletTransaction, WalletTransactionSchema } from '../wallet/schemas/wallet-transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Consultation.name, schema: ConsultationSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
