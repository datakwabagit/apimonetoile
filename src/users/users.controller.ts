import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { Permission } from '../common/enums/permission.enum';
import { UserDocument } from './schemas/user.schema';

@ApiTags('Utilisateurs')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * POST /users
   * Créer un nouvel utilisateur (admin only)
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un utilisateur', description: 'Crée un nouvel utilisateur (réservé aux admins).' })
  @ApiResponse({ status: 201, description: 'Utilisateur créé.' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /**
   * GET /users
   * Récupérer tous les utilisateurs (admin only)
   */
  @Get()
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Lister les utilisateurs', description: 'Retourne la liste de tous les utilisateurs (admin seulement).' })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs.' })
  @Permissions(Permission.READ_ANY_USER)
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: Role,
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll({ page, limit, role, isActive, search });
  }

  /**
   * GET /users/me
   * Récupérer son propre profil
   */
  @Get('me')
  getMyProfile(@CurrentUser() user: UserDocument) {
    return this.usersService.findOne(user._id.toString());
  }

  /**
   * PATCH /users/me
   * Mettre à jour son propre profil
   */
  @Patch('me')
  updateMyProfile(@CurrentUser() user: UserDocument, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(user._id.toString(), updateUserDto);
  }

  /**
   * PATCH /users/me/password
   * Changer son propre password
   */
  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changeMyPassword(
    @CurrentUser() user: UserDocument,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(user._id.toString(), changePasswordDto);
  }

  /**
   * GET /users/statistics
   * Obtenir les statistiques des utilisateurs (admin only)
   */
  @Get('statistics')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.VIEW_STATISTICS)
  getStatistics() {
    return this.usersService.getStatistics();
  }

  /**
   * GET /users/:id
   * Récupérer un utilisateur par ID
   */
  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_ANY_USER)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /**
   * PATCH /users/:id
   * Mettre à jour un utilisateur (admin only)
   */
  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.UPDATE_ANY_USER)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * PATCH /users/:id/role
   * Assigner un rôle à un utilisateur (admin only)
   */
  @Patch(':id/role')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.MANAGE_ROLES)
  assignRole(@Param('id') id: string, @Body('role') role: Role) {
    return this.usersService.assignRole(id, role);
  }

  /**
   * DELETE /users/:id
   * Supprimer un utilisateur (soft delete)
   */
  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.DELETE_ANY_USER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
  }

  /**
   * DELETE /users/:id/hard
   * Supprimer définitivement un utilisateur (super admin only)
   */
  @Delete(':id/hard')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async hardDelete(@Param('id') id: string) {
    await this.usersService.hardDelete(id);
  }
}
