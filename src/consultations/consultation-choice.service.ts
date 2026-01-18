import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConsultationChoice, ConsultationChoiceDocument } from './schemas/consultation-choice.schema';

@Injectable()
export class ConsultationChoiceService {
  constructor(
    @InjectModel('ConsultationChoice')
    private consultationChoiceModel: Model<ConsultationChoiceDocument>,
  ) {}

  async findAll(): Promise<ConsultationChoice[]> {
    return this.consultationChoiceModel.find().populate('promptId').exec();
  }

  async findById(id: string): Promise<ConsultationChoice> {
    const choice = await this.consultationChoiceModel.findById(id).populate('promptId').exec();
    if (!choice) {
      throw new NotFoundException(`Choix de consultation avec l'ID ${id} introuvable`);
    }
    return choice;
  }

  async updatePrompt(id: string, promptId: string | null | undefined): Promise<ConsultationChoice> {
    const choice = await this.consultationChoiceModel.findByIdAndUpdate(
      id,
      { promptId: promptId || null },
      { new: true, runValidators: true }
    ).populate('promptId').exec();
    
    if (!choice) {
      throw new NotFoundException(`Choix de consultation avec l'ID ${id} introuvable`);
    }
    
    return choice;
  }
}
