# ⚡ Quick Start Guide - Mon Étoile Backend

Guide ultra-rapide pour démarrer le backend en 5 minutes.

## 📋 Checklist Installation

### 1️⃣ Prérequis
- [ ] Node.js 20+ installé
- [ ] MongoDB Atlas account créé
- [ ] Git installé

### 2️⃣ Installation (2 min)

```bash
# Cloner
git clone <repo-url>
cd backend

# Installer
npm install

# Configurer
cp .env.example .env
```

### 3️⃣ Configuration MongoDB Atlas (2 min)

1. **Se connecter** : https://cloud.mongodb.com/
2. **Créer un cluster gratuit** (M0)
3. **Database Access** : Créer un utilisateur
   - Username: `monetoile_admin`
   - Password: Générer un password fort
4. **Network Access** : Ajouter `0.0.0.0/0` (ou votre IP)
5. **Récupérer l'URI** : Clusters → Connect → Connect your application
6. **Copier l'URI** dans `.env` → `MONGODB_URI`

### 4️⃣ Éditer `.env` (1 min)

```env
# Obligatoire
MONGODB_URI=mongodb+srv://monetoile_admin:<password>@cluster0.xxxxx.mongodb.net/mon-etoile?retryWrites=true&w=majority
JWT_SECRET=change-this-super-secret-key-in-production-use-a-long-random-string
JWT_REFRESH_SECRET=another-super-secret-key-for-refresh-tokens-use-a-different-one

# Optionnel (valeurs par défaut OK)
PORT=3001
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

**⚠️ Important** : Remplacer `<password>` par votre password MongoDB Atlas

### 5️⃣ Démarrer (30 sec)

```bash
npm run start:dev
```

✅ **Done!** API disponible sur **http://localhost:3001/api/v1**

---

## 🧪 Tester l'API

### 1. Health Check

```bash
curl http://localhost:3001/api/v1/
```

Réponse attendue :
```json
{
  "status": "ok",
  "message": "Mon Étoile Backend API is running",
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

### 2. Inscription

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

Réponse : `user`, `accessToken`, `refreshToken`

### 3. Connexion

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### 4. Profil (avec token)

```bash
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer <votre-token>"
```

---

## 🔑 Premiers pas

### Créer un utilisateur ADMIN

```typescript
// Via MongoDB Compass ou shell
db.users.updateOne(
  { email: "test@example.com" },
  { $set: { role: "ADMIN" } }
)
```

Ou via l'API (si SUPER_ADMIN existe) :
```bash
curl -X PATCH http://localhost:3001/api/v1/users/:id/role \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"role": "ADMIN"}'
```

### Créer des services

```bash
curl -X POST http://localhost:3001/api/v1/services \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Horoscope Quotidien",
    "slug": "horoscope-quotidien",
    "description": "Votre horoscope personnalisé pour la journée",
    "type": "HOROSCOPE",
    "price": 15,
    "duration": 30,
    "features": [
      "Analyse personnalisée",
      "Prévisions détaillées",
      "Conseils pratiques"
    ]
  }'
```

---

## 📚 Ressources

- **README complet** : [README.md](./README.md)
- **Exemples d'API** : [API_EXAMPLES.md](./API_EXAMPLES.md)
- **Documentation NestJS** : https://docs.nestjs.com/

---

## 🐛 Problèmes courants

### Erreur : "Cannot connect to MongoDB"
➡️ Vérifier :
- [ ] MONGODB_URI correct dans `.env`
- [ ] Password sans caractères spéciaux non encodés
- [ ] Network Access autorisé (0.0.0.0/0 ou votre IP)
- [ ] Utilisateur créé dans Database Access

### Erreur : "Port 3001 already in use"
➡️ Changer le port dans `.env` :
```env
PORT=3002
```

### Erreur : "Invalid token"
➡️ Vérifier :
- [ ] Token présent dans header `Authorization: Bearer <token>`
- [ ] Token non expiré (7 jours par défaut)
- [ ] JWT_SECRET identique entre générations

---

## 🎯 Prochaines étapes

1. ✅ Tester tous les endpoints
2. ✅ Créer des utilisateurs avec différents rôles
3. ✅ Créer des services dans le catalogue
4. ✅ Tester le flow complet : inscription → consultation → paiement
5. ✅ Intégrer avec le frontend Next.js

---

**✨ Bon développement ! ✨**
