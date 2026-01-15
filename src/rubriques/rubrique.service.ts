import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Rubrique, RubriqueDocument } from './rubrique.schema';
import { RubriqueDto } from './dto/rubrique.dto';
import { ReorderChoicesDto } from './dto/reorder-choices.dto';

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
      const partEnum = ['SOLO', 'AVEC_TIERS', 'GROUPE', 'POUR_TIERS'];
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
      const partEnum = ['SOLO', 'AVEC_TIERS', 'GROUPE', 'POUR_TIERS'];
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

  async reorderChoices(id: string, dto: ReorderChoicesDto) {
    const rubrique = await this.rubriqueModel.findById(id).exec();
    if (!rubrique) throw new NotFoundException('Rubrique non trouvée');

    // Créer une map pour accès rapide aux nouveaux ordres
    const orderMap = new Map(dto.choices.map(c => [c.choiceId, c.order]));

    // Mettre à jour l'ordre de chaque choix
    rubrique.consultationChoices.forEach(choice => {
      const newOrder = orderMap.get(choice._id.toString());
      if (newOrder !== undefined) {
        choice.order = newOrder;
      }
    });

    // Trier les choix par ordre
    rubrique.consultationChoices.sort((a, b) => (a.order || 0) - (b.order || 0));

    return await rubrique.save();
  }
}
