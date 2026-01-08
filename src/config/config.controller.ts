import { Controller, Get, Param } from '@nestjs/common';
import { getDomaines, getConsultationsByDomaine, getConsultationById, getConsultationsBySousRubrique, getPlatformStats } from './config.data';

@Controller('config')
export class ConfigController {
  /**
   * GET /config/domaines
   * Retourne la liste complète des domaines (arborescence complète)
   */
  @Get('domaines')
  getDomaines() {
    return getDomaines();
  }

  /**
   * GET /config/domaines/:domaineId/consultations
   * Retourne toutes les consultations d'un domaine
   */
  @Get('domaines/:domaineId/consultations')
  getConsultationsByDomaine(@Param('domaineId') domaineId: string) {
    return getConsultationsByDomaine(domaineId);
  }

  /**
   * GET /config/sous-rubriques/:sousRubriqueId/consultations
   * Retourne toutes les consultations d'une sous-rubrique
   */
  @Get('sous-rubriques/:sousRubriqueId/consultations')
  getConsultationsBySousRubrique(@Param('sousRubriqueId') sousRubriqueId: string) {
    return getConsultationsBySousRubrique(sousRubriqueId);
  }

  /**
   * GET /config/consultations/:consultationId
   * Retourne le détail d'une consultation
   */
  @Get('consultations/:consultationId')
  getConsultationById(@Param('consultationId') consultationId: string) {
    return getConsultationById(consultationId);
  }

  /**
   * GET /config/stats
   * Statistiques de la plateforme
   */
  @Get('stats')
  getStats() {
    return getPlatformStats();
  }
}
