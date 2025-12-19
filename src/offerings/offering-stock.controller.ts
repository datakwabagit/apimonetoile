import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { OfferingStockService } from './offering-stock.service';
import { Types } from 'mongoose';
import { UserOffering, WalletOfferingsService } from '../wallet/wallet-offerings.service';
import { Inject, forwardRef } from '@nestjs/common';

@Controller('offering-stock')
export class OfferingStockController {
  constructor(
    private readonly offeringStockService: OfferingStockService,
    @Inject(forwardRef(() => WalletOfferingsService))
    private readonly walletOfferingsService: WalletOfferingsService,
  ) {}

  @Post('increment')
  async increment(
    @Body() body: { offeringId: string; name: string; quantity: number; icon?: string; category?: string }
  ) {
    return this.offeringStockService.incrementStock(
      new Types.ObjectId(body.offeringId),
      body.name,
      body.quantity,
      body.icon,
      body.category
    );
  }

  @Post('decrement')
  async decrement(
    @Body() body: { offeringId: string; quantity: number }
  ) {
    return this.offeringStockService.decrementStock(
      new Types.ObjectId(body.offeringId),
      body.quantity
    );
  }

  @Get('available')
  async available(@Query('userId') userId?: string): Promise<UserOffering[]> {
    if (userId) {
      // Récupérer les offrandes disponibles pour l'utilisateur (quantité achetée - consommée)
      const userOfferings = await this.walletOfferingsService.getUserOfferings(userId);
      // On ne retourne que celles où quantity > 0
      return userOfferings.filter(o => o.quantity > 0);
    }
    // return this.offeringStockService.getAvailable();
     return [];
  }

  @Get('all')
  async all() {
    return this.offeringStockService.getAll();
  }
}
