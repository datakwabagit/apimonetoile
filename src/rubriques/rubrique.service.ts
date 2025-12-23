import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Rubrique, RubriqueDocument } from './rubrique.schema';
import { RubriqueDto } from './dto/rubrique.dto';

@Injectable()
export class RubriqueService {
  constructor(
    @InjectModel(Rubrique.name) private rubriqueModel: Model<RubriqueDocument>,
  ) {}

  async findAll() {
    return this.rubriqueModel.find().exec();
  }

  async findOne(id: string) {
    const rubrique = await this.rubriqueModel.findById(id).exec();
    if (!rubrique) throw new NotFoundException('Rubrique non trouvée');
    return rubrique;
  }

  async create(dto: RubriqueDto) {
    // S'assurer que chaque choix a bien 3 alternatives différentes
    dto.consultationChoices.forEach(choice => {
      const cats = choice.offering.alternatives.map(a => a.category);
      if (
        cats.length !== 3 ||
        !cats.includes('animal') ||
        !cats.includes('vegetal') ||
        !cats.includes('beverage')
      ) {
        throw new Error('Chaque choix doit avoir 3 alternatives différentes : animal, vegetal, beverage');
      }
    });
    return this.rubriqueModel.create(dto);
  }

  async update(id: string, dto: RubriqueDto) {
    return this.rubriqueModel.findByIdAndUpdate(id, dto, { new: true });
  }

  async remove(id: string) {
    const rubrique = await this.rubriqueModel.findByIdAndDelete(id).exec();
    if (!rubrique) throw new NotFoundException('Rubrique non trouvée');
    return { deleted: true };
  }
}
