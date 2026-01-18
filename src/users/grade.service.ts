import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  UserGrade,
  GRADE_ORDER,
  GRADE_REQUIREMENTS,
  GRADE_MESSAGES,
  PROFILE_WELCOME_MESSAGE,
} from '../common/enums/user-grade.enum';

@Injectable()
export class GradeService {
  private readonly logger = new Logger(GradeService.name);

  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  /**
   * Vérifie et met à jour le grade d'un utilisateur en fonction de ses activités
   */
  async checkAndUpdateGrade(userId: string): Promise<{
    updated: boolean;
    oldGrade: UserGrade | null;
    newGrade: UserGrade | null;
    message?: string;
  }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('Utilisateur introuvable');
    }

    const currentGrade = user.grade;
    const newGrade = this.calculateGrade(
      user.consultationsCompleted || 0,
      user.rituelsCompleted || 0,
      user.booksRead || 0,
    );

    // Si le grade n'a pas changé
    if (currentGrade === newGrade) {
      return {
        updated: false,
        oldGrade: currentGrade,
        newGrade: currentGrade,
      };
    }

    // Mise à jour du grade
    user.grade = newGrade;
    user.lastGradeUpdate = new Date();
    await user.save();

    this.logger.log(
      `Grade mis à jour pour l'utilisateur ${userId}: ${currentGrade || 'aucun'} -> ${newGrade}`,
    );

    // Générer le message de félicitations
    const message = this.getGradeMessage(newGrade, user.username || user.email);

    return {
      updated: true,
      oldGrade: currentGrade,
      newGrade,
      message,
    };
  }

  /**
   * Calcule le grade approprié en fonction des activités
   */
  calculateGrade(
    consultations: number,
    rituels: number,
    livres: number,
  ): UserGrade | null {
    // Parcourir les grades dans l'ordre inverse pour trouver le plus haut grade atteint
    for (let i = GRADE_ORDER.length - 1; i >= 0; i--) {
      const grade = GRADE_ORDER[i];
      const requirements = GRADE_REQUIREMENTS[grade];

      if (
        consultations >= requirements.consultations &&
        rituels >= requirements.rituels &&
        livres >= requirements.livres
      ) {
        return grade;
      }
    }

    return null; // Aucun grade atteint
  }

  /**
   * Récupère le message de félicitations pour un grade
   */
  getGradeMessage(grade: UserGrade, userName: string): string {
    const message = GRADE_MESSAGES[grade];
    return message.replace(/{name}/g, userName);
  }

  /**
   * Récupère le message de bienvenue personnalisé
   */
  getWelcomeMessage(userName: string): string {
    return PROFILE_WELCOME_MESSAGE.replace(/{name}/g, userName);
  }

  /**
   * Incrémente le compteur de consultations et vérifie le grade
   */
  async incrementConsultations(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $inc: { consultationsCompleted: 1 },
    });
    await this.checkAndUpdateGrade(userId);
  }

  /**
   * Incrémente le compteur de rituels et vérifie le grade
   */
  async incrementRituels(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $inc: { rituelsCompleted: 1 },
    });
    await this.checkAndUpdateGrade(userId);
  }

  /**
   * Incrémente le compteur de livres lus et vérifie le grade
   */
  async incrementBooksRead(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $inc: { booksRead: 1 },
    });
    await this.checkAndUpdateGrade(userId);
  }

  /**
   * Récupère les statistiques de progression d'un utilisateur
   */
  async getProgressStats(userId: string): Promise<{
    currentGrade: UserGrade | null;
    nextGrade: UserGrade | null;
    consultationsCompleted: number;
    rituelsCompleted: number;
    booksRead: number;
    nextGradeRequirements: {
      consultations: number;
      rituels: number;
      livres: number;
    } | null;
    progress: {
      consultations: number;
      rituels: number;
      livres: number;
    } | null;
  }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('Utilisateur introuvable');
    }

    const currentGrade = user.grade;
    const nextGrade = this.getNextGrade(currentGrade);

    const stats: any = {
      currentGrade,
      nextGrade,
      consultationsCompleted: user.consultationsCompleted || 0,
      rituelsCompleted: user.rituelsCompleted || 0,
      booksRead: user.booksRead || 0,
      nextGradeRequirements: null,
      progress: null,
    };

    if (nextGrade) {
      const requirements = GRADE_REQUIREMENTS[nextGrade];
      stats.nextGradeRequirements = requirements;

      // Calculer le pourcentage de progression pour chaque critère
      stats.progress = {
        consultations: Math.min(
          100,
          Math.round(
            ((user.consultationsCompleted || 0) / requirements.consultations) *
              100,
          ),
        ),
        rituels: Math.min(
          100,
          Math.round(
            ((user.rituelsCompleted || 0) / requirements.rituels) * 100,
          ),
        ),
        livres: Math.min(
          100,
          Math.round(((user.booksRead || 0) / requirements.livres) * 100),
        ),
      };
    }

    return stats;
  }

  /**
   * Retourne le grade suivant
   */
  private getNextGrade(currentGrade: UserGrade | null): UserGrade | null {
    if (!currentGrade) {
      return GRADE_ORDER[0];
    }

    const currentIndex = GRADE_ORDER.indexOf(currentGrade);
    if (currentIndex === -1 || currentIndex === GRADE_ORDER.length - 1) {
      return null; // Dernier grade atteint
    }

    return GRADE_ORDER[currentIndex + 1];
  }

  /**
   * Récupère tous les grades avec leurs exigences
   */
  getAllGradesInfo(): Array<{
    grade: UserGrade;
    level: number;
    requirements: {
      consultations: number;
      rituels: number;
      livres: number;
    };
  }> {
    return GRADE_ORDER.map((grade, index) => ({
      grade,
      level: index + 1,
      requirements: GRADE_REQUIREMENTS[grade],
    }));
  }
}
