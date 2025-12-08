import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Consultation, ConsultationDocument } from '../consultations/schemas/consultation.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { ConsultationStatus } from '../common/enums/consultation-status.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';

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
}
