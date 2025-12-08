import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/enums/permission.enum';
import { AdminService } from './admin.service';
import { Query, UseGuards } from '@nestjs/common';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: "Récupérer les statistiques d'administration" })
  @ApiResponse({ status: 200, description: 'Statistiques retournées.' })
  async getStats() {
    const stats = await this.adminService.getStats();
    return stats;
  }

  @Get('users')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_ANY_USER)
  @ApiOperation({ summary: 'Lister les utilisateurs (admin)' })
  @ApiResponse({ status: 200, description: 'Liste paginée des utilisateurs' })
  async getUsers(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const result = await this.adminService.getUsers({
      search,
      status,
      role,
      page: parseInt(page as string, 10) || 1,
      limit: parseInt(limit as string, 10) || 10,
    });

    return result;
  }
}
