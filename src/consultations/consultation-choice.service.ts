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
  ) { }

  async findOneWithPrompt(id: string): Promise<any> {
    // Cherche le choix de consultation par ID
    const choice = await this.consultationChoiceModel.findById(id).exec();
    if (!choice) {
      throw new NotFoundException(`Choix de consultation avec l'ID ${id} introuvable`);
    }
    // Cherche le prompt associé si promptId existe
    let prompt = null;
    if ((choice as any).promptId) {
      const populated = await this.consultationChoiceModel.findById(id).populate('promptId').exec();
      prompt = populated?.promptId || null;
    }
    return {
      _id: choice._id,
      title: choice.title,
      description: choice.description,
      frequence: choice.frequence,
      participants: choice.participants,
      offering: (choice as any)?.offering ?? null,
      order: (choice as any)?.order ?? null,
      rubriqueId: (choice as any)?.rubriqueId ?? null,
      rubriqueTitle: (choice as any)?.rubriqueTitle ?? null,
      promptId: (choice as any)?.promptId || null,
      prompt: prompt,
    };
  }

  async findByIdRaw(id: string): Promise<ConsultationChoice> {
    const choice = await this.consultationChoiceModel.findById(id).exec();
    if (!choice) {
      throw new NotFoundException(`Choix de consultation avec l'ID ${id} introuvable par raw`);
    }
    return choice;
  }

  async findChoiceInRubriquesById(id: string): Promise<any> {
    // Récupérer toutes les rubriques
    const rubriques = await this.rubriqueModel.find().exec();
    for (const rubrique of rubriques) {
      if (rubrique.consultationChoices && rubrique.consultationChoices.length > 0) {
        const found = rubrique.consultationChoices.find((choice: any) => choice._id?.toString() === id);
        if (found) {
          return {
            ...found as any, // conserve _id, title, description, frequence, participants, found,
            rubriqueId: rubrique._id,
            rubriqueTitle: rubrique.titre,
          };
        }
      }
    }
    throw new NotFoundException(`Aucun choix de consultation avec l'ID ${id} trouvé dans les rubriques.`);
  }

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
            promptId: choice.promptId,
            prompt: choice.promptId,
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
