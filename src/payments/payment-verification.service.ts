import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface MoneyFusionResponse {
  statut: string;
  data: {
    statut: string;
    [key: string]: any;
  };
  message?: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  status: string;
  data?: any;
  message: string;
}

@Injectable()
export class PaymentVerificationService {
  private readonly moneyfusionBaseUrl = 'https://www.pay.moneyfusion.net';

  constructor(private httpService: HttpService) {}

  /**
   * Vérifier le statut du paiement via MoneyFusion API
   */
  async verifyPaymentWithMoneyFusion(paymentToken: string): Promise<VerifyPaymentResult> {
    try {
      if (!paymentToken || paymentToken.trim() === '') {
        throw new BadRequestException('Token de paiement manquant');
      }

      const url = `${this.moneyfusionBaseUrl}/paiementNotif/${paymentToken}`;
      console.log(`🔍 Vérification MoneyFusion: ${url}`);

      const response = await firstValueFrom(
        this.httpService.get<MoneyFusionResponse>(url, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      const result = response.data;

      if (!result.statut || !result.data) {
        throw new BadRequestException('Format de réponse invalide de MoneyFusion');
      }

      console.log(`✅ Paiement vérifié: ${result.data.statut}`);

      return {
        success: true,
        status: result.data.statut,
        data: result.data,
        message: result.message || 'Paiement vérifié avec succès',
      };
    } catch (error: any) {
      console.error('❌ Erreur vérification MoneyFusion:', error.message);

      if (error.response?.status === 404) {
        throw new BadRequestException('Token de paiement invalide ou expiré');
      }

      if (error.code === 'ECONNABORTED') {
        throw new InternalServerErrorException('Timeout lors de la vérification MoneyFusion');
      }

      throw new InternalServerErrorException(error.message || 'Erreur de vérification du paiement');
    }
  }

  /**
   * Valider que les données de paiement sont cohérentes
   */
  validatePaymentData(paymentData: any): { valid: boolean; error?: string } {
    if (!paymentData) {
      return { valid: false, error: 'Données de paiement manquantes' };
    }

    if (!paymentData.personal_Info || !Array.isArray(paymentData.personal_Info)) {
      return { valid: false, error: 'Informations personnelles manquantes' };
    }

    const personalInfo = paymentData.personal_Info[0];
    if (!personalInfo) {
      return { valid: false, error: 'Données personnelles vides' };
    }

    return { valid: true };
  }
}
