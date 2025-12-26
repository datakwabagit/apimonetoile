import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';

@ApiTags('Admin')
@Controller('admin')
export class HoroscopeController {
  constructor(private readonly configService: ConfigService) {}

  @Post('generate-horoscope')
  @ApiOperation({ summary: 'Générer un horoscope via DeepSeek' })
  @ApiResponse({ status: 200, description: 'Horoscope généré avec succès.' })
  async generateHoroscope(@Body() body: any) {
    const DEEPSEEK_API_KEY = this.configService.get<string>('DEEPSEEK_API_KEY') || '';
    const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

    const SYSTEM_PROMPT = `Tu es un astrologue professionnel expert spécialisé dans l'astrologie africaine et moderne. Tu génères des horoscopes précis, profonds et inspirants qui intègrent la sagesse ancestrale africaine. Tes prédictions sont empathiques, pratiques et riches en insights spirituels.`;

    const generateHoroscopePrompt = (req: any): string => {
      const date = new Date(req.birthDate);
      let periodContext = '';
      switch(req.horoscopeType) {
        case 'Quotidien':
          periodContext = `pour aujourd'hui ${date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
          break;
        case 'Mensuel':
          periodContext = `pour le mois de ${date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
          break;
        case 'Annuel':
          periodContext = `pour l'année ${date.getFullYear()}`;
          break;
        case 'Amoureux':
          periodContext = req.partnerSign 
            ? `concernant la compatibilité amoureuse avec le signe ${req.partnerSign}`
            : `concernant les prévisions sentimentales`;
          break;
      }
      return `Génère un horoscope ${req.horoscopeType.toLowerCase()} ${periodContext} pour le signe ${req.zodiacSign} (élément ${req.element}).\n\n${req.partnerSign ? `Analyse la compatibilité avec ${req.partnerSign}.` : ''}\n\nSTRUCTURE ATTENDUE (réponds UNIQUEMENT en JSON valide) :\n\n{\n  "generalForecast": "Prévision générale détaillée intégrant l'énergie cosmique actuelle et la sagesse africaine (3-4 phrases)",\n  "love": "Prévisions amoureuses ${req.partnerSign ? `en analysant la synergie avec ${req.partnerSign}` : ''} (2-3 phrases)",\n  "work": "Prévisions professionnelles et conseils carrière (2-3 phrases)",\n  "health": "Conseils santé et bien-être énergétique (2-3 phrases)",\n  "spiritualAdvice": "Un proverbe ou sagesse africaine authentique pertinent avec sa source (ex: Proverbe Bambara, Yoruba, Swahili, Akan, etc.)",\n  "luckyColor": "Couleur porte-bonheur spécifique (ex: Rouge rubis et or)",\n  "dominantPlanet": "Planète dominante avec son influence (ex: Mars (énergie et action))"\n}\n\nEXIGENCES :\n- Intègre des références authentiques à la sagesse africaine (proverbes Bambara, Yoruba, Swahili, Akan, Peul, Wolof, Zoulou, etc.)\n- Sois précis sur les énergies planétaires actuelles\n- Adopte un ton empathique et inspirant\n- Fournis des conseils pratiques et actionnables\n- ${req.partnerSign ? 'Analyse en profondeur la dynamique relationnelle entre les deux signes' : ''}`;
    };

    if (!DEEPSEEK_API_KEY) {
      return { success: false, error: 'DEEPSEEK_API_KEY non configurée' };
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: generateHoroscopePrompt(body) }
    ];

    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature: 0.8,
          max_tokens: 2000,
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Erreur DeepSeek API: ${response.status} - ${errorText}` };
      }
      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      let horoscopeData;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          horoscopeData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Pas de JSON valide dans la réponse');
        }
      } catch (parseError) {
        return { success: false, error: 'Format de réponse invalide' };
      }
      const date = new Date(body.birthDate);
      let periodText = '';
      switch(body.horoscopeType) {
        case 'Quotidien':
          periodText = date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          break;
        case 'Mensuel':
          periodText = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
          break;
        case 'Annuel':
          periodText = `Année ${date.getFullYear()}`;
          break;
        case 'Amoureux':
          periodText = 'Prévisions sentimentales';
          break;
      }
      const horoscope = {
        zodiacSign: body.zodiacSign,
        symbol: body.symbol,
        element: body.element,
        period: periodText,
        horoscopeType: body.horoscopeType,
        generalForecast: horoscopeData.generalForecast,
        love: horoscopeData.love,
        work: horoscopeData.work,
        health: horoscopeData.health,
        spiritualAdvice: horoscopeData.spiritualAdvice,
        luckyColor: horoscopeData.luckyColor,
        dominantPlanet: horoscopeData.dominantPlanet,
      };
      return { success: true, horoscope };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }
}
