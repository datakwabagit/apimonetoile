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
    const created = new this.walletTransactionModel(dto);
    return created.save();
  }

  async getTransactionsByUser(userId: string): Promise<WalletTransaction[]> {
    return this.walletTransactionModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }
}
