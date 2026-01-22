import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Rubrique, RubriqueDocument } from './rubrique.schema';
import { RubriqueDto } from './dto/rubrique.dto';
import { ReorderChoicesDto } from './dto/reorder-choices.dto';
import { RubriqueWithChoiceCountDto, ConsultationChoiceWithCountDto } from './dto/rubrique-with-count.dto';
import { UserConsultationChoice, UserConsultationChoiceDocument } from '../consultations/schemas/user-consultation-choice.schema';
import { Consultation, ConsultationDocument } from '../consultations/schemas/consultation.schema';

@Injectable()
export class RubriqueService {
  constructor(
    @InjectModel(Rubrique.name) private rubriqueModel: Model<RubriqueDocument>,
    @InjectModel(UserConsultationChoice.name) private userConsultationChoiceModel: Model<UserConsultationChoiceDocument>,
    @InjectModel(Consultation.name) private consultationModel: Model<ConsultationDocument>,
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

  async getChoicesWithConsultationCount(rubriqueId: string, userId: string): Promise<RubriqueWithChoiceCountDto> {
    const rubrique = await this.rubriqueModel.findById(rubriqueId).populate('categorieId').exec();
    if (!rubrique) throw new NotFoundException('Rubrique non trouvée');

    // Récupérer les comptages de consultations pour chaque choix
    let choicesWithCount: ConsultationChoiceWithCountDto[] = await Promise.all(
      rubrique.consultationChoices.map(async (choice) => {
        const consultationCount = await this.userConsultationChoiceModel.countDocuments({
          userId,
          choiceId: choice._id,
        });

        // Récupère la dernière consultation pour ce choix et cet utilisateur
        const lastConsultation = await this.userConsultationChoiceModel.findOne({
          userId,
          choiceId: choice._id,
        }).sort({ createdAt: -1 }).populate({ path: 'consultationId', model: 'Consultation' }).exec();

        let buttonStatus: 'CONSULTER' | 'RÉPONSE EN ATTENTE' | 'VOIR L\'ANALYSE' = 'CONSULTER';
        if (
          lastConsultation &&
          lastConsultation.consultationId &&
          typeof lastConsultation.consultationId === 'object' &&
          'isPaid' in lastConsultation.consultationId
        ) {
          const c = lastConsultation.consultationId as any;
          if (c.isPaid) {
            if (c.analysisNotified) {
              buttonStatus = 'VOIR L\'ANALYSE';
            } else {
              buttonStatus = 'RÉPONSE EN ATTENTE';
            }
          } else {
            buttonStatus = 'CONSULTER';
          }
        }

        return {
          _id: choice._id,
          title: choice.title,
          description: choice.description,
          frequence: choice.frequence,
          participants: choice.participants,
          order: choice.order,
          offering: choice.offering,
          consultationCount,
          showButtons: choice.frequence !== 'UNE_FOIS_VIE',
          buttonStatus,
        };
      })
    );

    // Trier les choix par ordre croissant
    choicesWithCount = choicesWithCount.sort((a, b) => (a.order || 0) - (b.order || 0));

    return {
      _id: rubrique._id.toString(),
      titre: rubrique.titre,
      description: rubrique.description,
      categorie: rubrique.categorie,
      typeconsultation: rubrique.typeconsultation,
      consultationChoices: choicesWithCount,
    };
  }
}
