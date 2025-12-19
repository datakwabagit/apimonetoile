import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletController } from './wallet.controller';

import { WalletService } from './wallet.service';
import { WalletOfferingsService } from './wallet-offerings.service';
import { WalletOfferingsController } from './wallet-offerings.controller';
import { WalletTransaction, WalletTransactionSchema } from './schemas/wallet-transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
    ]),
  ],
  controllers: [WalletController, WalletOfferingsController],
  providers: [WalletService, WalletOfferingsService],
  exports: [WalletService, WalletOfferingsService],
})
export class WalletModule {}
