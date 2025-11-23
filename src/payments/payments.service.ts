import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentStatus } from '../common/enums/payment-status.enum';

@Injectable()
export class PaymentsService {
  constructor(@InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>) {}

  async create(userId: string, createPaymentDto: CreatePaymentDto) {
    const payment = new this.paymentModel({
      ...createPaymentDto,
      userId,
      status: PaymentStatus.PENDING,
    });

    return payment.save();
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    userId?: string;
    status?: PaymentStatus;
  }) {
    const { page = 1, limit = 10, userId, status } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (userId) filter.userId = userId;
    if (status) filter.status = status;

    const [payments, total] = await Promise.all([
      this.paymentModel
        .find(filter)
        .populate('userId', 'firstName lastName email')
        .populate('consultationId', 'title type')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.paymentModel.countDocuments(filter).exec(),
    ]);

    return { payments, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const payment = await this.paymentModel
      .findById(id)
      .populate('userId', 'firstName lastName email')
      .populate('consultationId', 'title type status')
      .exec();

    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto) {
    if (updatePaymentDto.status === PaymentStatus.COMPLETED) {
      updatePaymentDto['paidAt'] = new Date();
    }

    if (updatePaymentDto.status === PaymentStatus.REFUNDED) {
      updatePaymentDto['refundedAt'] = new Date();
    }

    const payment = await this.paymentModel
      .findByIdAndUpdate(id, updatePaymentDto, { new: true })
      .exec();

    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async getStatistics() {
    const [total, byStatus, totalRevenue, avgAmount] = await Promise.all([
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
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      totalRevenue: totalRevenue[0]?.total || 0,
      avgAmount: avgAmount[0]?.avg || 0,
    };
  }
}
