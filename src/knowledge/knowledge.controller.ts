import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { CreateKnowledgeDto } from './dto/create-knowledge.dto';
import { UpdateKnowledgeDto } from './dto/update-knowledge.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('knowledge')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  /**
   * Créer une nouvelle connaissance (CONSULTANT, ADMIN, SUPER_ADMIN)
   */
  @Post()
  @Roles(Role.CONSULTANT, Role.ADMIN, Role.SUPER_ADMIN)
  create(@CurrentUser() user: any, @Body() createKnowledgeDto: CreateKnowledgeDto) {
    return this.knowledgeService.create(user.sub, createKnowledgeDto);
  }

  /**
   * Récupérer toutes les connaissances publiées (PUBLIC)
   */
  @Get()
  @Public()
  findAll(@Query() query: any) {
    // Pour le public, ne montrer que les connaissances publiées
    return this.knowledgeService.findAll({ ...query, isPublished: true });
  }

  /**
   * Récupérer mes connaissances (brouillons et publiées)
   */
  @Get('my')
  @Roles(Role.CONSULTANT, Role.ADMIN, Role.SUPER_ADMIN)
  findMy(@CurrentUser() user: any, @Query() query: any) {
    return this.knowledgeService.findAll({ ...query, authorId: user.sub });
  }

  /**
   * Récupérer toutes les connaissances (ADMIN) - avec brouillons
   */
  @Get('all')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  findAllAdmin(@Query() query: any) {
    return this.knowledgeService.findAll(query);
  }

  /**
   * Récupérer les connaissances populaires (PUBLIC)
   */
  @Get('popular')
  @Public()
  findPopular(@Query('limit') limit?: number) {
    return this.knowledgeService.findPopular(limit ? +limit : 5);
  }

  /**
   * Récupérer les dernières connaissances (PUBLIC)
   */
  @Get('recent')
  @Public()
  findRecent(@Query('limit') limit?: number) {
    return this.knowledgeService.findRecent(limit ? +limit : 10);
  }

  /**
   * Récupérer une connaissance par ID (PUBLIC)
   */
  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.knowledgeService.findOne(id);
  }

  /**
   * Mettre à jour une connaissance
   */
  @Patch(':id')
  @Roles(Role.CONSULTANT, Role.ADMIN, Role.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateKnowledgeDto: UpdateKnowledgeDto,
  ) {
    return this.knowledgeService.update(id, user.sub, user.role, updateKnowledgeDto);
  }

  /**
   * Supprimer une connaissance
   */
  @Delete(':id')
  @Roles(Role.CONSULTANT, Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.knowledgeService.remove(id, user.sub, user.role);
  }

  /**
   * Aimer/retirer le like d'une connaissance
   */
  @Post(':id/like')
  toggleLike(@Param('id') id: string, @CurrentUser() user: any) {
    return this.knowledgeService.toggleLike(id, user.sub);
  }
}
