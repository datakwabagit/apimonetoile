import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Prompt, PromptDocument } from './schemas/prompt.schema';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import { ConsultationChoice, ConsultationChoiceDocument } from './schemas/consultation-choice.schema';

@Injectable()
export class PromptService {
  constructor(
    @InjectModel(Prompt.name)
    private promptModel: Model<PromptDocument>,
    @InjectModel('ConsultationChoice')
    private consultationChoiceModel: Model<ConsultationChoiceDocument>,
  ) {}

  async create(createPromptDto: CreatePromptDto): Promise<Prompt> {
    try {
      // Vérifier si le choiceId existe
      const choiceExists = await this.consultationChoiceModel.findById(createPromptDto.choiceId).exec();
      if (!choiceExists) {
        throw new BadRequestException(`Choix de consultation avec l'ID ${createPromptDto.choiceId} introuvable`);
      }

      const prompt = new this.promptModel(createPromptDto);
      const savedPrompt = await prompt.save();

      // Mettre à jour le promptId dans ConsultationChoice pour la relation bidirectionnelle
      await this.consultationChoiceModel.findByIdAndUpdate(
        createPromptDto.choiceId,
        { promptId: savedPrompt._id },
        { new: true }
      ).exec();

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
