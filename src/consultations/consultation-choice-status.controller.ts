import { Controller, Get, Param, Query } from '@nestjs/common';
import { ConsultationChoiceStatusService } from './consultation-choice-status.service';

@Controller('consultation-choice-status')
export class ConsultationChoiceStatusController {
  constructor(
    private readonly consultationChoiceStatusService: ConsultationChoiceStatusService,
  ) {}

  /**
   * Récupère le statut d'un choix de consultation spécifique pour un utilisateur
   * GET /consultation-choice-status/:userId/:choiceId
   */
  @Get(':userId/:choiceId')
  async getChoiceStatus(
    @Param('userId') userId: string,
    @Param('choiceId') choiceId: string,
  ) {
    return this.consultationChoiceStatusService.getChoiceStatus(userId, choiceId);
  }

  /**
   * Récupère les statuts de tous les choix de consultation pour un utilisateur
   * GET /consultation-choice-status/:userId
   * Query params optionnels:
   * - choiceIds: string[] - Liste des IDs de choix à vérifier (séparés par des virgules)
   */
  @Get(':userId')
  async getUserChoicesStatus(
    @Param('userId') userId: string,
    @Query('choiceIds') choiceIds?: string,
  ) {
    const choiceIdArray = choiceIds ? choiceIds.split(',').filter(id => id.trim()) : undefined;
    return this.consultationChoiceStatusService.getUserChoicesStatus(userId, choiceIdArray);
  }

  /**
   * Récupère les statuts des choix d'une catégorie spécifique
   * GET /consultation-choice-status/:userId/category/:category
   */
  @Get(':userId/category/:category')
  async getUserChoicesStatusByCategory(
    @Param('userId') userId: string,
    @Param('category') category: string,
  ) {
    return this.consultationChoiceStatusService.getUserChoicesStatusByCategory(
      userId,
      category,
    );
  }
}
