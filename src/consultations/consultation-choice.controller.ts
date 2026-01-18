import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { ConsultationChoiceService } from './consultation-choice.service';

@ApiTags('Consultation Choices')
@Controller('consultation-choices')
export class ConsultationChoiceController {
  constructor(private readonly consultationChoiceService: ConsultationChoiceService) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiOperation({ summary: 'Récupérer tous les choix de consultation' })
  @ApiResponse({ status: 200, description: 'Liste des choix de consultation retournée.' })
  async getAllChoices() {
    return this.consultationChoiceService.findAll();
  }

  @Get('with-prompts')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiOperation({ summary: 'Récupérer tous les choix de consultation avec prompts et rubriques' })
  @ApiResponse({ status: 200, description: 'Liste des choix avec prompts retournée.' })
  async getAllChoicesWithPrompts() {
    return this.consultationChoiceService.findAllWithPrompts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un choix de consultation par ID (public)' })
  @ApiResponse({ status: 200, description: 'Choix de consultation retourné.' })
  async getChoiceById(@Param('id') id: string) {
    return this.consultationChoiceService.findById(id);
  }

  @Patch(':id/prompt')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiOperation({ summary: 'Associer un prompt à un choix de consultation' })
  @ApiResponse({ status: 200, description: 'Prompt associé avec succès.' })
  async updatePrompt(
    @Param('id') id: string,
    @Body() body: { promptId: string | null },
  ) {
    return this.consultationChoiceService.updatePrompt(id, body.promptId);
  }
}
