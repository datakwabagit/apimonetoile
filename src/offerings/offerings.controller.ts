import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { OfferingsService } from './offerings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('offerings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OfferingsController {
  constructor(private readonly offeringsService: OfferingsService) {}

  @Get()
  async findAll() {
    const offerings = await this.offeringsService.findAll();
    return { offerings };
  }

  @Post('bulk-update')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async bulkUpdate(@Body('offerings') offerings: any[]) {
    await this.offeringsService.bulkUpdate(offerings);
    return { 
      success: true, 
      message: `${offerings.length} offrandes sauvegardées avec succès` 
    };
  }
}
