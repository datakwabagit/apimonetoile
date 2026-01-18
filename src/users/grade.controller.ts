import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GradeService } from './grade.service';
import {
  GradeProgressDto,
  GradeInfoDto,
  GradeUpdateResponseDto,
} from './dto/grade.dto';

@ApiTags('Grades')
@Controller('grades')
export class GradeController {
  constructor(private readonly gradeService: GradeService) {}

  @Get('info')
  @ApiOperation({ summary: 'Récupérer les informations sur tous les grades' })
  @ApiResponse({
    status: 200,
    description: 'Liste de tous les grades avec leurs exigences',
    type: [GradeInfoDto],
  })
  async getAllGradesInfo(): Promise<GradeInfoDto[]> {
    return this.gradeService.getAllGradesInfo();
  }

  @Get('progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer la progression de l\'utilisateur connecté' })
  @ApiResponse({
    status: 200,
    description: 'Statistiques de progression de l\'utilisateur',
    type: GradeProgressDto,
  })
  async getMyProgress(@Req() req): Promise<GradeProgressDto> {
    return this.gradeService.getProgressStats(req.user._id);
  }

  @Get('progress/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer la progression d\'un utilisateur spécifique' })
  @ApiResponse({
    status: 200,
    description: 'Statistiques de progression de l\'utilisateur',
    type: GradeProgressDto,
  })
  async getUserProgress(@Param('userId') userId: string): Promise<GradeProgressDto> {
    return this.gradeService.getProgressStats(userId);
  }

  @Post('check/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vérifier et mettre à jour le grade d\'un utilisateur' })
  @ApiResponse({
    status: 200,
    description: 'Résultat de la vérification du grade',
    type: GradeUpdateResponseDto,
  })
  async checkGrade(@Param('userId') userId: string): Promise<GradeUpdateResponseDto> {
    return this.gradeService.checkAndUpdateGrade(userId);
  }

  @Patch('increment-consultations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Incrémenter le compteur de consultations de l\'utilisateur connecté',
  })
  @ApiResponse({
    status: 200,
    description: 'Compteur incrémenté avec succès',
  })
  async incrementMyConsultations(@Req() req): Promise<{ success: boolean }> {
    await this.gradeService.incrementConsultations(req.user._id);
    return { success: true };
  }

  @Patch('increment-rituels')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Incrémenter le compteur de rituels de l\'utilisateur connecté',
  })
  @ApiResponse({
    status: 200,
    description: 'Compteur incrémenté avec succès',
  })
  async incrementMyRituels(@Req() req): Promise<{ success: boolean }> {
    await this.gradeService.incrementRituels(req.user._id);
    return { success: true };
  }

  @Patch('increment-books')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Incrémenter le compteur de livres lus de l\'utilisateur connecté',
  })
  @ApiResponse({
    status: 200,
    description: 'Compteur incrémenté avec succès',
  })
  async incrementMyBooks(@Req() req): Promise<{ success: boolean }> {
    await this.gradeService.incrementBooksRead(req.user._id);
    return { success: true };
  }

  @Get('welcome-message')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer le message de bienvenue personnalisé' })
  @ApiResponse({
    status: 200,
    description: 'Message de bienvenue',
  })
  async getWelcomeMessage(@Req() req): Promise<{ message: string }> {
    const message = this.gradeService.getWelcomeMessage(
      req.user.username || req.user.email,
    );
    return { message };
  }
}
