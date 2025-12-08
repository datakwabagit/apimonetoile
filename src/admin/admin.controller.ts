import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/enums/permission.enum';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(PermissionsGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @Permissions(Permission.VIEW_STATISTICS)
  @ApiOperation({ summary: "Récupérer les statistiques d'administration" })
  @ApiResponse({ status: 200, description: 'Statistiques retournées.' })
  async getStats() {
    const stats = await this.adminService.getStats();
    return stats;
  }
}
