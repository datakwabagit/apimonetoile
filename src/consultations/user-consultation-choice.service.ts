import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserConsultationChoice, UserConsultationChoiceDocument } from './schemas/user-consultation-choice.schema';

@Injectable()
export class UserConsultationChoiceService {
  constructor(
    @InjectModel(UserConsultationChoice.name)
    private userConsultationChoiceModel: Model<UserConsultationChoiceDocument>,
  ) {}

  async recordChoicesForConsultation(userId: string, consultationId: string, choices: Array<{ title: string; frequence: string; participants: string }>) {
    const now = new Date();
    const docs = choices.map(choice => ({
      userId,
      consultationId,
      choiceTitle: choice.title,
      frequence: choice.frequence,
      participants: choice.participants,
      createdAt: now,
    }));
    return this.userConsultationChoiceModel.insertMany(docs);
  }

  async getChoicesForUser(userId: string) {
    return this.userConsultationChoiceModel.find({ userId }).exec();
  }
}
