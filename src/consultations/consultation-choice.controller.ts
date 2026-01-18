import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/enums/permission.enum';
import { ConsultationChoiceService } from './consultation-choice.service';
import { UpdateChoicePromptDto } from './dto/update-choice-prompt.dto';

@ApiTags('Consultation Choices')
@Controller('consultation-choices')
@UseGuards(JwtAuthGuard)
export class ConsultationChoiceController {
  constructor(private readonly consultationChoiceService: ConsultationChoiceService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_ANY_CONSULTATION)
  @ApiOperation({ summary: 'Récupérer tous les choix de consultation' })
  @ApiResponse({ status: 200, description: 'Liste des choix de consultation retournée.' })
  async getAllChoices() {
    return this.consultationChoiceService.findAll();
  }

  @Get('with-prompts')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_ANY_CONSULTATION)
  @ApiOperation({ summary: 'Récupérer tous les choix de consultation avec prompts et rubriques' })
  @ApiResponse({ status: 200, description: 'Liste des choix avec prompts retournée.' })
  async getAllChoicesWithPrompts() {
    return this.consultationChoiceService.findAllWithPrompts();
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_ANY_CONSULTATION)
  @ApiOperation({ summary: 'Récupérer un choix de consultation par ID' })
  @ApiResponse({ status: 200, description: 'Choix de consultation retourné.' })
  async getChoiceById(@Param('id') id: string) {
    return this.consultationChoiceService.findById(id);
  }

  @Patch(':id/prompt')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.UPDATE_ANY_CONSULTATION)
  @ApiOperation({ summary: 'Associer un prompt à un choix de consultation' })
  @ApiResponse({ status: 200, description: 'Prompt associé avec succès.' })
  async updatePrompt(
    @Param('id') id: string,
    @Body() body: { promptId: string | null },
  ) {
    return this.consultationChoiceService.updatePrompt(id, body.promptId);
  }
}
