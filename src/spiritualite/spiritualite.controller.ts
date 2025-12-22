import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { SpiritualiteService } from './spiritualite.service';
import { CreateSpiritualPracticeDto } from './dto/create-spiritual-practice.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Public } from '../common/decorators/public.decorator';
import { Permission } from '../common/enums/permission.enum';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('spiritualite')
export class SpiritualiteController {
  constructor(private readonly spiritualiteService: SpiritualiteService) {}

  /**
   * [PUBLIC] Obtenir toutes les pratiques spirituelles publiées
   */
  @Get()
  @Public()
  async findAll() {
    const practices = await this.spiritualiteService.findAll(true);
    return {
      success: true,
      data: practices,
      count: practices.length,
    };
  }

  /**
   * [PUBLIC] Obtenir une pratique par slug
   */
  @Get('slug/:slug')
  @Public()
  async findBySlug(@Param('slug') slug: string) {
    const practice = await this.spiritualiteService.findBySlug(slug);
    return {
      success: true,
      data: practice,
    };
  }

  /**
   * [PUBLIC] Obtenir une pratique par ID
   */
  @Get(':id')
  @Public()
  async findById(@Param('id') id: string) {
    const practice = await this.spiritualiteService.findById(id);
    return {
      success: true,
      data: practice,
    };
  }

  /**
   * [ADMIN] Obtenir toutes les pratiques (publiées + brouillons)
   */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.MANAGE_CONTENT)
  async findAllAdmin() {
    const practices = await this.spiritualiteService.findAll(false);
    return {
      success: true,
      data: practices,
      count: practices.length,
    };
  }

  /**
   * [ADMIN] Créer une nouvelle pratique
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.MANAGE_CONTENT)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createSpiritualPracticeDto: CreateSpiritualPracticeDto) {
    const practice = await this.spiritualiteService.create(createSpiritualPracticeDto);
    return {
      success: true,
      data: practice,
      message: 'Pratique spirituelle créée avec succès',
    };
  }

  /**
   * [ADMIN] Mettre à jour une pratique
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.MANAGE_CONTENT)
  async update(
    @Param('id') id: string,
    @Body() updateSpiritualPracticeDto: Partial<CreateSpiritualPracticeDto>,
  ) {
    const practice = await this.spiritualiteService.update(id, updateSpiritualPracticeDto);
    return {
      success: true,
      data: practice,
      message: 'Pratique spirituelle mise à jour avec succès',
    };
  }

  /**
   * [ADMIN] Supprimer une pratique
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.MANAGE_CONTENT)
  async delete(@Param('id') id: string) {
    const result = await this.spiritualiteService.delete(id);
    return {
      success: true,
      message: result.message,
    };
  }

  /**
   * [ADMIN] Initialiser la base de données avec les pratiques par défaut
   */
  @Post('seed')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.MANAGE_CONTENT)
  async seed() {
    const result = await this.spiritualiteService.seedPractices();
    return {
      success: true,
      ...result,
    };
  }

  /**
   * [ADMIN] Exporter les pratiques au format JSON, SQL ou SCHEMA
   */
  @Get('admin/export/:format')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.MANAGE_CONTENT)
  async export(@Param('format') format: string) {
    let content: string;
    let filename: string;

    switch (format.toLowerCase()) {
      case 'json':
        content = await this.spiritualiteService.exportToJSON();
        filename = 'spiritualite-data.json';
        break;
      case 'sql':
        content = await this.spiritualiteService.generateSQLInsert();
        filename = 'spiritualite-insert.sql';
        break;
      case 'schema':
        content = this.spiritualiteService.getTableSchema();
        filename = 'spiritualite-schema.sql';
        break;
      default:
        return {
          success: false,
          message: 'Format invalide. Utilisez: json, sql ou schema',
        };
    }

    return {
      success: true,
      format,
      filename,
      content,
    };
  }
}
