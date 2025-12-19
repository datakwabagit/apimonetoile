import { Controller, Get, Patch, Post, Body, Query, Param, Req, UseGuards } from '@nestjs/common';
import { WalletOfferingsService } from './wallet-offerings.service';
import { ConsumeOfferingsDto } from './dto/consume-offerings.dto';

@Controller('wallet')
export class WalletOfferingsController {
  constructor(private readonly walletOfferingsService: WalletOfferingsService) {}

  // GET /wallet/offerings?userId=xxx
  @Get('offerings')
  async getOfferings(@Query('userId') userId: string) {
    // En vrai, récupérer userId depuis le token ou session
    const offerings = await this.walletOfferingsService.getUserOfferings(userId);
    return { offerings };
  }

  // POST /wallet/consume-offerings
  @Post('consume-offerings')
  async consumeOfferings(@Body() body: ConsumeOfferingsDto) {
    // En vrai, récupérer userId depuis le token ou session
    // Ici, on suppose userId dans la consultation ou body
    const userId = body.userId || '';
    const result = await this.walletOfferingsService.consumeOfferings(userId, body.consultationId, body.offerings);
    return result;
  }
}
