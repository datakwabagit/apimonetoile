import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Prompt, PromptDocument } from './schemas/prompt.schema';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import { ConsultationChoice, ConsultationChoiceDocument } from './schemas/consultation-choice.schema';
import { RubriqueDocument } from '../rubriques/rubrique.schema';

@Injectable()
export class PromptService {
  constructor(
    @InjectModel(Prompt.name)
    private promptModel: Model<PromptDocument>,
    @InjectModel('ConsultationChoice')
    private consultationChoiceModel: Model<ConsultationChoiceDocument>,
    @InjectModel('Rubrique')
    private rubriqueModel: Model<RubriqueDocument>,
  ) {}

  async create(createPromptDto: CreatePromptDto): Promise<Prompt> {
    try {
      const prompt = new this.promptModel(createPromptDto);
      const savedPrompt = await prompt.save();
      console.log('Prompt créé avec succès:', savedPrompt);

      // Mettre à jour le promptId dans ConsultationChoice pour la relation bidirectionnelle
      // await this.consultationChoiceModel.findByIdAndUpdate(
      //   createPromptDto.choiceId,
      //   { promptId: savedPrompt._id },
      //   { new: true }
      // ).exec();

      // Mettre à jour le promptId dans rubrique.consultationChoices
      const rubriques = await this.rubriqueModel.find().exec();
      let rubriqueTrouvee = false;
      for (const rubrique of rubriques) {
        if (Array.isArray(rubrique.consultationChoices) && rubrique.consultationChoices.length > 0) {
          let updated = false;
          rubrique.consultationChoices = rubrique.consultationChoices.map((choice: any) => {
            if (choice._id?.toString() === createPromptDto.choiceId) {
              updated = true;
              console.log('[DEBUG] Mise à jour du promptId pour le choix', choice._id?.toString(), 'dans la rubrique', rubrique._id.toString());
              return { ...choice, promptId: savedPrompt._id };
            }
            return choice;
          });
          if (updated) {
            rubriqueTrouvee = true;
            await rubrique.save();
            console.log('[DEBUG] Rubrique sauvegardée avec succès:', rubrique._id.toString());
            break;
          }
        }
      }
      if (!rubriqueTrouvee) {
        console.warn('[DEBUG] Aucun choix de consultation trouvé dans les rubriques pour l\'ID', createPromptDto.choiceId);
      }
     

      return savedPrompt;
    } catch (error: any) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0];
        if (field === 'choiceId') {
          throw new ConflictException('Ce choix de consultation a déjà un prompt assigné');
        }
        throw new ConflictException('Un prompt avec ce titre existe déjà');
      }
      throw error;
    }
  }

  async findAll(): Promise<Prompt[]> {
    return this.promptModel.find().exec();
  }

  async findActive(): Promise<Prompt[]> {
    return this.promptModel.find({ isActive: true }).exec();
  }

  async findById(id: string): Promise<Prompt> {
    const prompt = await this.promptModel.findById(id).exec();
    if (!prompt) {
      throw new NotFoundException(`Prompt avec l'ID ${id} introuvable`);
    }
    return prompt;
  }

  async findByChoiceId(choiceId: string): Promise<Prompt | null> {
    return this.promptModel.findOne({ choiceId }).exec();
  }

  async update(id: string, updatePromptDto: UpdatePromptDto): Promise<Prompt> {
    try {
      const prompt = await this.promptModel.findByIdAndUpdate(
        id,
        updatePromptDto,
        { new: true, runValidators: true }
      ).exec();
      
      if (!prompt) {
        throw new NotFoundException(`Prompt avec l'ID ${id} introuvable`);
      }
      
      return prompt;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ConflictException('Un prompt avec ce titre existe déjà');
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const prompt = await this.promptModel.findByIdAndDelete(id).exec();
    if (!prompt) {
      throw new NotFoundException(`Prompt avec l'ID ${id} introuvable`);
    }

    // Retirer le promptId du ConsultationChoice
    await this.consultationChoiceModel.findByIdAndUpdate(
      prompt.choiceId,
      { $unset: { promptId: '' } },
      { new: true }
    ).exec();
  }

  async toggleActive(id: string): Promise<Prompt> {
    const prompt = await this.promptModel.findByIdAndUpdate(
      id,
      [{ $set: { isActive: { $not: '$isActive' } } }],
      { new: true, runValidators: true }
    ).exec();
    
    if (!prompt) {
      throw new NotFoundException(`Prompt avec l'ID ${id} introuvable`);
    }
    
    return prompt;
  }
}
