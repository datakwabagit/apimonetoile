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
    return this.rubriqueModel.find().populate('categorieId').exec();
  }

  async findOne(id: string) {
    const rubrique = await this.rubriqueModel.findById(id).populate('categorieId').exec();
    if (!rubrique) throw new NotFoundException('Rubrique non trouvée');
    return rubrique;
  }

  async create(dto: RubriqueDto) {
    // Validation des choix de consultation
    dto.consultationChoices.forEach(choice => {
      // Validation alternatives
      const cats = choice.offering.alternatives.map(a => a.category);
      if (
        cats.length !== 3 ||
        !cats.includes('animal') ||
        !cats.includes('vegetal') ||
        !cats.includes('beverage')
      ) {
        throw new Error('Chaque choix doit avoir 3 alternatives différentes : animal, vegetal, beverage');
      }
      // Validation frequence
      const freqEnum = ['UNE_FOIS_VIE', 'ANNUELLE', 'MENSUELLE', 'QUOTIDIENNE', 'LIBRE'];
      if (choice.frequence && !freqEnum.includes(choice.frequence)) {
        throw new Error(`Fréquence invalide pour le choix ${choice.title}`);
      }
      // Validation participants
      const partEnum = ['SOLO', 'AVEC_TIERS', 'GROUPE'];
      if (choice.participants && !partEnum.includes(choice.participants)) {
        throw new Error(`Participants invalide pour le choix ${choice.title}`);
      }
    });
    return this.rubriqueModel.create(dto);
  }

  async update(id: string, dto: RubriqueDto) {
    // Même validation que pour create
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
      const freqEnum = ['UNE_FOIS_VIE', 'ANNUELLE', 'MENSUELLE', 'QUOTIDIENNE', 'LIBRE'];
      if (choice.frequence && !freqEnum.includes(choice.frequence)) {
        throw new Error(`Fréquence invalide pour le choix ${choice.title}`);
      }
      const partEnum = ['SOLO', 'AVEC_TIERS', 'GROUPE'];
      if (choice.participants && !partEnum.includes(choice.participants)) {
        throw new Error(`Participants invalide pour le choix ${choice.title}`);
      }
    });
    return this.rubriqueModel.findByIdAndUpdate(id, dto, { new: true });
  }

  async remove(id: string) {
    const rubrique = await this.rubriqueModel.findByIdAndDelete(id).exec();
    if (!rubrique) throw new NotFoundException('Rubrique non trouvée');
    return { deleted: true };
  }
}
