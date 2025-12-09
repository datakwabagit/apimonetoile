# API Books - Documentation

## Vue d'ensemble

L'API Books permet de gérer l'achat et le téléchargement sécurisé de livres numériques (PDF).

## Endpoints

### 1. Liste des livres disponibles
```
GET /api/v1/books
```
**Accès:** Public

**Réponse:**
```json
{
  "success": true,
  "books": [
    {
      "id": "...",
      "bookId": "secrets-ancestraux",
      "title": "Les Secrets Ancestraux",
      "subtitle": "Sagesse Africaine et Spiritualité",
      "description": "...",
      "price": 5000,
      "pages": 250,
      "category": "Spiritualité",
      "rating": 4.9,
      "coverImage": "/books/secrets-ancestraux.jpg",
      "purchaseCount": 42
    }
  ]
}
```

### 2. Détails d'un livre
```
GET /api/v1/books/:bookId
```
**Accès:** Public

**Exemple:** `GET /api/v1/books/secrets-ancestraux`

### 3. Vérifier un achat
```
POST /api/v1/books/:bookId/check-purchase
```
**Accès:** Public

**Body:**
```json
{
  "phone": "0758385387"
}
```

**Réponse si acheté:**
```json
{
  "success": true,
  "purchased": true,
  "downloadToken": "abc123...",
  "downloadUrl": "/api/v1/books/secrets-ancestraux/download?token=abc123..."
}
```

### 4. Télécharger un livre
```
GET /api/v1/books/:bookId/download?token=xxx
```
**Accès:** Public avec token

Le token est généré automatiquement après l'achat et fourni dans l'URL de téléchargement.

**Réponse:** Fichier PDF en téléchargement direct

### 5. Récupérer les achats d'un utilisateur
```
GET /api/v1/books/user/purchases?phone=0758385387
```
**Accès:** Public

**Réponse:**
```json
{
  "success": true,
  "purchases": [
    {
      "id": "...",
      "bookId": "secrets-ancestraux",
      "bookTitle": "Les Secrets Ancestraux",
      "price": 5000,
      "purchaseDate": "2025-12-09T10:30:00.000Z",
      "downloadCount": 3,
      "lastDownloadAt": "2025-12-09T15:20:00.000Z",
      "downloadUrl": "/api/v1/books/secrets-ancestraux/download?token=..."
    }
  ]
}
```

### 6. Initialiser les livres (Admin)
```
POST /api/v1/books/seed
```
**Accès:** Admin avec permission MANAGE_SERVICES

Crée les 4 livres de base dans la base de données. À exécuter une seule fois.

### 7. Créer un livre (Admin)
```
POST /api/v1/books
```
**Accès:** Admin avec permission MANAGE_SERVICES

**Body:**
```json
{
  "bookId": "nouveau-livre",
  "title": "Titre du Livre",
  "subtitle": "Sous-titre",
  "description": "Description détaillée",
  "price": 5000,
  "pages": 200,
  "category": "Spiritualité",
  "rating": 4.5,
  "coverImage": "/books/nouveau-livre.jpg",
  "pdfFileName": "nouveau-livre.pdf"
}
```

## Flux d'achat complet

1. **Frontend:** L'utilisateur clique sur "Acheter" pour un livre
2. **Frontend:** Envoie une requête de paiement à MoneyFusion avec `productType: 'ebook_pdf'` et `bookId`
3. **MoneyFusion:** Redirige l'utilisateur vers la page de paiement
4. **MoneyFusion:** Callback après paiement validé vers `/api/v1/payments/callback`
5. **Backend:** Détecte que c'est un achat de livre via `paymentData.personal_Info[0].productType === 'ebook_pdf'`
6. **Backend:** Enregistre le paiement et crée un `BookPurchase` avec token unique
7. **Frontend:** Redirigé vers la page de callback avec `?book_id=xxx&type=book`
8. **Frontend:** Vérifie l'achat avec `POST /books/:bookId/check-purchase`
9. **Frontend:** Récupère le `downloadUrl` avec token
10. **Frontend:** Affiche le lien de téléchargement à l'utilisateur
11. **Utilisateur:** Clique sur télécharger
12. **Backend:** Vérifie le token, incrémente les compteurs, envoie le PDF

## Sécurité

- **Token unique:** Chaque achat génère un token crypto-sécurisé (64 caractères hex)
- **Vérification:** Le token est vérifié à chaque téléchargement
- **Expiration:** Possibilité de définir une date d'expiration (actuellement désactivée)
- **Compteurs:** Nombre de téléchargements enregistré pour chaque achat
- **Pas d'accès direct:** Les PDF ne sont pas accessibles directement, uniquement via l'API

## Base de données

### Collection `books`
Stocke les métadonnées des livres disponibles.

### Collection `bookpurchases`
Stocke les achats validés avec tokens de téléchargement.

### Indexes
- `bookId` : Recherche rapide par identifiant
- `downloadToken` : Vérification rapide des tokens
- `userId + bookId` : Vérifier si un utilisateur a déjà acheté
- `customerPhone` : Rechercher les achats par téléphone

## Structure des fichiers

```
backend/
├── src/
│   └── books/
│       ├── schemas/
│       │   ├── book.schema.ts
│       │   └── book-purchase.schema.ts
│       ├── dto/
│       │   ├── create-book.dto.ts
│       │   ├── purchase-book.dto.ts
│       │   └── verify-download.dto.ts
│       ├── books.controller.ts
│       ├── books.service.ts
│       └── books.module.ts
└── public/
    └── books/
        └── pdf/
            ├── secrets-ancestraux.pdf
            ├── astrologie-africaine.pdf
            ├── numerologie-sacree.pdf
            └── rituels-puissance.pdf
```

## Premiers pas

1. **Uploader les PDF:** Placez les fichiers PDF dans `public/books/pdf/`
2. **Initialiser:** Appelez `POST /api/v1/books/seed` (authentifié admin)
3. **Tester:** Consultez `GET /api/v1/books` pour voir les livres
4. **Acheter:** Suivez le flux d'achat depuis le frontend
