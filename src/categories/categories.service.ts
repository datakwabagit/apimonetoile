
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Categorie, CategorieDocument } from './categorie.schema';
import { CreateCategorieDto, UpdateCategorieDto } from './categorie.dto';


@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Categorie.name) private categorieModel: Model<CategorieDocument>,
  ) {}

  async findAll() {
    return this.categorieModel.find().populate({ path: 'rubriques', model: 'Rubrique' }).exec();
  }

  async findOne(id: string) {
    const cat = await this.categorieModel.findById(id).populate({ path: 'rubriques', model: 'Rubrique' });
    if (!cat) throw new NotFoundException('Catégorie non trouvée');
    return cat;
  }

  async create(dto: CreateCategorieDto) {
    const created = await this.categorieModel.create({
      ...dto,
      rubriques: dto.rubriques?.map(id => new Types.ObjectId(id)) || [],
    });

    // Mettre à jour le champ categorie des rubriques associées
    if (dto.rubriques && dto.rubriques.length > 0) {
      const rubriqueModel = this.categorieModel.db.model('Rubrique');
      await rubriqueModel.updateMany(
        { _id: { $in: dto.rubriques } },
        { $set: { categorie: created.nom } }
      );
    }
    return created;
  }

  async update(id: string, dto: UpdateCategorieDto) {
    const updated = await this.categorieModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...dto,
          rubriques: dto.rubriques?.map(rid => new Types.ObjectId(rid)),
        },
      },
      { new: true },
    ).populate('rubriques');
    if (!updated) throw new NotFoundException('Catégorie non trouvée');

    // Mettre à jour le champ categorie des rubriques associées
    if (dto.rubriques && dto.rubriques.length > 0) {
      const rubriqueModel = this.categorieModel.db.model('Rubrique');
      await rubriqueModel.updateMany(
        { _id: { $in: dto.rubriques } },
        { $set: { categorie: updated.nom } }
      );
    }
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.categorieModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Catégorie non trouvée');
    return deleted;
  }
}
