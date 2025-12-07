# Configuration des Timeouts

## Backend (NestJS)

### Timeout Serveur HTTP
- **Durée**: 180 secondes (3 minutes)
- **Fichier**: `src/main.ts`
- **Raison**: La génération d'analyse astrologique via DeepSeek AI peut prendre jusqu'à 2 minutes

### Timeout API DeepSeek
- **Durée**: 120 secondes (2 minutes)
- **Fichier**: `src/consultations/deepseek.service.ts`
- **Raison**: Temps maximum pour obtenir une réponse de l'API DeepSeek

## Frontend (Next.js)

### Configuration Axios/Fetch

Pour les appels à l'endpoint de génération d'analyse, configurez le timeout à **150 secondes** minimum :

```typescript
// Dans votre fichier API client
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3001/api/v1',
  timeout: 150000, // 150 secondes = 2.5 minutes
  headers: {
    'Content-Type': 'application/json',
  },
});

// OU avec fetch natif
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
  signal: AbortSignal.timeout(150000), // 150 secondes
});
```

### Exemple d'utilisation pour génération d'analyse

```typescript
try {
  const response = await apiClient.post(
    `/consultations/${consultationId}/generate-analysis`,
    { birthData },
    { 
      timeout: 150000, // 2.5 minutes
      onUploadProgress: (progressEvent) => {
        // Optionnel: afficher progression
        console.log('En cours...');
      }
    }
  );
  
  const analyse = response.data.analyse;
  // Traiter l'analyse...
  
} catch (error) {
  if (error.code === 'ECONNABORTED') {
    console.error('Timeout: La génération a pris trop de temps');
  } else {
    console.error('Erreur:', error.message);
  }
}
```

## Recommandations Frontend

1. **Afficher un loader pendant la génération**
   - Message: "Génération de votre analyse en cours..."
   - Durée estimée: 1-2 minutes
   - Animation pour rassurer l'utilisateur

2. **Implémenter un système de retry**
   ```typescript
   async function generateWithRetry(maxRetries = 2) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await generateAnalysis();
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, 5000));
       }
     }
   }
   ```

3. **Gérer les erreurs spécifiques**
   - 408 Request Timeout: "La génération a pris trop de temps, réessayez"
   - 503 Service Unavailable: "Service temporairement indisponible"
   - 502 Bad Gateway: "Erreur de connexion à l'IA"

## Environnement de Production

### Optimisations recommandées

1. **Load Balancer**: Configurer timeout à 200 secondes
2. **Nginx/Apache**: 
   ```nginx
   proxy_read_timeout 180s;
   proxy_connect_timeout 180s;
   proxy_send_timeout 180s;
   ```
3. **Cloudflare/CDN**: Vérifier que le timeout proxy est >= 180s

### Monitoring

- Surveiller les métriques de temps de réponse de DeepSeek
- Alerter si > 100 secondes en moyenne
- Logs automatiques des timeouts dans `deepseek.service.ts`
