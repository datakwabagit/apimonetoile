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
import { PaymentStatus } from '../common/enums/payment-status.enum';

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
  private readonly MONEYFUSION_VERIFY_URL = 'https://www.pay.moneyfusion.net/api/verif';
  private readonly MONEYFUSION_TIMEOUT = 10000;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly httpService: HttpService,
  ) {}

  // ==================== VALIDATION METHODS ====================

  private validateToken(token: string): void {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new BadRequestException('Token MoneyFusion manquant ou invalide');
    }
  }

  private validateMoneyFusionResponse(response: any): response is MoneyFusionResponse {
    return response && typeof response.statut === 'boolean';
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
        this.httpService.post(
          this.MONEYFUSION_VERIFY_URL,
          { token },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: this.MONEYFUSION_TIMEOUT,
          },
        ),
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
        const payment = await this.paymentModel.create({
          amount: data?.montant || 0,
          currency: 'EUR',
          method: 'MONEYFUSION',
          status: PaymentStatus.COMPLETED,
          moneyFusionToken: token,
          reference: data?.reference || token,
          metadata: data,
          paidAt: new Date(),
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
            method: 'MONEYFUSION',
            status: PaymentStatus.COMPLETED,
            moneyFusionToken: token,
            reference: paymentData.reference || token,
            metadata: paymentData,
            paidAt: new Date(),
          },
        ],
        { session },
      );

      // Créditer l'utilisateur
      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        { $inc: { credits: paymentData.montant } },
        { new: true, session },
      );

      await session.commitTransaction();
      this.logger.log(`Paiement enregistré et utilisateur crédité: ${payment[0]._id}`);

      return {
        success: true,
        status: 'success',
        message: 'Paiement enregistré avec succès',
        payment: payment[0],
        // credits: updatedUser.credits,
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
}
