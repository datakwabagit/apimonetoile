import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WalletTransaction, WalletTransactionDocument } from './schemas/wallet-transaction.schema';
import { CreateWalletTransactionDto } from './dto/create-wallet-transaction.dto';
import { OfferingsService } from '../offerings/offerings.service';
import { BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { OfferingStockService } from '../offerings/offering-stock.service';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(WalletTransaction.name)
    private walletTransactionModel: Model<WalletTransactionDocument>,
    @Inject(forwardRef(() => OfferingsService))
    private offeringsService: OfferingsService,
    @Inject(forwardRef(() => OfferingStockService))
    private offeringStockService: OfferingStockService,
  ) {}

  async createTransaction(dto: CreateWalletTransactionDto): Promise<WalletTransaction> {
   console.log('[WalletService] Création de transaction avec DTO:', JSON.stringify(dto, null, 2));  
   
    // Validation d’intégrité : vérifier que chaque offeringId existe
    const offeringIds = dto.items.map(item => item.offeringId);
    console.log('[WalletService] Vérification des offeringIds:', offeringIds);

    const found = await this.offeringsService['offeringModel'].find({ _id: { $in: offeringIds } }).select('_id').lean();
    const foundIds = found.map((o: any) => o._id.toString());
    const missing = offeringIds.filter(id => !foundIds.includes(id));
    if (missing.length > 0) {
      throw new BadRequestException({
        message: `Offrandes inexistantes: ${missing.join(', ')}`,
        error: 'Bad Request',
        statusCode: 400,
        receivedItems: dto.items,
        expectedField: 'offeringId',
        foundIds,
        offeringIds
      });
    }

    try {
      console.log('[WalletService] Tentative d\'enregistrement:', JSON.stringify(dto, null, 2));
      const created = new this.walletTransactionModel(dto);
      const saved = await created.save();

      // Incrémenter le stock pour chaque item acheté
      for (const item of dto.items) {
        // Récupérer les infos de l'offrande depuis la base
        const offering = await this.offeringsService['offeringModel'].findById(item.offeringId).lean();
        if (!offering) continue;
        await this.offeringStockService.incrementStock(
          new Types.ObjectId(item.offeringId),
          offering.name,
          item.quantity,
          offering.icon,
          offering.category
        );
      }

      console.log('[WalletService] Transaction enregistrée:', saved._id);
      return saved;
    } catch (err) {
      console.error('[WalletService] Erreur lors de l\'enregistrement:', err);
      throw err;
    }
  }

  async getTransactionsByUser(userId: string): Promise<WalletTransaction[]> {
    // Populate items.offeringId with offering details
    return this.walletTransactionModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .populate({
        path: 'items.offeringId',
        model: 'Offering',
        select: 'name icon category price',
      })
      .exec();
  }
}
