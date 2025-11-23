# 📚 API Examples - Mon Étoile Backend

Exemples pratiques d'utilisation de l'API avec `curl` et JavaScript.

---

## 🔐 Authentification

### Inscription

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Marie",
    "lastName": "Dupont",
    "email": "marie@example.com",
    "password": "SecurePass123!"
  }'
```

**Réponse** :
```json
{
  "user": {
    "_id": "65a1b2c3d4e5f6789012345",
    "firstName": "Marie",
    "lastName": "Dupont",
    "email": "marie@example.com",
    "role": "USER",
    "isActive": true
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Connexion

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "marie@example.com",
    "password": "SecurePass123!"
  }'
```

### Mon profil

```bash
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## 👥 Utilisateurs

### Créer un utilisateur (ADMIN)

```bash
curl -X POST http://localhost:3001/api/v1/users \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jean",
    "lastName": "Consultant",
    "email": "jean@example.com",
    "password": "ConsultantPass123!",
    "role": "CONSULTANT",
    "specialties": ["Horoscope", "Numérologie"],
    "bio": "Consultant spirituel avec 10 ans dexpérience"
  }'
```

### Liste des utilisateurs (avec filtres)

```bash
# Tous les utilisateurs (page 1, 10 par page)
curl "http://localhost:3001/api/v1/users?page=1&limit=10" \
  -H "Authorization: Bearer <admin-token>"

# Filtrer par rôle
curl "http://localhost:3001/api/v1/users?role=CONSULTANT" \
  -H "Authorization: Bearer <admin-token>"

# Recherche
curl "http://localhost:3001/api/v1/users?search=marie" \
  -H "Authorization: Bearer <admin-token>"
```

### Modifier son profil

```bash
curl -X PATCH http://localhost:3001/api/v1/users/me \
  -H "Authorization: Bearer <user-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+33612345678",
    "city": "Paris",
    "country": "France"
  }'
```

### Changer son password

```bash
curl -X PATCH http://localhost:3001/api/v1/users/me/password \
  -H "Authorization: Bearer <user-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "SecurePass123!",
    "newPassword": "NewSecurePass456!"
  }'
```

### Assigner un rôle (ADMIN)

```bash
curl -X PATCH http://localhost:3001/api/v1/users/65a1b2c3d4e5f6789012345/role \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"role": "CONSULTANT"}'
```

---

## 🔮 Consultations

### Créer une consultation

```bash
curl -X POST http://localhost:3001/api/v1/consultations \
  -H "Authorization: Bearer <user-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "65a1b2c3d4e5f6789abcdef",
    "type": "HOROSCOPE",
    "title": "Horoscope annuel 2024",
    "description": "Je souhaite connaître mes prévisions pour lannée 2024",
    "formData": {
      "firstName": "Marie",
      "lastName": "Dupont",
      "dateOfBirth": "1990-05-15T00:00:00.000Z",
      "question": "Quelles opportunités professionnelles mattendent cette année ?"
    },
    "price": 75
  }'
```

### Mes consultations

```bash
curl "http://localhost:3001/api/v1/consultations/my?page=1&limit=10" \
  -H "Authorization: Bearer <user-token>"
```

### Toutes les consultations (ADMIN/CONSULTANT)

```bash
# Toutes
curl "http://localhost:3001/api/v1/consultations" \
  -H "Authorization: Bearer <admin-token>"

# Filtrer par statut
curl "http://localhost:3001/api/v1/consultations?status=PENDING" \
  -H "Authorization: Bearer <admin-token>"

# Filtrer par type
curl "http://localhost:3001/api/v1/consultations?type=HOROSCOPE" \
  -H "Authorization: Bearer <admin-token>"
```

### Consultations attribuées (CONSULTANT)

```bash
curl "http://localhost:3001/api/v1/consultations/assigned" \
  -H "Authorization: Bearer <consultant-token>"
```

### Attribuer une consultation (ADMIN)

```bash
curl -X PATCH http://localhost:3001/api/v1/consultations/65a1b2c3d4e5f6789012345/assign/65a1b2c3d4e5f6789consultant \
  -H "Authorization: Bearer <admin-token>"
```

### Mettre à jour une consultation (résultat)

```bash
curl -X PATCH http://localhost:3001/api/v1/consultations/65a1b2c3d4e5f6789012345 \
  -H "Authorization: Bearer <consultant-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED",
    "result": "Voici votre horoscope détaillé pour 2024...",
    "resultData": {
      "horoscope": {
        "sign": "Taurus",
        "element": "Earth",
        "predictions": {
          "love": "Année favorable pour les rencontres...",
          "work": "Opportunités de promotion au printemps...",
          "health": "Énergie au top en été..."
        }
      }
    },
    "notes": "Client très satisfait, consultation de 90 min"
  }'
```

### Ajouter une évaluation (CLIENT)

```bash
curl -X PATCH http://localhost:3001/api/v1/consultations/65a1b2c3d4e5f6789012345 \
  -H "Authorization: Bearer <user-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "review": "Excellente consultation ! Très précis et à lécoute."
  }'
```

---

## 📦 Services

### Liste des services (PUBLIC)

```bash
# Tous les services actifs
curl "http://localhost:3001/api/v1/services?isActive=true"

# Filtrer par type
curl "http://localhost:3001/api/v1/services?type=HOROSCOPE"

# Pagination
curl "http://localhost:3001/api/v1/services?page=1&limit=20"
```

### Service par ID (PUBLIC)

```bash
curl "http://localhost:3001/api/v1/services/65a1b2c3d4e5f6789abcdef"
```

### Service par slug (PUBLIC)

```bash
curl "http://localhost:3001/api/v1/services/slug/horoscope-quotidien"
```

### Créer un service (ADMIN)

```bash
curl -X POST http://localhost:3001/api/v1/services \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Numérologie Complète",
    "slug": "numerologie-complete",
    "description": "Analyse numérologique approfondie de votre personnalité",
    "longDescription": "Découvrez les secrets de votre chemin de vie, votre nombre dexpression...",
    "type": "NUMEROLOGIE",
    "price": 85,
    "discountPrice": 69,
    "duration": 90,
    "imageUrl": "https://example.com/numerologie.jpg",
    "features": [
      "Calcul du chemin de vie",
      "Nombre dexpression",
      "Nombre intime",
      "Année personnelle",
      "Conseils personnalisés"
    ],
    "isActive": true,
    "isFeatured": true
  }'
```

### Modifier un service (ADMIN)

```bash
curl -X PATCH http://localhost:3001/api/v1/services/65a1b2c3d4e5f6789abcdef \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 79,
    "isFeatured": false
  }'
```

---

## 💳 Paiements

### Créer un paiement

```bash
curl -X POST http://localhost:3001/api/v1/payments \
  -H "Authorization: Bearer <user-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "consultationId": "65a1b2c3d4e5f6789012345",
    "amount": 75,
    "currency": "EUR",
    "method": "STRIPE",
    "metadata": {
      "stripePaymentIntentId": "pi_1234567890"
    }
  }'
```

### Mes paiements

```bash
curl "http://localhost:3001/api/v1/payments/my?page=1&limit=10" \
  -H "Authorization: Bearer <user-token>"
```

### Tous les paiements (ADMIN)

```bash
# Tous
curl "http://localhost:3001/api/v1/payments" \
  -H "Authorization: Bearer <admin-token>"

# Filtrer par statut
curl "http://localhost:3001/api/v1/payments?status=COMPLETED" \
  -H "Authorization: Bearer <admin-token>"
```

### Mettre à jour un paiement (ADMIN)

```bash
curl -X PATCH http://localhost:3001/api/v1/payments/65a1b2c3d4e5f6789payment \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED",
    "transactionId": "txn_1234567890"
  }'
```

### Statistiques paiements (ADMIN)

```bash
curl "http://localhost:3001/api/v1/payments/statistics" \
  -H "Authorization: Bearer <admin-token>"
```

---

## 📊 Statistiques

### Statistiques utilisateurs (ADMIN)

```bash
curl "http://localhost:3001/api/v1/users/statistics" \
  -H "Authorization: Bearer <admin-token>"
```

**Réponse** :
```json
{
  "totalUsers": 150,
  "activeUsers": 142,
  "inactiveUsers": 8,
  "usersByRole": {
    "USER": 120,
    "CONSULTANT": 25,
    "ADMIN": 4,
    "SUPER_ADMIN": 1
  }
}
```

### Statistiques consultations (ADMIN)

```bash
curl "http://localhost:3001/api/v1/consultations/statistics" \
  -H "Authorization: Bearer <admin-token>"
```

**Réponse** :
```json
{
  "total": 320,
  "byStatus": {
    "PENDING": 15,
    "ASSIGNED": 8,
    "IN_PROGRESS": 12,
    "COMPLETED": 275,
    "CANCELLED": 10
  },
  "byType": {
    "HOROSCOPE": 150,
    "NUMEROLOGIE": 80,
    "VIE_PERSONNELLE": 45,
    "RELATIONS": 30,
    "PROFESSIONNEL": 15
  },
  "avgRating": 4.7,
  "totalRevenue": 18750
}
```

---

## 🌐 JavaScript / Fetch Examples

### Inscription

```javascript
const register = async () => {
  const response = await fetch('http://localhost:3001/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Marie',
      lastName: 'Dupont',
      email: 'marie@example.com',
      password: 'SecurePass123!'
    })
  });
  
  const data = await response.json();
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data;
};
```

### Requête authentifiée

```javascript
const getMyProfile = async () => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch('http://localhost:3001/api/v1/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
};
```

### Créer une consultation

```javascript
const createConsultation = async (consultationData) => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch('http://localhost:3001/api/v1/consultations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(consultationData)
  });
  
  return response.json();
};
```

---

## 🔄 Rafraîchir le token

```javascript
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  const response = await fetch('http://localhost:3001/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  
  const data = await response.json();
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  
  return data;
};
```

---

**✨ Happy coding! ✨**
