# Paiements - Nouveaux Endpoints Backend

## Vue d'ensemble

Les traitements de paiements sont maintenant gérés par le backend NestJS pour des raisons de sécurité:
- Les clés MoneyFusion restent sécurisées côté serveur
- Validation robuste des paiements avant créer ressources
- Génération sécurisée des tokens de téléchargement
- Traçabilité complète des transactions

---

## Endpoints

### 1. Vérifier un paiement
```http
GET /api/v1/payments/verify?token=abc123def456
```

**Description**: Vérifie le statut d'un paiement MoneyFusion via le backend sécurisé.

**Query Parameters**:
- `token` (string, required): Token MoneyFusion du paiement

**Response** (200 OK):
```json
{
  "success": true,
  "status": "COMPLETED",
  "message": "Paiement vérifié avec succès",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "amount": 5000,
    "status": "COMPLETED",
    "method": "MONEYFUSION"
  }
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "status": "error",
  "message": "Token de paiement invalide ou expiré"
}
```

---

### 2. Traiter un paiement de consultation
```http
POST /api/v1/payments/process-consultation
Content-Type: application/json

{
  "token": "abc123def456",
  "paymentData": {
    "Montant": 5000,
    "statut": "COMPLETED",
    "personal_Info": [
      {
        "consultationId": "507f1f77bcf86cd799439012",
        "userId": "507f1f77bcf86cd799439013",
        "formData": {
          "nom": "Dupont",
          "prenoms": "Jean",
          "dateNaissance": "1990-01-15",
          "heureNaissance": "14:30",
          "villeNaissance": "Paris",
          "paysNaissance": "France",
          "genre": "M",
          "email": "jean@example.com"
        }
      }
    ]
  }
}
```

**Description**: 
1. Vérifie le paiement via MoneyFusion
2. Enregistre le paiement dans la base de données
3. Prépare la consultation pour l'analyse
4. Retourne les infos pour lancer la génération d'analyse

**Request Body**:
- `token` (string, required): Token MoneyFusion
- `paymentData` (object, required): Données de paiement de MoneyFusion

**Response** (200 OK):
```json
{
  "success": true,
  "status": "paid",
  "consultationId": "507f1f77bcf86cd799439012",
  "message": "Paiement de consultation traité avec succès",
  "data": {
    "paymentId": "507f1f77bcf86cd799439014",
    "amount": 5000,
    "reference": "TXN-2024-001"
  }
}
```

**Next Steps**:
Après recevoir cette réponse, le frontend peut:
1. Appeler `POST /api/v1/consultations/{consultationId}/generate-analysis` pour générer l'analyse
2. Rediriger vers `/consultations/{consultationId}` pour voir la consultation

---

### 3. Traiter un paiement de livre
```http
POST /api/v1/payments/process-book
Content-Type: application/json

{
  "token": "abc123def456",
  "paymentData": {
    "Montant": 3500,
    "statut": "COMPLETED",
    "personal_Info": [
      {
        "bookId": "astrologie-vedique",
        "userId": "507f1f77bcf86cd799439013"
      }
    ]
  }
}
```

**Description**: 
1. Vérifie le paiement via MoneyFusion
2. Enregistre le paiement dans la base de données
3. Marque le livre comme acheté pour l'utilisateur
4. Génère un token de téléchargement sécurisé
5. Retourne le lien de téléchargement

**Request Body**:
- `token` (string, required): Token MoneyFusion
- `paymentData` (object, required): Données de paiement incluant bookId

**Response** (200 OK):
```json
{
  "success": true,
  "status": "paid",
  "bookId": "astrologie-vedique",
  "downloadUrl": "/api/v1/books/astrologie-vedique/download?token=YXN0cm9sb2dpZS12ZWRpcXVlOmFiYzEyM2RlZjQ1Ng==",
  "message": "Paiement du livre traité avec succès",
  "data": {
    "paymentId": "507f1f77bcf86cd799439015",
    "amount": 3500,
    "reference": "TXN-2024-002"
  }
}
```

**Download**:
Le frontend peut directement rediriger vers `downloadUrl` pour télécharger le PDF.

---

## Diagramme du flux

### Consultation
```
Frontend                          Backend                 MoneyFusion
   |                               |                           |
   +--[1] Vérifier payment ------->|                           |
   |      GET /verify              |                           |
   |      token=xxx                +---[1a] Appel API -------->|
   |                               |                           |
   |<----[1a] Response valid ------+<---- Response OK ---------|
   |                               |
   |--[2] Traiter paiement ------->|
   |      POST /process-            |
   |      consultation              |
   |      token + formData          +---[2a] Créer Payment
   |                               |        dans DB
   |<----[2] Consultation Ready ----+
   |      consultationId            |
   |                               |
   +--[3] Générer analyse ------->|
   |      POST /{id}/               |
   |      generate-analysis         +---[3a] Appel DeepSeek
   |                               |       (long process)
   |<----[3] Analyse Ready --------+
```

### Livre
```
Frontend                          Backend                 MoneyFusion
   |                               |                           |
   +--[1] Vérifier payment ------->|                           |
   |      GET /verify              |                           |
   |      token=xxx                +---[1a] Appel API -------->|
   |                               |                           |
   |<----[1a] Response valid ------+<---- Response OK ---------|
   |                               |
   |--[2] Traiter paiement ------->|
   |      POST /process-book        |
   |      token + bookId            +---[2a] Créer Payment
   |                               |        Enregistrer achat
   |                               |        Générer token
   |<----[2] Download Ready -------+
   |      downloadUrl              |
   |                               |
   +--[3] Télécharger livre ------>|
   |      GET /download            |
   |      ?token=xxx               +---[3a] Valider token
   |                               |        Vérifier achat
   |<----[3] PDF file! -------+    |
   |                          |    |
   +-- Sauvegarde locale -----+
```

---

## Sécurité

### ✅ Points de sécurité

1. **Backend Gateway**
   - Tous les appels MoneyFusion se font via NestJS
   - Clés API protégées dans les variables d'environnement
   - Pas d'exposition des tokens au frontend

2. **Validation robuste**
   - Vérification que le token n'a pas été utilisé avant
   - Validation des structures de données
   - Gestion des erreurs cohérente

3. **Tokens de téléchargement**
   - Générés aléatoirement par le backend
   - Encodés en base64
   - Expirent après 30 jours ou après N téléchargements

4. **Audit trail**
   - Tous les paiements enregistrés en base
   - Logs détaillés des opérations
   - Traçabilité complète des transactions

---

## Migration du frontend

### Ancien code
```typescript
// ❌ ANCIEN - Danger de sécurité!
const response = await fetch(
  `https://www.pay.moneyfusion.net/paiementNotif/${paymentToken}`
);
```

### Nouveau code
```typescript
// ✅ NOUVEAU - Sécurisé
const { verifyPayment } = usePaymentVerification();
const result = await verifyPayment(paymentToken);
```

---

## Codes d'erreur

| Code | Meaning | Solution |
|------|---------|----------|
| 200 | Success | ✅ Procéder |
| 400 | Bad Request | Vérifier les paramètres |
| 404 | Not Found | Consultation/Livre n'existe pas |
| 500 | Server Error | Contacter support |

---

## Variables d'environnement requises

Backend `.env`:
```env
# MoneyFusion
MONEYFUSION_API_URL=https://www.pay.moneyfusion.net
MONEYFUSION_TIMEOUT=10000

# Database
MONGODB_URI=mongodb://...

# Email (optionnel, pour notifications)
SMTP_HOST=...
```

Frontend `.env.local`:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Tests

### Test de vérification
```bash
curl -X GET "http://localhost:3000/api/v1/payments/verify?token=test_token"
```

### Test de paiement consultation
```bash
curl -X POST "http://localhost:3000/api/v1/payments/process-consultation" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test_token",
    "paymentData": {
      "Montant": 5000,
      "personal_Info": [{"consultationId": "xxx"}]
    }
  }'
```

---

## Support

- 📧 Email: support@monetoile.org
- 🐛 Issues: GitHub Issues
- 📚 Docs: https://docs.monetoile.org/payments
