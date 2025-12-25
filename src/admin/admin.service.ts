 

 
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { Consultation, ConsultationDocument } from '../consultations/schemas/consultation.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { AstrologicalAnalysis, AstrologicalAnalysisDocument } from '../consultations/schemas/astrological-analysis.schema';
import { ConsultationStatus } from '../common/enums/consultation-status.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { Role } from '../common/enums/role.enum';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { WalletTransaction, WalletTransactionDocument } from '../wallet/schemas/wallet-transaction.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Consultation.name) private consultationModel: Model<ConsultationDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(WalletTransaction.name) private walletTransactionModel: Model<WalletTransactionDocument>,
    @InjectModel(AstrologicalAnalysis.name) private astrologicalAnalysisModel: Model<AstrologicalAnalysisDocument>,
    private readonly configService: ConfigService,
  ) {}

  private startOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  async createUser(createUserDto: any): Promise<User> {
    const { username, password, gender, phone, phoneNumber, ...rest } = createUserDto;

    // Générer l'email automatiquement
    const email = `${username}@monetoile.org`;

    // Vérifier si le username ou l'email existe déjà
    const existingUser = await this.userModel.findOne({ $or: [{ email }, { username }] }).exec();
    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    // Mapper le genre français vers anglais
    let mappedGender = gender;
    if (gender === 'Homme') mappedGender = 'male';
    else if (gender === 'Femme') mappedGender = 'female';
    else if (gender === 'Autre') mappedGender = 'other';

    // Prendre phone ou phoneNumber
    const finalPhone = phone || phoneNumber;

    // Générer un mot de passe temporaire si non fourni
    const plainPassword = password || Math.random().toString(36).slice(-8);

    // Hasher le password
    const saltRounds = this.configService.get<number>('BCRYPT_ROUNDS', 10);
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

    // Créer l'utilisateur
    const user = new this.userModel({
      ...rest,
      username,
      gender: mappedGender,
      phoneNumber: finalPhone,
      email,
      password: hashedPassword,
    });

    await user.save();

    // Retourner sans le password
    const userObject = user.toObject();
    delete userObject.password;

    return userObject;
  }

  async getStats() {
    const now = new Date();
    const todayStart = this.startOfDay(now);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // Users
    const totalUsers = await this.userModel.countDocuments().exec();
    const activeUsers = await this.userModel.countDocuments({ isActive: true }).exec();
    const newUsers = await this.userModel
      .countDocuments({ createdAt: { $gte: todayStart } })
      .exec();
    const inactiveUsers = await this.userModel.countDocuments({ isActive: false }).exec();

    // Consultations
    const totalConsultations = await this.consultationModel.countDocuments().exec();
    const pendingConsultations = await this.consultationModel
      .countDocuments({ status: ConsultationStatus.PENDING })
      .exec();
    const completedConsultations = await this.consultationModel
      .countDocuments({ status: ConsultationStatus.COMPLETED })
      .exec();

    // Consultation revenue (sum of price for completed consultations)
    const revenueAgg = await this.consultationModel
      .aggregate([
        { $match: { status: ConsultationStatus.COMPLETED } },
        { $group: { _id: null, total: { $sum: '$price' } } },
      ])
      .exec();
    const consultationsRevenue = (revenueAgg[0] && revenueAgg[0].total) || 0;

    // Payments
    const totalPayments = await this.paymentModel.countDocuments().exec();
    const pendingPayments = await this.paymentModel
      .countDocuments({ status: PaymentStatus.PENDING })
      .exec();
    const completedPayments = await this.paymentModel
      .countDocuments({ status: PaymentStatus.COMPLETED })
      .exec();
    const failedPayments = await this.paymentModel
      .countDocuments({ status: PaymentStatus.FAILED })
      .exec();

    // Activity today
    const todayUsers = newUsers;
    const todayConsultations = await this.consultationModel
      .countDocuments({ createdAt: { $gte: todayStart } })
      .exec();

    const todayPaymentsAgg = await this.paymentModel
      .aggregate([
        { $match: { status: PaymentStatus.COMPLETED, paidAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ])
      .exec();
    const todayRevenue = (todayPaymentsAgg[0] && todayPaymentsAgg[0].total) || 0;

    // Growth (compare consultations today vs yesterday)
    const yesterdayConsultations = await this.consultationModel
      .countDocuments({ createdAt: { $gte: yesterdayStart, $lt: todayStart } })
      .exec();
    let growth = 0;
    if (yesterdayConsultations > 0) {
      growth = ((todayConsultations - yesterdayConsultations) / yesterdayConsultations) * 100;
      growth = Math.round(growth * 10) / 10; // 1 decimal
    }

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        new: newUsers,
        inactive: inactiveUsers,
      },
      consultations: {
        total: totalConsultations,
        pending: pendingConsultations,
        completed: completedConsultations,
        revenue: consultationsRevenue,
      },
      payments: {
        total: totalPayments,
        pending: pendingPayments,
        completed: completedPayments,
        failed: failedPayments,
      },
      activity: {
        todayUsers,
        todayConsultations,
        todayRevenue,
        growth,
      },
    };
  }

  async getOfferingSalesStats(options?: { startDate?: string; endDate?: string }) {
    const { startDate, endDate } = options || {};

    const match: any = { status: 'completed' };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const last7Start = new Date(todayStart);
    last7Start.setDate(last7Start.getDate() - 6); // today + 6 jours précédents

    const last30Start = new Date(todayStart);
    last30Start.setDate(last30Start.getDate() - 29); // today + 29 jours précédents

    const [facet] = await this.walletTransactionModel.aggregate([
      { $match: match },
      {
        $facet: {
          overview: [
            { $unwind: '$items' },
            {
              $group: {
                _id: null,
                revenue: { $sum: '$items.totalPrice' },
                quantitySold: { $sum: '$items.quantity' },
                transactions: { $addToSet: '$_id' },
              },
            },
            {
              $project: {
                _id: 0,
                revenue: 1,
                quantitySold: 1,
                transactionsCount: { $size: '$transactions' },
              },
            },
          ],
          byOffering: [
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.offeringId',
                revenue: { $sum: '$items.totalPrice' },
                quantitySold: { $sum: '$items.quantity' },
                name: { $first: '$items.name' },
                category: { $first: '$items.category' },
                icon: { $first: '$items.icon' },
                avgUnitPrice: { $avg: '$items.unitPrice' },
              },
            },
            { $sort: { revenue: -1 } },
            {
              $project: {
                _id: 0,
                offeringId: '$_id',
                name: 1,
                category: 1,
                icon: 1,
                revenue: 1,
                quantitySold: 1,
                avgUnitPrice: { $round: ['$avgUnitPrice', 2] },
              },
            },
          ],
          byCategory: [
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.category',
                revenue: { $sum: '$items.totalPrice' },
                quantitySold: { $sum: '$items.quantity' },
              },
            },
            { $sort: { revenue: -1 } },
            {
              $project: {
                _id: 0,
                category: '$_id',
                revenue: 1,
                quantitySold: 1,
              },
            },
          ],
          today: [
            { $match: { createdAt: { $gte: todayStart } } },
            { $unwind: '$items' },
            {
              $group: {
                _id: null,
                revenue: { $sum: '$items.totalPrice' },
                quantitySold: { $sum: '$items.quantity' },
              },
            },
            { $project: { _id: 0, revenue: 1, quantitySold: 1 } },
          ],
          last7: [
            { $match: { createdAt: { $gte: last7Start } } },
            { $unwind: '$items' },
            {
              $group: {
                _id: null,
                revenue: { $sum: '$items.totalPrice' },
                quantitySold: { $sum: '$items.quantity' },
              },
            },
            { $project: { _id: 0, revenue: 1, quantitySold: 1 } },
          ],
          last30: [
            { $match: { createdAt: { $gte: last30Start } } },
            { $unwind: '$items' },
            {
              $group: {
                _id: null,
                revenue: { $sum: '$items.totalPrice' },
                quantitySold: { $sum: '$items.quantity' },
              },
            },
            { $project: { _id: 0, revenue: 1, quantitySold: 1 } },
          ],
        },
      },
    ]).exec();

    const overview = (facet?.overview && facet.overview[0]) || {
      revenue: 0,
      quantitySold: 0,
      transactionsCount: 0,
    };

    return {
      overview,
      byOffering: facet?.byOffering || [],
      byCategory: facet?.byCategory || [],
      periods: {
        today: (facet?.today && facet.today[0]) || { revenue: 0, quantitySold: 0 },
        last7: (facet?.last7 && facet.last7[0]) || { revenue: 0, quantitySold: 0 },
        last30: (facet?.last30 && facet.last30[0]) || { revenue: 0, quantitySold: 0 },
      },
      filters: { startDate, endDate },
    };
  }

  async getUsers(options: {
    search?: string;
    status?: string;
    role?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, status = 'all', role = 'all', page = 1, limit = 10 } = options || {};

    const filter: any = {};

    if (search && search.trim().length > 0) {
      const re = new RegExp(search.trim(), 'i');
      filter.$or = [
        { firstName: re },
        { lastName: re },
        { email: re },
        { username: re },
        { phone: re },
      ];
    }

    if (status && status !== 'all') {
      if (status === 'active') filter.isActive = true;
      else filter.isActive = false; // treat inactive/suspended as not active
    }

    if (role && role !== 'all') {
      const roleUpper = role.toUpperCase();
      if (Object.values(Role).includes(roleUpper as Role)) {
        filter.role = roleUpper;
      } else if (role === 'admin') {
        filter.role = Role.ADMIN;
      } else if (role === 'user') {
        filter.role = Role.USER;
      }
    }

    const skip = Math.max(0, (page - 1) * limit);

    const [total, docs] = await Promise.all([
      this.userModel.countDocuments(filter).exec(),
      this.userModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
    ]);

    const users = docs.map((u: any) => {
      // Retirer uniquement le mot de passe, tout le reste est retourné
      const { password, ...userData } = u;
      return userData;
    });

 

    return { users, total };
  }

  async getConsultations(options: {
    search?: string;
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, status = 'all', type = 'all', page = 1, limit = 18 } = options || {};

    const filter: any = { type: { $ne: 'CINQ_ETOILES' } };

    if (search && search.trim().length > 0) {
      const re = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: re },
        { description: re },
        { 'formData.firstName': re },
        { 'formData.lastName': re },
        { 'formData.question': re },
      ];
    }

    if (status && status !== 'all') {
      // Map frontend statuses to stored statuses
      filter.status = status.toUpperCase();
    }

    if (type && type !== 'all') {
      filter.type = type;
    }

    const skip = Math.max(0, (page - 1) * limit);

    const [total, docs] = await Promise.all([
      this.consultationModel.countDocuments(filter).exec(),
      this.consultationModel
        .find(filter)
        .populate('clientId', 'firstName lastName email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    // Fetch all analysis for the returned consultations in one query
    const consultationIds = docs.map((c: any) => c._id);
    const analyses = await this.astrologicalAnalysisModel
      .find({ consultationId: { $in: consultationIds } })
      .lean()
      .exec();
    const analysisMap = new Map(
      analyses.map((a: any) => [a.consultationId.toString(), a])
    );

    const consultations = docs.map((c: any) => {
      const { _id, ...consultationData } = c;
      const analysis = analysisMap.get(_id.toString()) || null;
      return {
        ...consultationData,
        id: _id.toString(),
        analysis,
      };
    });

    return { consultations, total };
  }

  async getPayments(options: {
    search?: string;
    status?: string;
    method?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, status = 'all', method = 'all', page = 1, limit = 18 } = options || {};

    const filter: any = {};

    if (status && status !== 'all') {
      filter.status = status.toUpperCase();
    }

    if (method && method !== 'all') {
      filter.method = method.toUpperCase();
    }

    if (search && search.trim().length > 0) {
      const re = new RegExp(search.trim(), 'i');
      // search by transactionId, metadata fields, or referenced user/phone later
      filter.$or = [{ transactionId: re }, { 'metadata.reference': re }];
    }

    const skip = Math.max(0, (page - 1) * limit);

    const [total, docs] = await Promise.all([
      this.paymentModel.countDocuments(filter).exec(),
      this.paymentModel
        .find(filter)
        .populate('userId', 'firstName lastName phone email')
        .populate({ path: 'consultationId', select: 'formData' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    const payments = docs.map((p: any) => {
      // customer info: prefer populated user, fallback to consultation.formData
      let customerName = '';
      let customerPhone = '';
      if (p.userId) {
        customerName = `${p.userId.firstName || ''} ${p.userId.lastName || ''}`.trim();
        customerPhone = p.userId.phone || '';
      }
      if ((!customerName || !customerPhone) && p.consultationId && p.consultationId.formData) {
        const fd = p.consultationId.formData;
        if (!customerName) customerName = `${fd.firstName || ''} ${fd.lastName || ''}`.trim();
        if (!customerPhone) customerPhone = fd.telephone || fd.phone || '';
      }

      const reference =
        p.transactionId || p.metadata?.reference || (p._id ? p._id.toString() : undefined);

      return {
        id: p._id.toString(),
        reference,
        amount: p.amount || 0,
        status: (p.status || '').toLowerCase(),
        method: (p.method || '').toLowerCase(),
        customerName: customerName || 'Client',
        customerPhone: customerPhone || '',
        createdAt: p.createdAt,
        completedAt: p.paidAt || p.refundedAt || null,
      };
    });

    return { payments, total };
  }

  async getUserById(id: string) {
    const user = await this.userModel.findById(id).select('-password').exec();
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }
    return user;
  }

    async deleteUser(id: string) {
    const user = await this.userModel.findByIdAndDelete(id).select('-password').exec();
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }
    return { message: `Utilisateur avec l'ID ${id} supprimé.` };
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .select('-password')
      .exec();
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }
    return user;
  }
}
