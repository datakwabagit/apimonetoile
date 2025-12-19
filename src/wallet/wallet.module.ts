import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { WalletOfferingsService } from './wallet-offerings.service';
import { WalletTransaction, WalletTransactionSchema } from './schemas/wallet-transaction.schema';
import { OfferingsModule } from '../offerings/offerings.module';
import { OfferingStockModule } from '@/offerings/offering-stock.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
    ]),
    OfferingsModule,
    OfferingStockModule
  ],
  controllers: [WalletController],
  providers: [WalletService, WalletOfferingsService],
  exports: [WalletService, WalletOfferingsService],
})
export class WalletModule {}
