import { Controller, Get, Param, Query } from '@nestjs/common';
import { UserConsultationChoiceService } from './user-consultation-choice.service';

@Controller('user-consultation-choices')
export class UserConsultationChoiceController {
  constructor(private readonly userConsultationChoiceService: UserConsultationChoiceService) {}

  @Get('user/:userId')
  async getChoicesForUser(@Param('userId') userId: string) {
    return this.userConsultationChoiceService.getChoicesForUser(userId);
  }

  // Pour filtrer par consultation ou autre critère, ajouter d'autres endpoints ici
}
