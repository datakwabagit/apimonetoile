import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateWalletTransactionDto } from './dto/create-wallet-transaction.dto';
import { WalletOfferingsService } from './wallet-offerings.service';
import { ConsumeOfferingsDto } from './dto/consume-offerings.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly walletOfferingsService: WalletOfferingsService,
  ) {}

  @Post('transactions')
  async create(@Body() dto: CreateWalletTransactionDto, @CurrentUser() user: UserDocument) {
    const transaction = await this.walletService.createTransaction({
      ...dto,
      userId: user._id.toString(),
    });
    return { transaction };
  }

  @Post('offerings/add')
  async addOfferings(@Body() dto: CreateWalletTransactionDto, @CurrentUser() user: UserDocument) {
    const transaction = await this.walletService.createTransaction({
      ...dto,
      userId: user._id.toString(),
    });
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
