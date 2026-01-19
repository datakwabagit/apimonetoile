import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Offering } from './schemas/offering.schema';

@Injectable()
export class OfferingsService {
  constructor(
    @InjectModel(Offering.name) private offeringModel: Model<Offering>,
  ) {}

  async create(data: Partial<Offering>): Promise<Offering> {
    const offering = new this.offeringModel(data);
    return offering.save();
  }
  async findAll(): Promise<Offering[]> {
    return this.offeringModel.find().exec();
  }

  /**
   * Récupère les offrandes par une liste d'IDs
   */
  async findByIds(ids: any[]): Promise<Offering[]> {
    if (!ids || !ids.length) return [];
    // Convertir les IDs en string pour robustesse
    const stringIds = ids.map(id => id?.toString());
    return this.offeringModel.find({ _id: { $in: stringIds } }).exec();
  }

  async findById(id: string): Promise<Offering | null> {
    if (!id) return null;
    return this.offeringModel.findById(id).exec();
  }

  async updateById(id: string, updateData: Partial<Offering>): Promise<Offering | null> {
    if (!id) return null;
    return this.offeringModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async bulkUpdate(offerings: any[]): Promise<void> {
    // Supprimer toutes les offrandes existantes
    await this.offeringModel.deleteMany({});

    // Insérer les nouvelles offrandes, MongoDB générera _id automatiquement
    await this.offeringModel.insertMany(offerings.map(o => {
      const { id, ...rest } = o;
      return rest;
    }));
  }
}
