import {
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentStatus, PaymentMethod } from '../common/enums/payment-status.enum';
import { BooksService } from '../books/books.service';
import { ConsultationsService } from '../consultations/consultations.service';
import { DeepseekService, BirthData } from '../consultations/deepseek.service';
import { AnalysisStatus } from '../consultations/dto/save-analysis.dto';
import { ConsultationStatus } from '../common/enums/consultation-status.enum';

interface MoneyFusionResponse {
  statut: boolean;
  message?: string;
  code_statut?: number;
  data?: {
    montant?: number;
    reference?: string;
    numeroSend?: string;
    email?: string;
    [key: string]: any;
  };
}

export interface VerificationResult {
  status: 'success' | 'error' | 'already_used';
  message: string;
  payment?: PaymentDocument;
  details?: any;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  // Endpoint officiel de vérification MoneyFusion (GET /paiementNotif/{token})
  private readonly MONEYFUSION_VERIFY_URL = 'https://www.pay.moneyfusion.net/paiementNotif';
  private readonly MONEYFUSION_TIMEOUT = 10000;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly httpService: HttpService,
    private readonly booksService: BooksService,
    private readonly consultationsService: ConsultationsService,
    private readonly deepseekService: DeepseekService,
  ) {}

  // ==================== VALIDATION METHODS ====================

  private validateToken(token: string): void {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new BadRequestException('Token MoneyFusion manquant ou invalide');
    }
  }

  private normalizeDateInput(dateValue: any): string {
    if (!dateValue) {
      return '';
    }

    if (dateValue instanceof Date) {
      return dateValue.toISOString().split('T')[0];
    }

    return dateValue.toString();
  }

  private buildBirthDataFromConsultation(consultation: any, personalInfo: any): BirthData {
    const formData = consultation?.formData || {};

    return {
      nom: formData.lastName || personalInfo?.lastName || personalInfo?.nom || 'Client',
      prenoms: formData.firstName || personalInfo?.firstName || personalInfo?.prenoms || 'Client',
      genre:
        formData.gender ||
        formData.sexe ||
        personalInfo?.genre ||
        personalInfo?.gender ||
        'Inconnu',
      dateNaissance: this.normalizeDateInput(
        formData.dateOfBirth || personalInfo?.dateNaissance || personalInfo?.dateOfBirth,
      ),
      heureNaissance:
        formData.timeOfBirth ||
        formData.hourOfBirth ||
        formData.heureNaissance ||
        personalInfo?.heureNaissance ||
        personalInfo?.timeOfBirth ||
        '',
      paysNaissance:
        formData.countryOfBirth ||
        formData.paysNaissance ||
        personalInfo?.paysNaissance ||
        personalInfo?.countryOfBirth ||
        personalInfo?.pays ||
        '',
      villeNaissance:
        formData.cityOfBirth ||
        formData.villeNaissance ||
        personalInfo?.villeNaissance ||
        personalInfo?.cityOfBirth ||
        personalInfo?.ville ||
        '',
      email: formData.email || personalInfo?.email || undefined,
    };
  }

  private getMissingBirthFields(birthData: BirthData): string[] {
    const required: Array<keyof BirthData> = [
      'nom',
      'prenoms',
      'dateNaissance',
      'heureNaissance',
      'paysNaissance',
      'villeNaissance',
    ];

    return required.filter(
      (field) => !birthData[field] || birthData[field].toString().trim() === '',
    );
  }

  /**
   * Callback déclenché par le frontend après vérification MoneyFusion côté client.
   * Sécurise côté serveur via verifyMoneyfusionPayment puis enregistre le paiement
   * et, le cas échéant, l'achat de livre avec génération du lien de téléchargement.
   */
  async handleClientCallback(body: any) {
    const { token, type = 'consultation' } = body || {};

    if (!token) {
      throw new BadRequestException('Token manquant');
    }

    // Vérification serveur du paiement via MoneyFusion
    const verification = await this.verifyMoneyfusionPayment(token);
    if (verification.status !== 'success' || !verification.payment) {
      return {
        success: false,
        status: verification.status,
        message: verification.message,
      };
    }

    const paymentData = verification.payment.metadata || body.paymentData || {};
    const personalInfo = paymentData.personal_Info?.[0] || {};
    const userId = personalInfo.userId || null;
    const consultationId = personalInfo.consultationId || null;

    // Idempotence
    const existing = await this.paymentModel.findOne({ moneyFusionToken: token }).lean().exec();
    if (existing) {
      return {
        success: true,
        status: 'already_used',
        message: 'Paiement déjà traité',
        consultationId: existing.consultationId?.toString(),
      };
    }

    // Créer le paiement (consultation ou livre)
    const payment = await this.paymentModel.create({
      userId: userId || undefined,
      consultationId: consultationId || undefined,
      amount: paymentData.montant || paymentData.Montant || 0,
      currency: 'XAF',
      method: PaymentMethod.MONEYFUSION,
      status: PaymentStatus.COMPLETED,
      moneyFusionToken: token,
      transactionId: paymentData.reference || paymentData.tokenPay || token,
      metadata: paymentData,
      paidAt: new Date(),
    });

    if (type === 'book' && personalInfo.bookId) {
      // Enregistrer l'achat de livre et générer le lien de téléchargement
      const bookPurchase = await this.booksService.recordPurchase(
        {
          bookId: personalInfo.bookId,
          paymentId: payment._id.toString(),
          customerName: paymentData.nomclient || 'Client',
          customerPhone: paymentData.numeroSend,
          customerEmail: paymentData.email || undefined,
          price: paymentData.montant || paymentData.Montant || 0,
        },
        userId || undefined,
      );

      return {
        success: true,
        status: 'paid',
        bookId: personalInfo.bookId,
        downloadUrl: `/api/v1/books/${personalInfo.bookId}/download?token=${bookPurchase.downloadToken}`,
        message: 'Paiement du livre traité avec succès',
      };
    }

    return {
      success: true,
      status: 'paid',
      consultationId: consultationId || undefined,
      message: 'Paiement traité avec succès',
    };
  }

  private validateMoneyFusionResponse(response: any): response is MoneyFusionResponse {
    return response && typeof response.statut === 'boolean';
  }

  /**
   * Mappe les statuts MoneyFusion vers nos PaymentStatus
   */
  private mapMoneyfusionStatus(status?: string): PaymentStatus {
    const normalized = (status || '').toLowerCase();
    switch (normalized) {
      case 'paid':
        return PaymentStatus.COMPLETED;
      case 'pending':
        return PaymentStatus.PENDING;
      case 'failure':
      case 'no paid':
        return PaymentStatus.FAILED;
      default:
        return PaymentStatus.PENDING;
    }
  }

  // ==================== MONEYFUSION METHODS ====================

  /**
   * Vérifie un paiement MoneyFusion via leur API
   * Enregistre le paiement si validé et non existant
   */
  async verifyMoneyfusionPayment(token: string): Promise<VerificationResult> {
    this.validateToken(token);

    try {
      this.logger.log(`Vérification paiement MoneyFusion: ${token}`);

      const response = await firstValueFrom(
        this.httpService.get(`${this.MONEYFUSION_VERIFY_URL}/${token}`, {
          timeout: this.MONEYFUSION_TIMEOUT,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      if (!this.validateMoneyFusionResponse(response.data)) {
        throw new HttpException('Réponse MoneyFusion invalide', HttpStatus.BAD_GATEWAY);
      }

      const { statut, message, code_statut, data } = response.data;

      this.logger.debug(`Réponse MoneyFusion: ${JSON.stringify(response.data)}`);

      // Vérifier si le paiement existe déjà
      const existingPayment = await this.paymentModel.findOne({ moneyFusionToken: token });
      if (existingPayment) {
        this.logger.warn(`Paiement déjà enregistré: ${token}`);
        return {
          status: 'already_used',
          message: 'Paiement déjà enregistré',
          payment: existingPayment,
        };
      }

      if (statut === true) {
        const mappedStatus = this.mapMoneyfusionStatus(data?.statut);
        const payment = await this.paymentModel.create({
          amount: data?.Montant || data?.montant || 0,
          currency: 'EUR',
          method: PaymentMethod.MONEYFUSION,
          status: mappedStatus,
          moneyFusionToken: token,
          transactionId: data?.tokenPay || data?.reference || token,
          metadata: data,
          paidAt: mappedStatus === PaymentStatus.COMPLETED ? new Date() : undefined,
        });

        this.logger.log(`Paiement créé avec succès: ${payment._id}`);

        return {
          status: 'success',
          message: 'Paiement validé',
          payment,
        };
      }

      if (code_statut === 400) {
        this.logger.warn(`Token déjà utilisé ou invalide: ${token}`);
        return {
          status: 'already_used',
          message: message || 'Paiement déjà traité ou token invalide',
          details: response.data,
        };
      }

      this.logger.error(`Paiement non validé: ${message}`);
      return {
        status: 'error',
        message: message || 'Paiement non validé',
        details: response.data,
      };
    } catch (error: any) {
      this.logger.error('Erreur vérification MoneyFusion:', error);

      if (error.response) {
        const { status, data } = error.response;
        if (status === 400) {
          return {
            status: 'already_used',
            message: data?.message || 'Token invalide ou déjà utilisé',
            details: data,
          };
        }
        throw new HttpException(data?.message || 'Erreur API MoneyFusion', status);
      }

      if (error.code === 'ECONNABORTED' || error.name === 'TimeoutError') {
        throw new HttpException(
          'Timeout lors de la vérification du paiement',
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      throw new HttpException(
        error.message || 'Erreur lors de la vérification du paiement',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Gère le callback MoneyFusion
   */
  async handleMoneyfusionCallback(userId: string, body: any) {
    const { token, paymentData } = body;

    if (!token || typeof token !== 'string' || token.trim() === '' || !paymentData) {
      throw new BadRequestException('Token ou données de paiement manquants ou invalides');
    }

    this.logger.log(`Callback MoneyFusion pour utilisateur: ${userId}`);

    const session = await this.paymentModel.startSession();
    session.startTransaction();

    try {
      // Vérifier que l'utilisateur existe
      const user = await this.userModel.findById(userId).session(session);
      if (!user) {
        throw new NotFoundException('Utilisateur introuvable');
      }

      // Vérifier si le paiement existe déjà
      const existingPayment = await this.paymentModel
        .findOne({ moneyFusionToken: token })
        .session(session);

      if (existingPayment) {
        this.logger.warn(`Paiement déjà traité: ${token}`);
        await session.abortTransaction();
        return {
          success: true,
          status: 'already_used',
          message: 'Paiement déjà enregistré',
          payment: existingPayment,
        };
      }

      // Créer le paiement
      const payment = await this.paymentModel.create(
        [
          {
            userId,
            amount: paymentData.montant,
            currency: 'EUR',
            method: PaymentMethod.MONEYFUSION,
            status: PaymentStatus.COMPLETED,
            moneyFusionToken: token,
            transactionId: paymentData.reference || paymentData.tokenPay || token,
            metadata: paymentData,
            paidAt: new Date(),
          },
        ],
        { session },
      );

      // Vérifier si c'est un achat de livre
      const isBookPurchase =
        paymentData.personal_Info &&
        Array.isArray(paymentData.personal_Info) &&
        paymentData.personal_Info.length > 0 &&
        paymentData.personal_Info[0].productType === 'ebook_pdf';

      let bookPurchase = null;

      if (isBookPurchase) {
        // Enregistrer l'achat du livre
        const bookInfo = paymentData.personal_Info[0];
        try {
          bookPurchase = await this.booksService.recordPurchase(
            {
              bookId: bookInfo.bookId,
              paymentId: payment[0]._id.toString(),
              customerName: paymentData.nomclient || 'Client',
              customerPhone: paymentData.numeroSend,
              customerEmail: paymentData.email || undefined,
              price: paymentData.montant,
            },
            userId,
          );
          this.logger.log(`Achat de livre enregistré: ${bookInfo.bookId}`);
        } catch (bookError) {
          this.logger.error('Erreur enregistrement achat livre:', bookError);
          // Continue même si l'enregistrement du livre échoue
        }
      } else {
        // Créditer l'utilisateur (achat de crédits classique)
        await this.userModel.findByIdAndUpdate(
          userId,
          { $inc: { credits: paymentData.montant } },
          { new: true, session },
        );
      }

      const updatedUser = await this.userModel.findById(userId).session(session);

      await session.commitTransaction();
      this.logger.log(`Paiement enregistré: ${payment[0]._id}`);

      return {
        success: true,
        status: 'success',
        message: isBookPurchase
          ? 'Achat de livre enregistré avec succès'
          : 'Paiement enregistré avec succès',
        payment: payment[0],
        credits: updatedUser ? updatedUser.credits : undefined,
        bookPurchase: bookPurchase || undefined,
      };
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Erreur callback MoneyFusion:', error);

      // Marquer le paiement comme échoué en cas d'erreur
      if (error instanceof NotFoundException) {
        await this.paymentModel.updateOne(
          { moneyFusionToken: token },
          { status: PaymentStatus.FAILED },
          { session },
        );
      }

      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Gère le webhook MoneyFusion (notification serveur à serveur)
   */
  async handleMoneyfusionWebhook(body: any) {
    const { token } = body;

    if (!token) {
      throw new BadRequestException('Token manquant');
    }

    this.logger.log(`Webhook MoneyFusion reçu: ${token}`);

    const session = await this.paymentModel.startSession();
    session.startTransaction();

    try {
      // Vérifier le paiement auprès de MoneyFusion
      const verification = await this.verifyMoneyfusionPayment(token);

      if (verification.status !== 'success' || !verification.payment) {
        this.logger.warn(`Paiement webhook non validé: ${token}`);
        await session.abortTransaction();
        return {
          received: true,
          status: verification.status,
          message: verification.message,
        };
      }

      const paymentData = verification.payment.metadata;

      // Trouver l'utilisateur
      const user = await this.userModel
        .findOne({
          $or: [{ phone: paymentData.numeroSend }, { email: paymentData.email }],
        })
        .session(session);

      if (!user) {
        this.logger.error(`Utilisateur introuvable pour le webhook: ${paymentData.numeroSend}`);

        // Marquer le paiement comme en attente
        await this.paymentModel.findByIdAndUpdate(
          verification.payment._id,
          {
            status: PaymentStatus.PENDING,
            metadata: {
              ...paymentData,
              webhookError: 'Utilisateur introuvable',
            },
          },
          { session },
        );

        await session.commitTransaction();
        throw new NotFoundException('Utilisateur introuvable');
      }

      // Associer le paiement à l'utilisateur et créditer
      await this.paymentModel.findByIdAndUpdate(
        verification.payment._id,
        { userId: user._id },
        { session },
      );

      await this.userModel.findByIdAndUpdate(
        user._id,
        { $inc: { credits: paymentData.montant } },
        { session },
      );

      await session.commitTransaction();
      this.logger.log(`Webhook traité avec succès pour utilisateur: ${user._id}`);

      return {
        received: true,
        status: 'success',
        message: 'Paiement traité',
        paymentId: verification.payment._id,
      };
    } catch (error) {
      await session.abortTransaction();
      this.logger.error('Erreur webhook MoneyFusion:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ==================== STANDARD PAYMENT METHODS ====================

  /**
   * Créer un paiement standard
   */
  async create(userId: string, createPaymentDto: CreatePaymentDto): Promise<PaymentDocument> {
    const payment = await this.paymentModel.create({
      ...createPaymentDto,
      userId,
      status: PaymentStatus.PENDING,
    });

    return payment;
  }

  /**
   * Lister les paiements avec pagination et filtres
   */
  async findAll(query: { page?: number; limit?: number; userId?: string; status?: PaymentStatus }) {
    const { page = 1, limit = 10, userId, status } = query;
    const skip = (page - 1) * limit;

    // Validation des paramètres
    const validatedLimit = Math.min(Math.max(limit, 1), 100); // Limite entre 1 et 100
    const validatedPage = Math.max(page, 1);

    const filter: any = {};
    if (userId) filter.userId = userId;
    if (status) filter.status = status;

    const [payments, total] = await Promise.all([
      this.paymentModel
        .find(filter)
        .populate('userId', 'firstName lastName email phone')
        .populate('consultationId', 'title type')
        .skip(skip)
        .limit(validatedLimit)
        .sort({ createdAt: -1 })
        .exec(),
      this.paymentModel.countDocuments(filter).exec(),
    ]);

    return {
      payments,
      total,
      page: validatedPage,
      limit: validatedLimit,
      totalPages: Math.ceil(total / validatedLimit),
    };
  }

  /**
   * Obtenir un paiement par ID
   */
  async findOne(id: string): Promise<PaymentDocument> {
    if (!id) {
      throw new BadRequestException('ID de paiement manquant');
    }

    const payment = await this.paymentModel
      .findById(id)
      .populate('userId', 'firstName lastName email phone')
      .populate('consultationId', 'title type status')
      .exec();

    if (!payment) {
      throw new NotFoundException('Paiement introuvable');
    }

    return payment;
  }

  /**
   * Mettre à jour un paiement
   */
  async update(id: string, updatePaymentDto: UpdatePaymentDto): Promise<PaymentDocument> {
    if (!id) {
      throw new BadRequestException('ID de paiement manquant');
    }

    const updateData: any = { ...updatePaymentDto };

    // Mise à jour automatique des dates selon le statut
    if (updatePaymentDto.status === PaymentStatus.COMPLETED) {
      updateData.paidAt = new Date();
    }

    if (updatePaymentDto.status === PaymentStatus.REFUNDED) {
      updateData.refundedAt = new Date();
    }

    const payment = await this.paymentModel
      .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .exec();

    if (!payment) {
      throw new NotFoundException('Paiement introuvable');
    }

    return payment;
  }

  /**
   * Obtenir les statistiques des paiements
   */
  async getStatistics() {
    const [total, byStatus, totalRevenue, avgAmount, last30Days] = await Promise.all([
      this.paymentModel.countDocuments().exec(),

      this.paymentModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),

      this.paymentModel.aggregate([
        { $match: { status: PaymentStatus.COMPLETED } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),

      this.paymentModel.aggregate([
        { $match: { status: PaymentStatus.COMPLETED } },
        { $group: { _id: null, avg: { $avg: '$amount' } } },
      ]),

      this.paymentModel.aggregate([
        {
          $match: {
            status: PaymentStatus.COMPLETED,
            paidAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const statusMap = byStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return {
      total,
      byStatus: statusMap,
      totalRevenue: totalRevenue[0]?.total || 0,
      avgAmount: Math.round((avgAmount[0]?.avg || 0) * 100) / 100, // Arrondi à 2 décimales
      last30Days: {
        revenue: last30Days[0]?.total || 0,
        count: last30Days[0]?.count || 0,
      },
    };
  }

  /**
   * Vérifier un paiement via MoneyFusion
   * Utilisé par le frontend pour valider le paiement avant traitement
   */
  async verifyPayment(token: string) {
    this.validateToken(token);
    try {
      const verification = await this.verifyMoneyfusionPayment(token);
      return {
        success: verification.status === 'success',
        status: verification.payment?.status || 'unknown',
        message: verification.message,
        data: verification.payment
          ? {
              _id: verification.payment._id,
              amount: verification.payment.amount,
              status: verification.payment.status,
              method: verification.payment.method,
            }
          : null,
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'error',
        message: error.message || 'Erreur de vérification',
      };
    }
  }

  /**
   * Traiter un paiement de consultation
   * Crée la consultation et génère l'analyse
   */
  async processConsultationPayment(token: string, paymentData: any) {
    this.validateToken(token);

    try {
      // Vérifier le paiement
      const verification = await this.verifyMoneyfusionPayment(token);
      if (!verification.payment || !['success', 'already_used'].includes(verification.status)) {
        return {
          success: false,
          status: verification.status,
          message: verification.message,
        };
      }

      const payment = verification.payment;
      const transactionId =
        payment.transactionId || payment.metadata?.tokenPay || payment.metadata?.reference || token;
      const mergedPaymentData = paymentData || payment.metadata || {};
      const personalInfo =
        mergedPaymentData?.personal_Info?.[0] || payment.metadata?.personal_Info?.[0] || {};

      const consultationId =
        personalInfo.consultationId || payment.consultationId?.toString() || null;

      if (!consultationId) {
        throw new BadRequestException('ID de consultation manquant');
      }

      const consultation = await this.consultationsService.findOne(consultationId);
      const userId =
        consultation.clientId?.toString() || personalInfo.userId || payment.userId?.toString();

      await this.paymentModel.findByIdAndUpdate(payment._id, {
        consultationId,
        userId: userId || undefined,
        status: PaymentStatus.COMPLETED,
        method: PaymentMethod.MONEYFUSION,
      });

      const birthData = this.buildBirthDataFromConsultation(consultation, personalInfo);
      const missingFields = this.getMissingBirthFields(birthData);

      if (missingFields.length > 0) {
        return {
          success: false,
          status: 'error',
          message: `Informations de naissance manquantes: ${missingFields.join(', ')}`,
        };
      }

      const analyse = await this.deepseekService.genererAnalyseComplete(birthData, consultationId);
      const analyseComplete = {
        consultationId,
        ...analyse,
        dateGeneration: new Date().toISOString(),
      };

      if (userId) {
        await this.consultationsService.saveAstrologicalAnalysis(
          userId,
          consultationId,
          analyseComplete,
        );
      }

      await this.consultationsService.saveAnalysis(consultationId, {
        statut: AnalysisStatus.COMPLETED,
        analyse: analyseComplete,
      });

      await this.consultationsService.update(consultationId, {
        status: ConsultationStatus.COMPLETED,
        resultData: analyseComplete,
        isPaid: true,
        paymentId: payment._id,
      } as any);

      this.logger.log(`📊 Traitement consultation: ${consultationId}`);

      return {
        success: true,
        status: 'paid',
        consultationId,
        message: 'Paiement de consultation traité avec succès',
        data: {
          paymentId: payment._id.toString(),
          amount: payment.amount,
          reference: transactionId,
          analyse: analyseComplete,
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ Erreur traitement consultation: ${error.message}`);
      return {
        success: false,
        status: 'error',
        message: error.message || 'Erreur de traitement',
      };
    }
  }

  /**
   * Traiter un paiement de livre
   * Enregistre l'achat et génère le lien de téléchargement
   */
  async processBookPayment(token: string, paymentData: any) {
    this.validateToken(token);

    try {
      // Vérifier le paiement
      const verification = await this.verifyMoneyfusionPayment(token);
      if (verification.status !== 'success' || !verification.payment) {
        return {
          success: false,
          status: verification.status,
          message: verification.message,
        };
      }

      const payment = verification.payment;
      const personalInfo = paymentData?.personal_Info?.[0];

      if (!personalInfo || !personalInfo.bookId) {
        throw new BadRequestException('ID du livre manquant');
      }

      const bookId = personalInfo.bookId;
      const userId = personalInfo.userId || payment.userId?.toString();

      this.logger.log(`📚 Traitement achat livre: ${bookId} pour utilisateur: ${userId}`);

      // Marquer le livre comme acheté par cet utilisateur
      if (userId) {
        await this.booksService.addUserPurchase(bookId, userId);
      }

      // Générer le token de téléchargement sécurisé
      const downloadToken = Buffer.from(`${bookId}:${token}`).toString('base64');
      const downloadUrl = `/api/v1/books/${bookId}/download?token=${downloadToken}`;

      return {
        success: true,
        status: 'paid',
        bookId,
        downloadUrl,
        message: 'Paiement du livre traité avec succès',
        data: {
          paymentId: payment._id.toString(),
          amount: payment.amount,
          // reference: transactionId,
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ Erreur traitement livre: ${error.message}`);
      return {
        success: false,
        status: 'error',
        message: error.message || 'Erreur de traitement',
      };
    }
  }
}
