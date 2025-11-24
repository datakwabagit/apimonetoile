import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class MoneyfusionService {
  async createPayment(dto: CreatePaymentDto) {
    try {
      const response = await axios.post('https://www.pay.moneyfusion.net/api/pay', dto, {
        headers: { 'Content-Type': 'application/json' },
      });
      return response.data;
    } catch (error) {
      throw new HttpException(error.response?.data || error.message, HttpStatus.BAD_REQUEST);
    }
  }

  async checkPaymentStatus(token: string) {
    try {
      const response = await axios.get(`https://www.pay.moneyfusion.net/paiementNotif/${token}`);
      return response.data;
    } catch (error) {
      throw new HttpException(error.response?.data || error.message, HttpStatus.BAD_REQUEST);
    }
  }

  async handleWebhook(payload: any) {
    // Ici, tu peux traiter et stocker la notification reçue
    // Ex: vérifier le tokenPay, mettre à jour la transaction, etc.
    return { received: true, payload };
  }
}
