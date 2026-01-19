import { Controller, Get, Post, Put, Body, UseGuards, Param, NotFoundException } from '@nestjs/common';
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

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const offering = await this.offeringsService.findById(id);
    if (!offering) {
      throw new NotFoundException('Offrande non trouvée');
    }
    return offering;
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

  @Put(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateData: any
  ) {
    const updated = await this.offeringsService.updateById(id, updateData);
    if (!updated) {
      throw new NotFoundException('Offrande non trouvée');
    }
    return { success: true, offering: updated };
  }
}
