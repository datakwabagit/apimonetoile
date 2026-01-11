import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserConsultationChoice, UserConsultationChoiceDocument } from './schemas/user-consultation-choice.schema';

@Injectable()
export class UserConsultationChoiceService {
  constructor(
    @InjectModel(UserConsultationChoice.name)
    private userConsultationChoiceModel: Model<UserConsultationChoiceDocument>,
  ) {}

  async recordChoicesForConsultation(userId: string, consultationId: string, choices: Array<{ title: string; choiceId?: string; frequence: string; participants: string }>) {
    const now = new Date();
    const docs = choices.map(choice => ({
      userId,
      consultationId,
      choiceTitle: choice.title,
      choiceId: choice.choiceId,
      frequence: choice.frequence,
      participants: choice.participants,
      createdAt: now,
    }));
    return this.userConsultationChoiceModel.insertMany(docs);
  }

  async getChoicesForUser(userId: string) {
    return this.userConsultationChoiceModel.find({ userId }).exec();
  }

    // Retourne la liste des choiceId déjà exécutés pour un utilisateur (optionnellement filtré par consultationId)
    async getExecutedChoiceIds(userId: string, consultationId?: string): Promise<string[]> {
      const filter: any = { userId };
      if (consultationId) filter.consultationId = consultationId;
      const docs = await this.userConsultationChoiceModel.find(filter, { choiceId: 1, _id: 0 }).exec();
      return docs.map(doc => doc.choiceId);
    }
}
