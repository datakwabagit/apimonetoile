import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Consultation, ConsultationDocument } from '../consultations/schemas/consultation.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { ConsultationStatus } from '../common/enums/consultation-status.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { Role } from '../common/enums/role.enum';
import { Permission } from '../common/enums/permission.enum';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Consultation.name) private consultationModel: Model<ConsultationDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
  ) {}

  private startOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
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
      this.userModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    const users = docs.map((u: any) => ({
      id: u._id.toString(),
      email: u.email,
      prenom: u.firstName || '',
      nom: u.lastName || '',
      telephone: u.phone || '',
      role: (u.role || '').toLowerCase(),
      status: u.isActive ? 'active' : 'inactive',
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
      consultationsCount: u.totalConsultations || u.totalConsultations === 0 ? u.totalConsultations : u.totalConsultations || 0,
    }));

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

    const filter: any = {};

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
        .populate('clientId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    const consultations = docs.map((c: any) => ({
      id: c._id.toString(),
      type: c.type,
      status: (c.status || '').toLowerCase(),
      clientName: c.clientId ? `${c.clientId.firstName || ''} ${c.clientId.lastName || ''}`.trim() : 'Invité',
      clientEmail: c.clientId ? c.clientId.email : '',
      price: c.price || 0,
      createdAt: c.createdAt,
      completedAt: c.completedDate || null,
    }));

    return { consultations, total };
  }
}
