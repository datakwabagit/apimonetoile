import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WalletTransaction, WalletTransactionDocument } from './schemas/wallet-transaction.schema';

@Injectable()
export class WalletOfferingsService {
  constructor(
    @InjectModel(WalletTransaction.name)
    private walletTransactionModel: Model<WalletTransactionDocument>,
  ) {}

  // Retourne les offrandes agrégées du wallet de l'utilisateur
  async getUserOfferings(userId: string) {
    // Agréger toutes les transactions "completed" pour cet utilisateur
    const transactions = await this.walletTransactionModel.find({ userId, status: 'completed' }).exec();
    const offeringsMap: Record<string, number> = {};
    transactions.forEach(tx => {
      tx.items.forEach(item => {
        offeringsMap[item.offeringId] = (offeringsMap[item.offeringId] || 0) + item.quantity;
      });
    });
    // TODO: soustraire les offrandes déjà consommées (si tracking)
    return Object.entries(offeringsMap).map(([offeringId, quantity]) => ({ offeringId, quantity }));
  }

  // Consomme les offrandes pour une consultation
  async consumeOfferings(userId: string, consultationId: string, offerings: Array<{ offeringId: string; quantity: number }>) {
    // TODO: implémenter la logique de consommation et tracking
    // Pour l'exemple, on suppose que la consommation est toujours possible
    // En vrai, il faut vérifier la quantité disponible et enregistrer la consommation
    return { success: true, message: 'Offrandes consommées avec succès' };
  }

  // Statistiques : offrandes les plus achetées et total vendu par élément
  async getOfferingsStats() {
    // Agrège toutes les transactions "completed" et somme les quantités par offeringId
    const stats = await this.walletTransactionModel.aggregate([
      { $match: { status: 'completed' } },
      { $unwind: '$items' },
      { $group: {
        _id: '$items.offeringId',
        totalSold: { $sum: '$items.quantity' },
        transactions: { $sum: 1 }
      }},
      { $sort: { totalSold: -1 } },
    ]);
    return stats;
  }
}
