import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateWalletTransactionDto } from './dto/create-wallet-transaction.dto';

@Controller('wallet/transactions')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  async create(@Body() dto: CreateWalletTransactionDto) {
    console.log('[WalletController] Création de transaction:', dto);
    const transaction = await this.walletService.createTransaction(dto);
    return { transaction };
  }

  @Get()
  async findAll(@Query('userId') userId: string) {
    const transactions = await this.walletService.getTransactionsByUser(userId);
    return { transactions };
  }
}
