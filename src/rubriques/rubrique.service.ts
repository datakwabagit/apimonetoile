import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Consultation, ConsultationDocument } from '../consultations/schemas/consultation.schema';
import { UserConsultationChoice, UserConsultationChoiceDocument } from '../consultations/schemas/user-consultation-choice.schema';
import { ReorderChoicesDto } from './dto/reorder-choices.dto';
import { ConsultationChoiceWithCountDto, RubriqueWithChoiceCountDto } from './dto/rubrique-with-count.dto';
import { RubriqueDto } from './dto/rubrique.dto';
import { ConsultationChoice, Rubrique, RubriqueDocument } from './rubrique.schema';

@Injectable()
export class RubriqueService {
  constructor(
    @InjectModel(Rubrique.name) private rubriqueModel: Model<RubriqueDocument>,
    @InjectModel(UserConsultationChoice.name) private userConsultationChoiceModel: Model<UserConsultationChoiceDocument>,
    @InjectModel(Consultation.name) private consultationModel: Model<ConsultationDocument>,
  ) { }

  async findAll() {
    return this.rubriqueModel.find().populate('categorieId').lean().exec();
  }

  async findOne(id: string) {
    const rubrique = await this.rubriqueModel.findById(id).populate('categorieId').lean().exec();
    if (!rubrique) throw new NotFoundException('Rubrique non trouvée');
    return rubrique;
  }

  async create(dto: RubriqueDto) {
    // Validation et nettoyage des choix de consultation
    dto.consultationChoices = dto.consultationChoices.map(choice => {
      // Nettoyage et validation de l'objet offering
      let offering = choice.offering;
      if (Array.isArray(offering)) {
        offering = { alternatives: offering };
      }
      if (!offering || !Array.isArray(offering.alternatives)) {
        throw new Error(`L'objet 'offering' du choix '${choice.title}' est mal formé.`);
      }
      // Nettoyage des alternatives : on retire _id de chaque alternative
      const alternatives = offering.alternatives.map(({ category, offeringId, quantity }) => ({ category, offeringId, quantity }));
      // Validation alternatives
      const cats = alternatives.map(a => a.category);
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
      let frequence = choice.frequence;
      if (!frequence || !freqEnum.includes(frequence)) {
        frequence = 'LIBRE';
      }
      // Validation participants
      const partEnum = ['SOLO', 'AVEC_TIERS', 'GROUPE', 'POUR_TIERS'];
      if (choice.participants && !partEnum.includes(choice.participants)) {
        throw new Error(`Participants invalide pour le choix ${choice.title}`);
      }
      // Nettoyage strict des propriétés non attendues (pas de _id, choiceId, etc.)
      return {
        promptId: choice.promptId,
        title: choice.title,
        description: choice.description,
        frequence,
        participants: choice.participants,
        order: choice.order,
        offering: { alternatives }
      };
    });
    return this.rubriqueModel.create(dto);
  }

  cleanConsultationChoices(choices: any[]): ConsultationChoice[] {
    return choices.map(choice => ({
      _id: choice._id,
      promptId: choice.promptId,
      title: choice.title,
      description: choice.description,
      order: choice.order,
      frequence: choice.frequence,
      participants: choice.participants,
      offering: {
        alternatives: (choice.offering?.alternatives || []).map((alt: any) => ({
          _id: alt._id,
          category: alt.category,
          offeringId: alt.offeringId,
          quantity: alt.quantity,
        })),
      },
    }));
  }

  async update(id: string, dto: RubriqueDto) {
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

  async getChoicesWithConsultationCount2(rubriqueId: string, userId: string): Promise<RubriqueWithChoiceCountDto> {
    const rubrique = await this.rubriqueModel.findById(rubriqueId).populate('categorieId').exec();
    if (!rubrique) throw new NotFoundException('Rubrique non trouvée');

    // Sécurise la liste des choix
    const consultationChoices = Array.isArray(rubrique.consultationChoices) ? rubrique.consultationChoices : [];
console.log("consultationChoices", consultationChoices);
    let choicesWithCount: ConsultationChoiceWithCountDto[] = await Promise.all(
      consultationChoices.map(async (choice) => {
        // Sécurise les champs essentiels
        const choiceId = choice._id?.toString?.() || choice._id || null;
        const order = typeof choice.order === 'number' ? choice.order : 0;
        const title = choice.title || '';
        const description = choice.description || '';
        const frequence = choice.frequence || 'LIBRE';
        const participants = choice.participants || null;
        const offering = choice.offering || {};

        // Compte le nombre de consultations pour ce choix
        const consultationCount = await this.userConsultationChoiceModel.countDocuments({
          userId,
          choiceId: choiceId,
        });

        // Récupère la dernière consultation pour ce choix et cet utilisateur
        const lastConsultation = await this.userConsultationChoiceModel.findOne({
          userId,
          choiceId: choiceId,
        })
          .sort({ createdAt: -1 })
          .populate({ path: 'consultationId', model: 'Consultation' })
          .exec();

        // Statut du bouton
        let buttonStatus: 'CONSULTER' | 'RÉPONSE EN ATTENTE' | 'VOIR L\'ANALYSE' = 'CONSULTER';
        let consultationId: string | null = null;

        if (lastConsultation && lastConsultation.consultationId && typeof lastConsultation.consultationId === 'object') {
         console.log("lastConsultation.consultationId", lastConsultation);
          const c = lastConsultation.consultationId as any;
          consultationId = lastConsultation._id?.toString?.() || null;
          if (c.status === 'COMPLETED') {
            buttonStatus = 'VOIR L\'ANALYSE';
          } else if (c.status && c.status !== 'COMPLETED') {
            buttonStatus = !c.analysisNotified ? 'RÉPONSE EN ATTENTE' : 'RÉPONSE EN ATTENTE';
          }
        }

        return {
          _id: choiceId,
          title,
          description,
          frequence,
          participants,
          order,
          offering,
          consultationCount,
          showButtons: frequence !== 'UNE_FOIS_VIE',
          buttonStatus,
          consultationId,
        };
      })
    );

    // Trie les choix par ordre croissant (robuste)
    choicesWithCount = choicesWithCount.sort((a, b) => (a.order || 0) - (b.order || 0));
console.log("choicesWithCount", choicesWithCount);
    return {
      _id: rubrique._id && typeof rubrique._id !== 'string' && rubrique._id.toString ? rubrique._id.toString() : String(rubrique._id),
      titre: rubrique.titre || '',
      description: rubrique.description || '',
      categorie: rubrique.categorie,
      typeconsultation: rubrique.typeconsultation,
      consultationChoices: choicesWithCount,
    };
  }











 



// Helper: transforme une valeur (ObjectId | string | objet populate) en string id
  toIdString(v: unknown): string | null {
  if (!v) return null;

  if (typeof v === 'string') return v;

  if (typeof v === 'object') {
    const anyV = v as any;

    // populate: { _id: ... }
    if (anyV._id?.toString) return anyV._id.toString();

    // ObjectId direct
    if (anyV.toString) return anyV.toString();
  }

  return null;
}

// Helper: récupère status / analysisNotified uniquement si consultationId est populated
  getConsultationMeta(v: unknown): { status?: string; analysisNotified?: boolean } {
  if (!v || typeof v !== 'object') return {};
  const anyV = v as any;
  // si ce n'est pas une consultation peuplée, ces champs n'existent pas
  return {
    status: typeof anyV.status === 'string' ? anyV.status : undefined,
    analysisNotified: typeof anyV.analysisNotified === 'boolean' ? anyV.analysisNotified : undefined,
  };
}

  async getChoicesWithConsultationCount(
  rubriqueId: string,
  userId: string,
): Promise<RubriqueWithChoiceCountDto> {

type ButtonStatus = 'CONSULTER' | 'RÉPONSE EN ATTENTE' | "VOIR L'ANALYSE";

  const rubrique = await this.rubriqueModel
    .findById(rubriqueId)
    .populate('categorieId')
    .exec();

  if (!rubrique) throw new NotFoundException('Rubrique non trouvée');

  const consultationChoices = Array.isArray(rubrique.consultationChoices)
    ? rubrique.consultationChoices
    : [];

  let choicesWithCount: ConsultationChoiceWithCountDto[] = await Promise.all(
    consultationChoices.map(async (choice) => {
      // Champs sécurisés
      const choiceId = this.toIdString((choice as any)?._id) ?? null;
      const order = typeof (choice as any)?.order === 'number' ? (choice as any).order : 0;
      const title = (choice as any)?.title ?? '';
      const description = (choice as any)?.description ?? '';
      const frequence = (choice as any)?.frequence ?? 'LIBRE';
      const participants = (choice as any)?.participants ?? null;
      const offering = (choice as any)?.offering ?? {};

      // Si pas d'id de choix: on renvoie un objet cohérent (évite crash)
      if (!choiceId) {
        return {
          _id: null,
          title,
          description,
          frequence,
          participants,
          order,
          offering,
          consultationCount: 0,
          showButtons: frequence !== 'UNE_FOIS_VIE',
          buttonStatus: 'CONSULTER' as ButtonStatus,
          consultationId: null,
        };
      }

      // Compte le nombre de consultations associées à ce choix (user + choice)
      const consultationCount = await this.userConsultationChoiceModel.countDocuments({
        userId,
        choiceId,
      });

      // Dernière liaison (user + choice) => consultation la plus récente pour ce choix
      // IMPORTANT: on veut le consultationId (de Consultation) pas le _id du lien
      const lastLink = await this.userConsultationChoiceModel
        .findOne({ userId, choiceId })
        .sort({ createdAt: -1 })
        .populate({
          path: 'consultationId',
          model: 'Consultation',
          select: '_id status analysisNotified', // on ne ramène que ce qu’on utilise
        })
        .lean() // perf + évite des getters coûteux
        .exec();

      let buttonStatus: ButtonStatus = 'CONSULTER';
      let consultationId: string | null = null;

      if (lastLink?.consultationId) {
        // ✅ Bon ID: celui de la Consultation (populate ou non)
        consultationId = this.toIdString(lastLink.consultationId);

        // Si consultationId est populated, on peut lire status/analysisNotified
        const meta = this.getConsultationMeta(lastLink.consultationId);
        if (meta.status === 'COMPLETED') {
          buttonStatus = "VOIR L'ANALYSE";
        } else if (meta.status) {
          // Tant que pas COMPLETED => réponse en attente
          buttonStatus = 'RÉPONSE EN ATTENTE';
        } else {
          // Si pas populated (meta vide), on ne peut pas décider => on laisse CONSULTER
          // (ou tu peux forcer "RÉPONSE EN ATTENTE" si tu sais que lastLink => consultation existante)
          buttonStatus = 'CONSULTER';
        }
      }

      return {
        _id: choiceId,
        title,
        description,
        frequence,
        participants,
        order,
        offering,
        consultationCount,
        showButtons: frequence !== 'UNE_FOIS_VIE',
        buttonStatus,
        // ✅ ici c’est bien l’id de la consultation
        consultationId,
      };
    }),
  );

  // Tri robuste par order
  choicesWithCount = choicesWithCount.sort((a, b) => (a.order || 0) - (b.order || 0));

  return {
    _id: this.toIdString((rubrique as any)._id) ?? String((rubrique as any)._id),
    titre: rubrique.titre || '',
    description: rubrique.description || '',
    categorie: (rubrique as any).categorie,
    typeconsultation: (rubrique as any).typeconsultation,
    consultationChoices: choicesWithCount,
  };
}

}
