import { Injectable, Inject, forwardRef, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WalletTransaction, WalletTransactionDocument } from './schemas/wallet-transaction.schema';
import { OfferingStockService } from '../offerings/offering-stock.service';

interface OfferingItem {
  offeringId: string | Types.ObjectId | any;
  quantity: number;
}

export interface UserOffering {
  offeringId: string;
  quantity: number;
  offering?: any;
}

interface OfferingStats {
  _id: Types.ObjectId;
  totalSold: number;
  transactions: number;
}

interface ConsumptionResult {
  success: boolean;
  message: string;
  consumedOfferings: Array<{
    offeringId: string;
    quantity: number;
    remainingQuantity?: number;
  }>;
}

@Injectable()
export class WalletOfferingsService {
  constructor(
    @InjectModel(WalletTransaction.name)
    private walletTransactionModel: Model<WalletTransactionDocument>,
    @Inject(forwardRef(() => OfferingStockService))
    private offeringStockService: OfferingStockService,
  ) {}

  /**
   * Retourne les offrandes agrégées du wallet de l'utilisateur
   * @param userId - ID de l'utilisateur
   * @returns Liste des offrandes avec quantités
   */
  async getUserOfferings(userId: string): Promise<UserOffering[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID utilisateur invalide');
    }

    // Agréger toutes les transactions "completed" pour cet utilisateur
    const transactions = await this.walletTransactionModel
      .find({ 
        userId: new Types.ObjectId(userId), 
        status: 'completed' 
      })
      .populate({
        path: 'items.offeringId',
        model: 'Offering',
        select: 'name icon category price description isActive',
      })
      .sort({ createdAt: -1 })
      .exec();

    // Regrouper les offrandes par ID avec somme des quantités
    const offeringsMap = new Map<string, { quantity: number; offering: any }>();

    transactions.forEach(transaction => {
      if (!transaction.items || !Array.isArray(transaction.items)) {
        return;
      }

      transaction.items.forEach(item => {
        if (!item.offeringId || !item.quantity || item.quantity <= 0) {
          return;
        }

        // Normaliser l'ID de l'offrande
        const offeringId = this.normalizeOfferingId(item.offeringId);
        
        if (!offeringId) {
          return;
        }

        const current = offeringsMap.get(offeringId);
        const offeringData = this.extractOfferingData(item.offeringId);

        if (current) {
          current.quantity += item.quantity;
        } else {
          offeringsMap.set(offeringId, {
            quantity: item.quantity,
            offering: offeringData,
          });
        }
      });
    });

    // Convertir en tableau et filtrer
    const result = Array.from(offeringsMap.entries())
      .map(([offeringId, data]) => ({
        offeringId,
        quantity: data.quantity,
        offering: data.offering,
      }))
      .filter(item => 
        item.quantity > 0 && 
        item.offering && 
        item.offering.isActive !== false // Exclure les offrandes inactives
      )
      .sort((a, b) => b.quantity - a.quantity); // Tri par quantité décroissante

    return result;
  }

  /**
   * Consomme les offrandes pour une consultation
   * @param userId - ID de l'utilisateur
   * @param consultationId - ID de la consultation
   * @param offerings - Liste des offrandes à consommer
   * @returns Résultat de la consommation
   */
  async consumeOfferings(
    userId: string, 
    consultationId: string, 
    offerings: Array<{ offeringId: string; quantity: number }>
  ): Promise<ConsumptionResult> {
    // Validation des paramètres
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID utilisateur invalide');
    }
    if (!Types.ObjectId.isValid(consultationId)) {
      throw new BadRequestException('ID consultation invalide');
    }
    if (!Array.isArray(offerings) || offerings.length === 0) {
      throw new BadRequestException('Liste d\'offrandes invalide');
    }

    // Vérifier que l'utilisateur possède suffisamment d'offrandes
    const userOfferings = await this.getUserOfferings(userId);
    const consumedItems = [];

    for (const requestedItem of offerings) {
      if (!Types.ObjectId.isValid(requestedItem.offeringId)) {
        throw new BadRequestException(`ID offrande invalide: ${requestedItem.offeringId}`);
      }
      if (requestedItem.quantity <= 0) {
        throw new BadRequestException(`Quantité invalide pour l'offrande ${requestedItem.offeringId}`);
      }

      const userOffering = userOfferings.find(
        item => item.offeringId === requestedItem.offeringId.toString()
      );

      if (!userOffering) {
        throw new BadRequestException(
          `Offrande ${requestedItem.offeringId} non trouvée dans le wallet`
        );
      }

      if (userOffering.quantity < requestedItem.quantity) {
        throw new BadRequestException(
          `Quantité insuffisante pour l'offrande ${requestedItem.offeringId}. ` +
          `Possédé: ${userOffering.quantity}, Demandé: ${requestedItem.quantity}`
        );
      }

      consumedItems.push({
        offeringId: requestedItem.offeringId,
        quantity: requestedItem.quantity,
      });
    }

    // Vérifier que la consultation n'a pas déjà consommé des offrandes
    const existingConsumption = await this.walletTransactionModel.findOne({
      consultationId,
      type: 'consumption',
    });

    if (existingConsumption) {
      throw new BadRequestException('Cette consultation a déjà consommé des offrandes');
    }

    try {
      // Créer une transaction de consommation
      const consumptionTransaction = await this.walletTransactionModel.create({
        userId: new Types.ObjectId(userId),
        consultationId: new Types.ObjectId(consultationId),
        type: 'consumption',
        status: 'completed',
        items: consumedItems.map(item => ({
          offeringId: new Types.ObjectId(item.offeringId),
          quantity: item.quantity,
        })),
        totalAmount: 0, // Pas de valeur monétaire pour la consommation
        createdAt: new Date(),
      });

      // Décrémenter le stock pour chaque offrande consommée
      const stockResults = [];
      for (const item of consumedItems) {
        const stockResult = await this.offeringStockService.decrementStock(
          new Types.ObjectId(item.offeringId), 
          item.quantity
        );
        stockResults.push({
          offeringId: item.offeringId,
          quantity: item.quantity,
          remainingQuantity: stockResult.remainingQuantity,
        });
      }

      return {
        success: true,
        message: 'Offrandes consommées avec succès',
        consumedOfferings: stockResults,
      };
    } catch (error) {
      throw new BadRequestException(`Erreur lors de la consommation des offrandes: ${error.message}`);
    }
  }

  /**
   * Récupère les statistiques des offrandes vendues
   * @returns Statistiques des ventes d'offrandes
   */
  async getOfferingsStats(): Promise<OfferingStats[]> {
    try {
      const stats = await this.walletTransactionModel.aggregate([
        // Filtrer uniquement les transactions d'achat complétées
        { 
          $match: { 
            status: 'completed',
            type: { $in: ['purchase', 'refund'] } // Inclure les remboursements
          } 
        },
        // Déplier les items
        { $unwind: '$items' },
        // Grouper par offrande avec ajustement pour les remboursements
        {
          $group: {
            _id: '$items.offeringId',
            totalSold: {
              $sum: {
                $cond: [
                  { $eq: ['$type', 'refund'] },
                  { $multiply: ['$items.quantity', -1] }, // Négatif pour les remboursements
                  '$items.quantity'
                ]
              }
            },
            purchaseCount: {
              $sum: { $cond: [{ $ne: ['$type', 'refund'] }, 1, 0] }
            },
            refundCount: {
              $sum: { $cond: [{ $eq: ['$type', 'refund'] }, 1, 0] }
            },
            totalRevenue: {
              $sum: {
                $cond: [
                  { $ne: ['$type', 'refund'] },
                  { $multiply: ['$items.quantity', '$items.unitPrice'] },
                  0
                ]
              }
            },
          }
        },
        // S'assurer que totalSold est positif
        {
          $match: {
            totalSold: { $gt: 0 }
          }
        },
        // Trier par quantité vendue décroissante
        { $sort: { totalSold: -1 } },
        // Formater la réponse
        {
          $project: {
            _id: 1,
            totalSold: 1,
            purchaseCount: 1,
            refundCount: 1,
            totalRevenue: 1,
            netSold: { $subtract: ['$purchaseCount', '$refundCount'] }
          }
        }
      ]);

      return stats;
    } catch (error) {
      throw new BadRequestException(`Erreur lors de la récupération des statistiques: ${error.message}`);
    }
  }

  /**
   * Récupère les offrandes consommées pour une consultation
   * @param consultationId - ID de la consultation
   * @returns Liste des offrandes consommées
   */
  async getConsultationConsumedOfferings(consultationId: string): Promise<any[]> {
    if (!Types.ObjectId.isValid(consultationId)) {
      throw new BadRequestException('ID consultation invalide');
    }

    const consumption = await this.walletTransactionModel
      .findOne({
        consultationId: new Types.ObjectId(consultationId),
        type: 'consumption',
        status: 'completed',
      })
      .populate({
        path: 'items.offeringId',
        model: 'Offering',
        select: 'name icon category',
      })
      .exec();

    return consumption?.items || [];
  }

  /**
   * Normalise l'ID d'une offrande
   * @param offeringId - ID à normaliser
   * @returns ID normalisé sous forme de chaîne
   */
  private normalizeOfferingId(offeringId: any): string | null {
    if (!offeringId) return null;

    if (typeof offeringId === 'string' && Types.ObjectId.isValid(offeringId)) {
      return offeringId;
    }

    if (offeringId instanceof Types.ObjectId) {
      return offeringId.toString();
    }

    if (typeof offeringId === 'object' && offeringId._id) {
      return offeringId._id.toString();
    }

    return null;
  }

  /**
   * Extrait les données d'une offrande
   * @param offeringData - Données de l'offrande
   * @returns Données nettoyées de l'offrande
   */
  private extractOfferingData(offeringData: any): any | null {
    if (!offeringData) return null;

    if (typeof offeringData === 'object' && offeringData._id) {
      return {
        _id: offeringData._id,
        name: offeringData.name,
        icon: offeringData.icon,
        category: offeringData.category,
        price: offeringData.price,
        description: offeringData.description,
        isActive: offeringData.isActive !== false,
      };
    }

    return null;
  }
}