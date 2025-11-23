# 🚀 Installation Complète - Mon Étoile Backend

Guide étape par étape pour installer et configurer le backend.

---

## ⏱️ Temps Estimé

- **Installation** : 5 minutes
- **Configuration MongoDB** : 5 minutes
- **Premier test** : 2 minutes
- **Total** : ~12 minutes

---

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir :

- ✅ **Node.js 20.x ou supérieur** : https://nodejs.org/
- ✅ **npm 10.x ou supérieur** (inclus avec Node.js)
- ✅ **Git** : https://git-scm.com/
- ✅ Compte **MongoDB Atlas** : https://www.mongodb.com/cloud/atlas

### Vérifier les installations

```bash
node --version    # Doit afficher v20.x.x ou supérieur
npm --version     # Doit afficher 10.x.x ou supérieur
git --version     # Doit afficher la version
```

---

## 📥 Étape 1 : Récupérer le Code

### Option A : Clone Git

```bash
git clone <votre-repo-url> mon-etoile-backend
cd mon-etoile-backend
```

### Option B : Téléchargement ZIP

1. Télécharger le fichier ZIP
2. Extraire dans un dossier `mon-etoile-backend`
3. Ouvrir un terminal dans ce dossier

---

## 📦 Étape 2 : Installer les Dépendances

```bash
npm install
```

**Durée** : 1-2 minutes

**Note** : Si vous voyez des warnings, c'est normal. Les erreurs doivent être corrigées.

### Vérifier l'installation

```bash
npm list --depth=0
```

Vous devriez voir toutes les dépendances listées.

---

## 🗄️ Étape 3 : Configurer MongoDB Atlas

### 3.1 Créer un compte MongoDB Atlas

1. Aller sur : https://www.mongodb.com/cloud/atlas
2. Cliquer sur **"Try Free"**
3. Créer un compte (Google/GitHub/Email)

### 3.2 Créer un Cluster

1. **Choisir le plan gratuit** : M0 Sandbox (Free forever)
2. **Sélectionner la région** : La plus proche de vous
3. **Nom du cluster** : `mon-etoile-dev` (ou autre)
4. Cliquer sur **"Create"**
5. **Attendre 3-5 minutes** que le cluster soit créé

### 3.3 Créer un utilisateur de base de données

1. **Security → Database Access**
2. **Add New Database User**
3. **Authentication Method** : Password
4. **Username** : `monetoile_admin` (ou autre)
5. **Password** : Cliquer sur "Autogenerate Secure Password" → **COPIER ET SAUVEGARDER**
6. **Database User Privileges** : Read and write to any database
7. Cliquer sur **"Add User"**

### 3.4 Autoriser l'accès réseau

1. **Security → Network Access**
2. **Add IP Address**
3. **Option 1 (Recommandé pour dev)** : 
   - Cliquer sur "Allow Access from Anywhere"
   - Confirmer (IP: `0.0.0.0/0`)
4. **Option 2 (Plus sécurisé)** :
   - Cliquer sur "Add Current IP Address"
   - Ajouter votre IP
5. Cliquer sur **"Confirm"**

### 3.5 Récupérer l'URI de connexion

1. **Deployment → Database → Clusters**
2. Cliquer sur **"Connect"** pour votre cluster
3. Choisir **"Connect your application"**
4. **Driver** : Node.js
5. **Version** : 6.4 or later
6. **Copier l'URI** :
   ```
   mongodb+srv://monetoile_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
7. **Important** : Remplacer `<password>` par le password sauvegardé précédemment

---

## ⚙️ Étape 4 : Configurer les Variables d'Environnement

### 4.1 Créer le fichier .env

```bash
# Copier le template
cp .env.example .env

# Ou sur Windows
copy .env.example .env
```

### 4.2 Éditer le fichier .env

Ouvrir `.env` avec votre éditeur favori (VS Code, Notepad++, nano, vim...)

**Variables obligatoires à modifier** :

```env
# 1. MONGODB_URI - Coller l'URI de MongoDB Atlas (remplacer <password>)
MONGODB_URI=mongodb+srv://monetoile_admin:VOTRE_PASSWORD_ICI@cluster0.xxxxx.mongodb.net/mon-etoile?retryWrites=true&w=majority

# 2. JWT_SECRET - Générer un secret fort (minimum 32 caractères)
JWT_SECRET=changez-ce-secret-par-quelque-chose-de-tres-long-et-aleatoire-32-chars-minimum

# 3. JWT_REFRESH_SECRET - Générer un autre secret différent
JWT_REFRESH_SECRET=un-autre-secret-tres-long-et-aleatoire-different-du-premier-32-chars-min
```

**Autres variables (optionnelles - valeurs par défaut OK)** :

```env
NODE_ENV=development
PORT=3001
API_PREFIX=api/v1
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
BCRYPT_ROUNDS=10
THROTTLE_TTL=60
THROTTLE_LIMIT=10
```

### 4.3 Générer des secrets sécurisés (Recommandé)

**Option 1 - Linux/Mac** :
```bash
openssl rand -base64 32
```

**Option 2 - Node.js (toutes plateformes)** :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Option 3 - Générateur en ligne** :
https://randomkeygen.com/ (CodeIgniter Encryption Keys)

Copier ces secrets dans `JWT_SECRET` et `JWT_REFRESH_SECRET`

---

## 🔨 Étape 5 : Build du Projet

```bash
npm run build
```

**Durée** : 10-20 secondes

Vérifie que le code TypeScript compile sans erreur.

---

## 🚀 Étape 6 : Démarrer le Serveur

### Mode Développement (avec hot-reload)

```bash
npm run start:dev
```

**Sortie attendue** :

```
[Nest] 12345  - 20/01/2024, 10:30:00   LOG [NestFactory] Starting Nest application...
[Nest] 12345  - 20/01/2024, 10:30:00   LOG [InstanceLoader] AppModule dependencies initialized
[Nest] 12345  - 20/01/2024, 10:30:01   LOG [RoutesResolver] AuthController {/api/v1/auth}:
[Nest] 12345  - 20/01/2024, 10:30:01   LOG [RouterExplorer] Mapped {/api/v1/auth/register, POST} route
...

========================================
🌟 MON ÉTOILE - BACKEND API
========================================
✅ Server running on: http://localhost:3001
📡 API Base URL: http://localhost:3001/api/v1
🌍 Environment: development
🔒 CORS Origins: http://localhost:3000,http://localhost:3001
========================================
```

✅ **Le serveur est démarré !**

---

## 🧪 Étape 7 : Tester l'Installation

### Test 1 : Health Check

**Navigateur** :
Ouvrir http://localhost:3001/api/v1/

**Réponse attendue** :
```json
{
  "status": "ok",
  "message": "Mon Étoile Backend API is running",
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

### Test 2 : Status Endpoint

**Navigateur** :
Ouvrir http://localhost:3001/api/v1/status

**Réponse attendue** :
```json
{
  "api": "Mon Étoile Backend",
  "version": "1.0.0",
  "status": "healthy",
  "uptime": 123.456,
  "environment": "development",
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

### Test 3 : Inscription d'un utilisateur

**Terminal (curl)** :
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

**Réponse attendue** :
```json
{
  "user": {
    "_id": "65abc...",
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "role": "USER",
    "isActive": true
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

✅ **L'API fonctionne parfaitement !**

---

## 🎯 Étapes Suivantes

### 1. Tester tous les endpoints

Voir [API_EXAMPLES.md](./API_EXAMPLES.md) pour des exemples complets.

### 2. Créer un utilisateur ADMIN

**Option A - MongoDB Compass** :
1. Télécharger MongoDB Compass : https://www.mongodb.com/products/compass
2. Se connecter avec l'URI MongoDB Atlas
3. Ouvrir la collection `users`
4. Trouver l'utilisateur créé
5. Modifier le champ `role` : `"USER"` → `"ADMIN"`

**Option B - MongoDB Shell** :
```javascript
db.users.updateOne(
  { email: "test@example.com" },
  { $set: { role: "ADMIN" } }
)
```

### 3. Créer des services

```bash
curl -X POST http://localhost:3001/api/v1/services \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Horoscope Quotidien",
    "slug": "horoscope-quotidien",
    "description": "Votre horoscope personnalisé",
    "type": "HOROSCOPE",
    "price": 15,
    "duration": 30,
    "features": ["Analyse personnalisée", "Prévisions détaillées"]
  }'
```

### 4. Intégrer avec le frontend

Le backend est prêt ! Vous pouvez maintenant :
- Connecter votre frontend Next.js
- Créer des consultations
- Gérer les utilisateurs
- Traiter les paiements

---

## 🐛 Dépannage

### Problème : "Cannot connect to MongoDB"

**Solutions** :
1. Vérifier que `MONGODB_URI` dans `.env` est correct
2. Vérifier que le password ne contient pas de caractères spéciaux non encodés
3. Vérifier Network Access dans MongoDB Atlas (IP autorisée)
4. Vérifier que l'utilisateur existe dans Database Access
5. Tester la connexion avec MongoDB Compass

### Problème : "Port 3001 already in use"

**Solution 1** : Changer le port dans `.env`
```env
PORT=3002
```

**Solution 2** : Trouver et tuer le processus
```bash
# Linux/Mac
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Problème : "Module not found"

**Solution** :
```bash
# Supprimer node_modules et réinstaller
rm -rf node_modules package-lock.json
npm install
```

### Problème : "JWT_SECRET is required"

**Solution** :
Vérifier que le fichier `.env` existe et contient `JWT_SECRET`

### Problème : Build échoue

**Solution** :
```bash
# Nettoyer et rebuild
npm run build
```

Si erreurs TypeScript, vérifier la version de Node.js (20+)

---

## 📚 Documentation

- **README complet** : [README.md](./README.md)
- **Guide rapide** : [QUICKSTART.md](./QUICKSTART.md)
- **Exemples API** : [API_EXAMPLES.md](./API_EXAMPLES.md)
- **Résumé projet** : [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)
- **Guide déploiement** : [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 🆘 Besoin d'Aide ?

- **Email** : support@monetoile.com
- **Documentation NestJS** : https://docs.nestjs.com/
- **MongoDB Atlas Docs** : https://www.mongodb.com/docs/atlas/

---

## ✅ Checklist Installation Complète

- [ ] Node.js 20+ installé
- [ ] Code récupéré (git clone ou ZIP)
- [ ] Dépendances installées (`npm install`)
- [ ] Compte MongoDB Atlas créé
- [ ] Cluster MongoDB créé
- [ ] Utilisateur de DB créé
- [ ] Network Access configuré
- [ ] URI MongoDB récupérée
- [ ] Fichier `.env` créé et configuré
- [ ] JWT secrets générés
- [ ] Build réussi (`npm run build`)
- [ ] Serveur démarré (`npm run start:dev`)
- [ ] Health check OK (http://localhost:3001/api/v1/)
- [ ] Inscription testée (POST /auth/register)

---

**✨ Félicitations ! Votre backend Mon Étoile est opérationnel ! ✨**

**Prochaine étape** : Consulter [API_EXAMPLES.md](./API_EXAMPLES.md) pour tester tous les endpoints.
