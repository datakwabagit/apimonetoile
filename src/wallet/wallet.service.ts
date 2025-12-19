import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WalletTransaction, WalletTransactionDocument } from './schemas/wallet-transaction.schema';
import { CreateWalletTransactionDto } from './dto/create-wallet-transaction.dto';
import { OfferingsService } from '../offerings/offerings.service';
import { BadRequestException, forwardRef, Inject } from '@nestjs/common';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(WalletTransaction.name)
    private walletTransactionModel: Model<WalletTransactionDocument>,
    @Inject(forwardRef(() => OfferingsService))
    private offeringsService: OfferingsService,
  ) {}

  async createTransaction(dto: CreateWalletTransactionDto): Promise<WalletTransaction> {
    // Validation d’intégrité : vérifier que chaque offeringId existe
    const offeringIds = dto.items.map(item => item.offeringId);
    const found = await this.offeringsService['offeringModel'].find({ _id: { $in: offeringIds } }).select('_id').lean();
    const foundIds = found.map((o: any) => o._id.toString());
    const missing = offeringIds.filter(id => !foundIds.includes(id));
    if (missing.length > 0) {
      throw new BadRequestException(`Offrandes inexistantes: ${missing.join(', ')}`);
    }

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
