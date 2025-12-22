/**
 * Service d'envoi d'emails via Resend
 * Gère les notifications pour les analyses astrologiques
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend | null = null;
  private readonly FROM_EMAIL: string;
  private readonly APP_URL: string;

  constructor(private configService: ConfigService) {
    const RESEND_API_KEY = this.configService.get<string>('RESEND_API_KEY');
    this.FROM_EMAIL =
      this.configService.get<string>('EMAIL_FROM') || 'Mon Etoile <noreply@monetoile.com>';
    this.APP_URL = this.configService.get<string>('APP_URL') || 'http://localhost:3000';

    if (RESEND_API_KEY) {
      this.resend = new Resend(RESEND_API_KEY);
    } else {
      console.warn('[Email] RESEND_API_KEY non configurée - emails désactivés');
    }
  }

  /**
   * Template HTML pour l'email de notification
   */
  private generateAnalysisReadyEmail(prenoms: string, nom: string, consultationId: string): string {
    const analyseUrl = `${this.APP_URL}/protected/consultations/${consultationId}`;

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre Analyse Astrologique est Prête</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.1); overflow: hidden;">
          
          <!-- Header avec étoiles -->
          <tr>
            <td style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                ✨ Votre Analyse Astrologique est Prête ✨
              </h1>
              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                Découvrez les secrets de votre carte du ciel
              </p>
            </td>
          </tr>
          
          <!-- Corps du message -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #ffffff; font-size: 18px; margin: 0 0 20px 0;">
                Bonjour <strong>${prenoms} ${nom}</strong>,
              </p>
              
              <p style="color: rgba(255, 255, 255, 0.8); font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Votre analyse astrologique complète a été générée avec succès par notre intelligence artificielle spécialisée en astrologie.
              </p>
              
              <div style="background: rgba(139, 92, 246, 0.1); border-left: 4px solid #8b5cf6; padding: 20px; margin: 30px 0; border-radius: 8px;">
                <h3 style="color: #c4b5fd; margin: 0 0 10px 0; font-size: 16px;">📊 Votre analyse comprend :</h3>
                <ul style="color: rgba(255, 255, 255, 0.8); margin: 10px 0 0 0; padding-left: 20px;">
                  <li style="margin-bottom: 8px;">🌟 Votre carte du ciel personnalisée</li>
                  <li style="margin-bottom: 8px;">🎯 Votre mission de vie</li>
                  <li style="margin-bottom: 8px;">💎 Vos talents naturels</li>
                  <li style="margin-bottom: 8px;">❤️ Votre style relationnel</li>
                  <li style="margin-bottom: 8px;">💼 Votre vocation professionnelle</li>
                  <li style="margin-bottom: 8px;">🕉️ Votre chemin spirituel</li>
                </ul>
              </div>
              
              <p style="color: rgba(255, 255, 255, 0.8); font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Prenez le temps de lire attentivement chaque section pour une compréhension profonde de votre thème natal et de votre potentiel unique.
              </p>
              
              <!-- Bouton CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${analyseUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); 
                              color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; 
                              font-size: 18px; font-weight: bold; box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);">
                      🔮 Voir Mon Analyse Complète
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: rgba(255, 255, 255, 0.6); font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
                Vous pouvez également copier ce lien dans votre navigateur :<br>
                <a href="${analyseUrl}" style="color: #8b5cf6; text-decoration: none;">${analyseUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: rgba(0, 0, 0, 0.2); padding: 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <p style="color: rgba(255, 255, 255, 0.6); font-size: 14px; margin: 0 0 10px 0;">
                ✨ Mon Etoile - Votre Guide Astrologique Personnel
              </p>
              <p style="color: rgba(255, 255, 255, 0.4); font-size: 12px; margin: 0;">
                Cet email a été envoyé automatiquement suite à votre consultation astrologique.<br>
                Pour toute question, contactez-nous à support@monetoile.com
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Template texte brut (fallback)
   */
  private generateAnalysisReadyTextEmail(
    prenoms: string,
    nom: string,
    consultationId: string,
  ): string {
    const analyseUrl = `${this.APP_URL}/protected/consultations/${consultationId}`;

    return `
Bonjour ${prenoms} ${nom},

Votre analyse astrologique complète est maintenant disponible !

Notre intelligence artificielle spécialisée a généré une analyse détaillée de votre carte du ciel incluant :

- Votre carte du ciel personnalisée
- Votre mission de vie
- Vos talents naturels
- Votre style relationnel
- Votre vocation professionnelle
- Votre chemin spirituel

Pour consulter votre analyse complète, cliquez sur ce lien :
${analyseUrl}

Prenez le temps de lire attentivement chaque section pour une compréhension profonde de votre thème natal.

Cordialement,
L'équipe Mon Etoile

---
Cet email a été envoyé automatiquement suite à votre consultation astrologique.
Pour toute question, contactez-nous à support@monetoile.com
    `.trim();
  }

  /**
   * Envoie un email de notification quand l'analyse est prête
   */
  async sendAnalysisReadyEmail(
    email: string,
    prenoms: string,
    nom: string,
    consultationId: string,
  ): Promise<{ success: boolean; error?: string }> {
    // Si Resend n'est pas configuré, simuler l'envoi (mode dev)
    if (!this.resend) {
      return { success: true };
    }

    try {
      const htmlContent = this.generateAnalysisReadyEmail(prenoms, nom, consultationId);
      const textContent = this.generateAnalysisReadyTextEmail(prenoms, nom, consultationId);

      const result = await this.resend.emails.send({
        from: this.FROM_EMAIL,
        to: email,
        subject: '✨ Votre Analyse Astrologique est Prête - Mon Etoile',
        html: htmlContent,
        text: textContent,
      });

      return { success: true };
    } catch (error) {
      console.error('[Email] Erreur envoi email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Teste l'envoi d'email (pour debug)
   */
  async testEmailService(email: string): Promise<void> {
    const result = await this.sendAnalysisReadyEmail(
      email,
      'Test',
      'Utilisateur',
      'test-consultation-id',
    );

    if (result.success) {
      console.log('[Email] ✅ Test réussi');
    } else {
      console.log('[Email] ❌ Test échoué:', result.error);
    }
  }
}
