import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConsultationChoice, ConsultationChoiceDocument } from './schemas/consultation-choice.schema';
import { Rubrique, RubriqueDocument } from '../rubriques/rubrique.schema';

@Injectable()
export class ConsultationChoiceService {
  constructor(
    @InjectModel('ConsultationChoice')
    private consultationChoiceModel: Model<ConsultationChoiceDocument>,
    @InjectModel(Rubrique.name)
    private rubriqueModel: Model<RubriqueDocument>,
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

  async findAllWithPrompts(): Promise<any[]> {
    // Récupérer toutes les rubriques avec leurs choix
    const rubriques = await this.rubriqueModel.find().populate('categorieId').exec();
    
    // Extraire tous les choix de toutes les rubriques
    const allChoices: any[] = [];
    
    for (const rubrique of rubriques) {
      if (rubrique.consultationChoices && rubrique.consultationChoices.length > 0) {
        for (const choice of rubrique.consultationChoices) {
          // Récupérer le prompt associé depuis ConsultationChoice si promptId existe
          const choiceWithPrompt: any = {
            _id: choice._id,
            title: choice.title,
            description: choice.description,
            frequence: choice.frequence,
            participants: choice.participants,
            offering: choice.offering,
            order: choice.order,
            rubriqueId: rubrique._id,
            rubriqueTitle: rubrique.titre,
            promptId: null,
            prompt: null,
          };

          // Chercher si ce choix a un prompt dans la collection ConsultationChoice
          const consultationChoice = await this.consultationChoiceModel
            .findById(choice._id)
            .populate('promptId')
            .exec();

          if (consultationChoice?.promptId) {
            choiceWithPrompt.promptId = consultationChoice.promptId;
            choiceWithPrompt.prompt = consultationChoice.promptId;
          }

          allChoices.push(choiceWithPrompt);
        }
      }
    }
    
    return allChoices;
  }
}
