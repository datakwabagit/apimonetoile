# 🚀 Déploiement - Mon Étoile Backend

Guide complet pour déployer le backend en production.

---

## 🎯 Plateformes Recommandées

### 1. **Railway** ⭐ (Recommandé)
- ✅ Déploiement automatique depuis GitHub
- ✅ MongoDB intégré ou Atlas externe
- ✅ Variables d'environnement faciles
- ✅ HTTPS automatique
- ✅ Plan gratuit généreux

### 2. **Render**
- ✅ Déploiement Git
- ✅ Plan gratuit
- ✅ HTTPS automatique
- ⚠️ Spin down après inactivité (gratuit)

### 3. **Heroku**
- ✅ Mature et stable
- ✅ Add-ons nombreux
- ⚠️ Plus cher que Railway/Render
- ⚠️ Plan gratuit supprimé

### 4. **DigitalOcean App Platform**
- ✅ Performance excellente
- ✅ $5/mois minimum
- ✅ Scaling facile

### 5. **AWS Elastic Beanstalk** ou **EC2**
- ✅ Maximum de contrôle
- ✅ Scalable
- ⚠️ Configuration complexe
- ⚠️ Coûts variables

---

## 🚂 Déploiement sur Railway (Recommandé)

### Prérequis
- Compte GitHub
- Compte Railway : https://railway.app/
- Code sur GitHub repository

### Étapes

#### 1. Préparer le projet

Ajouter `Procfile` (optionnel) :
```
web: npm run start:prod
```

Vérifier `package.json` - script `start:prod` :
```json
{
  "scripts": {
    "start:prod": "node dist/main"
  }
}
```

#### 2. Créer le projet Railway

1. **Se connecter** : https://railway.app/
2. **New Project** → **Deploy from GitHub repo**
3. **Sélectionner** votre repository `mon-etoile-backend`
4. **Confirmer**

#### 3. Configurer les variables d'environnement

Dans Railway Dashboard → Variables :

```env
NODE_ENV=production
PORT=3001
API_PREFIX=api/v1

MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/mon-etoile-prod

JWT_SECRET=votre-super-secret-production-minimum-32-characters
JWT_EXPIRATION=7d
JWT_REFRESH_SECRET=autre-super-secret-production-different
JWT_REFRESH_EXPIRATION=30d

BCRYPT_ROUNDS=12

CORS_ORIGINS=https://mon-etoile.com,https://www.mon-etoile.com

THROTTLE_TTL=60
THROTTLE_LIMIT=10
```

#### 4. Déployer

Railway déploie automatiquement ! ✅

**URL finale** : `https://your-app.railway.app`

#### 5. Configurer le domaine personnalisé (optionnel)

Settings → Domains → Add Custom Domain
- Domaine : `api.monetoile.com`
- Configurer DNS : CNAME vers Railway

---

## 🎨 Déploiement sur Render

### Étapes

#### 1. Créer un Web Service

1. **Dashboard** : https://dashboard.render.com/
2. **New +** → **Web Service**
3. **Connect** votre repo GitHub
4. **Configuration** :
   - Name: `mon-etoile-backend`
   - Environment: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start:prod`
   - Plan: `Free` (pour commencer)

#### 2. Variables d'environnement

Ajouter les mêmes que pour Railway (voir ci-dessus)

#### 3. Déployer

Render build et déploie automatiquement.

**Note** : Plan gratuit spin down après 15 min d'inactivité.

---

## 🐳 Déploiement avec Docker

### Créer un Dockerfile

```dockerfile
# backend/Dockerfile

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
```

### docker-compose.yml (avec MongoDB local)

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/mon-etoile
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:8
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    restart: unless-stopped

volumes:
  mongo-data:
```

### Commandes Docker

```bash
# Build
docker build -t mon-etoile-backend .

# Run
docker run -p 3001:3001 \
  -e MONGODB_URI="mongodb+srv://..." \
  -e JWT_SECRET="..." \
  mon-etoile-backend

# Avec docker-compose
docker-compose up -d
```

---

## ☁️ MongoDB Atlas Configuration Production

### 1. Créer un cluster dédié production

- Séparer développement et production
- Cluster name: `mon-etoile-prod`

### 2. Sécurité

**Database Access** :
- Créer utilisateur dédié : `prod_user`
- Password fort généré
- Rôle : `readWrite` sur database `mon-etoile-prod`

**Network Access** :
- Ajouter IP de Railway/Render/serveur
- Ou `0.0.0.0/0` (moins sécurisé mais nécessaire pour certaines plateformes)

### 3. Récupérer URI

```
mongodb+srv://prod_user:<password>@cluster-prod.xxxxx.mongodb.net/mon-etoile-prod?retryWrites=true&w=majority
```

### 4. Backup automatique

- Activer Continuous Backup (payant)
- Ou configurer snapshots manuels

---

## 🔒 Sécurité Production

### Checklist Essentielle

- [ ] **JWT_SECRET** : Minimum 32 caractères aléatoires
- [ ] **JWT_REFRESH_SECRET** : Différent du JWT_SECRET
- [ ] **BCRYPT_ROUNDS** : 12 (plus sécurisé que 10)
- [ ] **CORS_ORIGINS** : Limiter aux domaines de production
- [ ] **MONGODB_URI** : Utiliser cluster dédié production
- [ ] **HTTPS** : Toujours (fourni par Railway/Render)
- [ ] **Rate Limiting** : Configuré (10 req/min par défaut)
- [ ] **Helmet** : Activé (déjà dans le code)
- [ ] **Variables d'environnement** : Jamais dans le code

### Génération de secrets sécurisés

```bash
# Linux/Mac
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 📊 Monitoring & Logs

### Railway
- **Logs** : Dashboard → Deployments → View logs
- **Metrics** : CPU, Memory, Network

### Render
- **Logs** : Dashboard → Logs
- **Metrics** : CPU, Memory

### Outils externes (recommandés)
- **Sentry** : Error tracking
- **LogRocket** : Session replay
- **DataDog** : APM complet
- **New Relic** : Performance monitoring

---

## 🔄 CI/CD avec GitHub Actions (Optionnel)

### .github/workflows/deploy.yml

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test

      - name: Build
        run: npm run build

      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

---

## 🧪 Tests Pré-Déploiement

```bash
# Tests unitaires
npm run test

# Tests e2e
npm run test:e2e

# Lint
npm run lint

# Build production
npm run build

# Tester build local
NODE_ENV=production node dist/main
```

---

## 📈 Scaling

### Vertical Scaling (Railway/Render)
- Upgrade plan
- Plus de RAM/CPU
- $5-20/mois

### Horizontal Scaling
- Déployer sur plusieurs serveurs
- Load balancer (Nginx, HAProxy)
- Session management avec Redis

### Database Scaling
- MongoDB Atlas : Upgrade tier (M2, M5, M10...)
- Replica sets
- Sharding (très grandes bases)

---

## 🔧 Maintenance

### Mises à jour

```bash
# Dépendances
npm update

# Sécurité
npm audit fix

# Version majeure (prudence)
npm outdated
npm install <package>@latest
```

### Backups

- **MongoDB** : Automatique avec Atlas
- **Code** : GitHub (toujours à jour)
- **Variables d'env** : Sauvegarde sécurisée externe

### Rollback

**Railway/Render** : Redéployer commit précédent
```bash
# Git
git revert <commit-hash>
git push
```

---

## 🌍 Domaine Personnalisé

### Configuration DNS

Pour `api.monetoile.com` :

**Type A** (IP fixe) :
```
A    api    <IP-serveur>
```

**Type CNAME** (Railway/Render) :
```
CNAME    api    your-app.railway.app
```

### SSL/TLS

Railway et Render fournissent HTTPS automatiquement ! ✅

---

## 📱 Tester l'API en Production

```bash
# Health check
curl https://api.monetoile.com/api/v1/

# Register
curl -X POST https://api.monetoile.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Prod",
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'

# Services publics
curl https://api.monetoile.com/api/v1/services
```

---

## 📞 Support Déploiement

### Problèmes courants

**Build failed** :
- Vérifier Node.js version (20.x)
- Vérifier `npm run build` en local

**Cannot connect to MongoDB** :
- Vérifier MONGODB_URI
- Vérifier Network Access (IP autorisée)
- Vérifier Database Access (user/password)

**CORS errors** :
- Vérifier CORS_ORIGINS
- Inclure domaine frontend

**Port error** :
- Railway/Render assignent automatiquement
- Utiliser `process.env.PORT` (déjà dans le code)

---

## 🎯 Checklist Finale Déploiement

- [ ] Code sur GitHub
- [ ] Tests passent
- [ ] MongoDB Atlas production configuré
- [ ] Variables d'environnement définies
- [ ] CORS_ORIGINS correct
- [ ] JWT secrets sécurisés
- [ ] Déploiement sur Railway/Render
- [ ] API accessible (health check)
- [ ] Endpoints testés
- [ ] Domaine personnalisé (optionnel)
- [ ] Monitoring configuré

---

**✨ Votre API est maintenant en production ! ✨**

**Support** : support@monetoile.com
