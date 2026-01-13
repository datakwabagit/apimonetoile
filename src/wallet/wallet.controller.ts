import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateWalletTransactionDto } from './dto/create-wallet-transaction.dto';
import { WalletOfferingsService } from './wallet-offerings.service';
import { ConsumeOfferingsDto } from './dto/consume-offerings.dto';

@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly walletOfferingsService: WalletOfferingsService,
  ) {}

  @Post('transactions')
  async create(@Body() dto: CreateWalletTransactionDto) {
    const transaction = await this.walletService.createTransaction(dto);
    return { transaction };
  }

  @Post('offerings/add')
  async addOfferings(@Body() dto: CreateWalletTransactionDto) {
    const transaction = await this.walletService.createTransaction(dto);
    return { transaction };
  }

  @Get('transactions')
  async findAll(@Query('userId') userId: string) {
    const transactions = await this.walletService.getTransactionsByUser(userId);
    return { transactions };
  }

  @Post('consume-offerings')
  async consumeOfferings(@Body() dto: ConsumeOfferingsDto): Promise<any> {
    return this.walletOfferingsService.consumeOfferings(dto.userId, dto.consultationId, dto.offerings);
  }
}
