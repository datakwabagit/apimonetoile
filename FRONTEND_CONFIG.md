# Configuration Frontend

## Problème détecté

Le frontend Next.js appelle les endpoints sur `http://localhost:3000/api/consultations/...` mais le backend NestJS tourne sur `http://localhost:3001/api/v1/consultations/...`

## Solution

Le frontend doit être configuré pour utiliser la bonne URL de l'API backend.

### Configuration requise côté Frontend

Ajouter dans le fichier `.env.local` du frontend :

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### Modifier le client API

Dans `lib/api/client.ts` ou fichier similaire du frontend, s'assurer que :

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### URLs des Endpoints

Tous les appels API doivent utiliser le client configuré :

```typescript
// ✅ Correct
api.get('/consultations')  // → http://localhost:3001/api/v1/consultations

// ❌ Incorrect
fetch('/api/consultations')  // → http://localhost:3000/api/consultations (mauvais serveur)
```

## Endpoints Backend disponibles

- `GET /consultations` - Liste des consultations
- `GET /consultations/:id` - Détails d'une consultation
- `POST /consultations` - Créer une consultation
- `POST /consultations/:id/generate-analysis` - Générer l'analyse
- `GET /consultations/:id/generate-analysis` - Récupérer l'analyse générée
- `POST /consultations/:id/save-analysis` - Sauvegarder l'analyse

## Ports

- **Frontend Next.js:** Port 3000
- **Backend NestJS:** Port 3001
- **Préfixe API:** `/api/v1`

## CORS

Le backend est configuré pour accepter les requêtes depuis :
- `http://localhost:3000` (développement local)
- `https://www.monetoile.org` (production)
- `https://monetoile.org` (production)
