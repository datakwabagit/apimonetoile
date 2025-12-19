import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WalletTransaction, WalletTransactionDocument } from './schemas/wallet-transaction.schema';
import { CreateWalletTransactionDto } from './dto/create-wallet-transaction.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(WalletTransaction.name)
    private walletTransactionModel: Model<WalletTransactionDocument>,
  ) {}

  async createTransaction(dto: CreateWalletTransactionDto): Promise<WalletTransaction> {
    try {
      console.log('[WalletService] Tentative d\'enregistrement:', JSON.stringify(dto, null, 2));
      const created = new this.walletTransactionModel(dto);
      const saved = await created.save();
      console.log('[WalletService] Transaction enregistrée:', saved._id);
      return saved;
    } catch (err) {
      console.error('[WalletService] Erreur lors de l\'enregistrement:', err);
      throw err;
    }
  }

  async getTransactionsByUser(userId: string): Promise<WalletTransaction[]> {
    return this.walletTransactionModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }
}
