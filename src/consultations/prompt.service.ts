import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Prompt, PromptDocument } from './schemas/prompt.schema';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';

@Injectable()
export class PromptService {
  constructor(
    @InjectModel(Prompt.name)
    private promptModel: Model<PromptDocument>,
  ) {}

  async create(createPromptDto: CreatePromptDto): Promise<Prompt> {
    try {
      const prompt = new this.promptModel(createPromptDto);
      return await prompt.save();
    } catch (error: any) {
      if (error.code === 11000) {
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
    const result = await this.promptModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Prompt avec l'ID ${id} introuvable`);
    }
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
