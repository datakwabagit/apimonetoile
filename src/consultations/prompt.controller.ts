import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/enums/permission.enum';
import { PromptService } from './prompt.service';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';

@ApiTags('Prompts')
@Controller('prompts')
@UseGuards(JwtAuthGuard)
export class PromptController {
  constructor(private readonly promptService: PromptService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Créer un nouveau prompt' })
  @ApiResponse({ status: 201, description: 'Prompt créé avec succès.' })
  async create(@Body() createPromptDto: CreatePromptDto) {
     if (!createPromptDto.structure || !Array.isArray(createPromptDto.structure.sections) || createPromptDto.structure.sections.length === 0) {
      throw new Error('Le champ structure.sections doit contenir au moins une section.');
    }
    return this.promptService.create(createPromptDto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_ANY_CONSULTATION)
  @ApiOperation({ summary: 'Récupérer tous les prompts' })
  @ApiResponse({ status: 200, description: 'Liste des prompts retournée.' })
  async findAll() {
    return this.promptService.findAll();
  }

  @Get('active')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_ANY_CONSULTATION)
  @ApiOperation({ summary: 'Récupérer tous les prompts actifs' })
  @ApiResponse({ status: 200, description: 'Liste des prompts actifs retournée.' })
  async findActive() {
    return this.promptService.findActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un prompt par ID' })
  @ApiResponse({ status: 200, description: 'Prompt retourné.' })
  async findById(@Param('id') id: string) {
    return this.promptService.findById(id);
  }

  @Get('by-choice/:choiceId')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_ANY_CONSULTATION)
  @ApiOperation({ summary: 'Récupérer un prompt par choiceId' })
  @ApiResponse({ status: 200, description: 'Prompt retourné.' })
  async findByChoiceId(@Param('choiceId') choiceId: string) {
    return this.promptService.findByChoiceId(choiceId);
  }

  @Patch(':id') 
  @ApiOperation({ summary: 'Mettre à jour un prompt' })
  @ApiResponse({ status: 200, description: 'Prompt mis à jour avec succès.' })
  async update(
    @Param('id') id: string,
    @Body() updatePromptDto: UpdatePromptDto,
  ) {
    return this.promptService.update(id, updatePromptDto);
  }

  @Patch(':id/toggle-active') 
  @ApiOperation({ summary: 'Activer/Désactiver un prompt' })
  @ApiResponse({ status: 200, description: 'Statut du prompt modifié.' })
  async toggleActive(@Param('id') id: string) {
    return this.promptService.toggleActive(id);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.UPDATE_ANY_CONSULTATION)
  @ApiOperation({ summary: 'Supprimer un prompt' })
  @ApiResponse({ status: 200, description: 'Prompt supprimé avec succès.' })
  async delete(@Param('id') id: string) {
    await this.promptService.delete(id);
    return { message: 'Prompt supprimé avec succès' };
  }
}
