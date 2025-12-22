# 🔔 Système de Notifications - Mon Étoile

## 📋 Vue d'ensemble

Le système de notifications permet d'informer les utilisateurs en temps réel des événements importants :
- ✅ **Résultats de consultation disponibles**
- ✅ **Nouvelles connaissances partagées**
- ✅ **Consultations assignées** (pour les consultants)
- ✅ **Paiements confirmés**
- ✅ **Annonces système**

---

## 🎯 Fonctionnalités

### Types de notifications

| Type | Description | Destinataire |
|------|-------------|--------------|
| `CONSULTATION_RESULT` | Résultat de consultation disponible | Client |
| `NEW_KNOWLEDGE` | Nouvelle connaissance partagée | Tous les utilisateurs |
| `CONSULTATION_ASSIGNED` | Consultation assignée | Consultant |
| `PAYMENT_CONFIRMED` | Paiement confirmé | Client |
| `SYSTEM_ANNOUNCEMENT` | Annonce système | Tous/Spécifique |

### Statuts
- **Non lu** (`isRead: false`) - Nouvelle notification
- **Lu** (`isRead: true`) - Notification consultée
- **Expirée** - Auto-suppression après la date `expiresAt`

---

## 📡 API Endpoints

### 1️⃣ Récupérer mes notifications

```http
GET /notifications
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number, optionnel) - Page de pagination (défaut: 1)
- `limit` (number, optionnel) - Nombre par page (défaut: 20)
- `isRead` (boolean, optionnel) - Filtrer par statut lu/non lu
- `type` (NotificationType, optionnel) - Filtrer par type

**Réponse:**
```json
{
  "notifications": [
    {
      "_id": "674a1234567890abcdef1234",
      "userId": "674a1234567890abcdef5678",
      "type": "CONSULTATION_RESULT",
      "title": "Résultat de consultation disponible",
      "message": "Le résultat de votre consultation \"Horoscope Annuel\" est maintenant disponible.",
      "isRead": false,
      "metadata": {
        "consultationId": "674a1234567890abcdef9012",
        "url": "/consultations/674a1234567890abcdef9012"
      },
      "createdAt": "2024-12-06T10:30:00.000Z"
    }
  ],
  "total": 15,
  "unreadCount": 5,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

### 2️⃣ Nombre de notifications non lues

```http
GET /notifications/unread/count
Authorization: Bearer <token>
```

**Réponse:**
```json
5
```

### 3️⃣ Marquer une notification comme lue

```http
PATCH /notifications/:id/read
Authorization: Bearer <token>
```

**Réponse:**
```json
{
  "_id": "674a1234567890abcdef1234",
  "isRead": true,
  "readAt": "2024-12-06T11:00:00.000Z"
}
```

### 4️⃣ Marquer toutes comme lues

```http
POST /notifications/mark-all-read
Authorization: Bearer <token>
```

**Réponse:**
```json
{
  "message": "Toutes les notifications ont été marquées comme lues",
  "modifiedCount": 5
}
```

### 5️⃣ Supprimer une notification

```http
DELETE /notifications/:id
Authorization: Bearer <token>
```

**Réponse:**
```json
{
  "message": "Notification supprimée avec succès"
}
```

### 6️⃣ Supprimer toutes les notifications lues

```http
DELETE /notifications/read/all
Authorization: Bearer <token>
```

**Réponse:**
```json
{
  "message": "Toutes les notifications lues ont été supprimées",
  "deletedCount": 10
}
```

---

## 📚 Module Knowledge (Partage de Connaissances)

### 1️⃣ Créer une connaissance

```http
POST /knowledge
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Les Phases de la Lune et leur influence",
  "content": "La Lune traverse différentes phases...",
  "category": "ASTROLOGIE",
  "tags": ["lune", "astrologie", "influence"],
  "imageUrl": "https://example.com/moon.jpg",
  "isPublished": true
}
```

**Permissions:** CONSULTANT, ADMIN, SUPER_ADMIN

**Réponse:**
```json
{
  "_id": "674a1234567890abcdef1234",
  "title": "Les Phases de la Lune et leur influence",
  "content": "La Lune traverse différentes phases...",
  "category": "ASTROLOGIE",
  "tags": ["lune", "astrologie", "influence"],
  "authorId": {
    "_id": "674a1234567890abcdef5678",
    "firstName": "Marie",
    "lastName": "Dupont",
    "email": "marie@monetoile.org",
    "role": "CONSULTANT"
  },
  "isPublished": true,
  "viewsCount": 0,
  "likesCount": 0,
  "publishedAt": "2024-12-06T10:00:00.000Z",
  "createdAt": "2024-12-06T10:00:00.000Z"
}
```

> 💡 **Note:** Lorsqu'une connaissance est publiée (`isPublished: true`), une notification est créée pour informer les utilisateurs.

### 2️⃣ Récupérer toutes les connaissances (PUBLIC)

```http
GET /knowledge
```

**Query Parameters:**
- `page` (number) - Page de pagination
- `limit` (number) - Nombre par page
- `category` (KnowledgeCategory) - Filtrer par catégorie
- `tag` (string) - Filtrer par tag
- `search` (string) - Recherche dans titre/contenu/tags

**Catégories disponibles:**
- `ASTROLOGIE`
- `NUMEROLOGIE`
- `TAROT`
- `SPIRITUALITE`
- `MEDITATION`
- `DEVELOPPEMENT_PERSONNEL`
- `RITUELS`
- `AUTRES`

### 3️⃣ Mes connaissances

```http
GET /knowledge/my
Authorization: Bearer <token>
```

Retourne toutes les connaissances de l'utilisateur (publiées et brouillons).

### 4️⃣ Connaissances populaires

```http
GET /knowledge/popular?limit=5
```

Retourne les connaissances avec le plus de vues et likes.

### 5️⃣ Dernières connaissances

```http
GET /knowledge/recent?limit=10
```

Retourne les dernières connaissances publiées.

### 6️⃣ Détail d'une connaissance

```http
GET /knowledge/:id
```

Incrémente automatiquement le compteur de vues.

### 7️⃣ Mettre à jour une connaissance

```http
PATCH /knowledge/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Titre mis à jour",
  "isPublished": true
}
```

**Permissions:** Auteur, ADMIN, SUPER_ADMIN

> 💡 **Note:** Si on publie un brouillon (`isPublished: false` → `true`), une notification est créée.

### 8️⃣ Supprimer une connaissance

```http
DELETE /knowledge/:id
Authorization: Bearer <token>
```

**Permissions:** Auteur, ADMIN, SUPER_ADMIN

### 9️⃣ Aimer/Retirer le like

```http
POST /knowledge/:id/like
Authorization: Bearer <token>
```

**Réponse:**
```json
{
  "liked": true,
  "likesCount": 42
}
```

---

## 🔄 Déclenchement Automatique des Notifications

### 1️⃣ Résultat de consultation disponible

**Déclenché lors de:**
```typescript
PATCH /consultations/:id
{
  "status": "COMPLETED",
  "result": "Votre horoscope révèle...",
  "resultData": { /* ... */ }
}
```

**Notification créée:**
- **Type:** `CONSULTATION_RESULT`
- **Destinataire:** Client de la consultation
- **Titre:** "Résultat de consultation disponible"
- **Message:** "Le résultat de votre consultation '[titre]' est maintenant disponible."
- **Metadata:** `{ consultationId, url: "/consultations/:id" }`

### 2️⃣ Nouvelle connaissance partagée

**Déclenché lors de:**
```typescript
POST /knowledge
{
  "title": "...",
  "content": "...",
  "isPublished": true  // ← Publication immédiate
}

// OU

PATCH /knowledge/:id
{
  "isPublished": true  // ← Publication d'un brouillon
}
```

**Notification créée:**
- **Type:** `NEW_KNOWLEDGE`
- **Destinataire:** (À implémenter : tous les utilisateurs abonnés)
- **Titre:** "Nouvelle connaissance partagée"
- **Message:** "Une nouvelle connaissance a été partagée : '[titre]' dans la catégorie [catégorie]."
- **Metadata:** `{ knowledgeId, category, url: "/knowledge/:id" }`

> 🚀 **Future amélioration:** Implémenter un système d'abonnement par catégorie pour envoyer les notifications uniquement aux utilisateurs intéressés.

### 3️⃣ Consultation assignée

**Déclenché lors de:**
```typescript
PATCH /consultations/:id/assign/:consultantId
```

**Notification créée:**
- **Type:** `CONSULTATION_ASSIGNED`
- **Destinataire:** Consultant assigné
- **Titre:** "Nouvelle consultation assignée"
- **Message:** "Une nouvelle consultation vous a été assignée : '[titre]'."
- **Metadata:** `{ consultationId, url: "/consultations/:id" }`

### 4️⃣ Paiement confirmé

**Déclenché lors de:**
```typescript
// À implémenter dans le module Payments
PATCH /payments/:id
{
  "status": "COMPLETED"
}
```

**Service disponible:**
```typescript
notificationsService.createPaymentConfirmedNotification(userId, paymentId, amount)
```

---

## 🎨 Exemple d'intégration Frontend

### React/Vue Component Example

```typescript
// Récupérer les notifications
const { data } = await axios.get('/notifications', {
  params: { page: 1, limit: 10, isRead: false }
});


// Afficher le badge
<NotificationBell count={data.unreadCount} />

// Marquer comme lu au clic
const markAsRead = async (notificationId) => {
  await axios.patch(`/notifications/${notificationId}/read`);
  // Recharger les notifications
};

// Polling (vérifier toutes les 30 secondes)
setInterval(async () => {
  const count = await axios.get('/notifications/unread/count');
  updateBadge(count);
}, 30000);
```

### WebSocket (Recommandé pour temps réel)

Pour une expérience en temps réel, intégrez Socket.IO :

```typescript
// Backend: Émettre lors de la création
io.to(userId).emit('notification', notification);

// Frontend: Écouter
socket.on('notification', (notification) => {
  showToast(notification.title, notification.message);
  updateNotificationList(notification);
});
```

---

## 📊 Schéma de la base de données

### Collection: `notifications`

```typescript
{
  _id: ObjectId
  userId: ObjectId (ref: User)  // Destinataire
  type: String (enum)            // Type de notification
  title: String                  // Titre court
  message: String                // Message descriptif
  isRead: Boolean                // Statut de lecture
  metadata: {                    // Données contextuelles
    consultationId?: String
    knowledgeId?: String
    paymentId?: String
    url?: String
    [key: string]: any
  }
  readAt?: Date                  // Date de lecture
  expiresAt?: Date               // Date d'expiration (TTL)
  createdAt: Date
  updatedAt: Date
}
```

**Indexes:**
- `{ userId: 1, isRead: 1, createdAt: -1 }`
- `{ userId: 1, type: 1 }`
- `{ expiresAt: 1 }` (TTL index pour auto-suppression)

### Collection: `knowledges`

```typescript
{
  _id: ObjectId
  title: String
  content: String                // Contenu long
  category: String (enum)        // Catégorie
  authorId: ObjectId (ref: User) // Auteur
  tags: [String]                 // Tags de recherche
  imageUrl?: String              // Image d'illustration
  isPublished: Boolean           // Publié ou brouillon
  viewsCount: Number             // Nombre de vues
  likesCount: Number             // Nombre de likes
  likedBy: [ObjectId]            // Utilisateurs qui ont aimé
  publishedAt?: Date             // Date de publication
  createdAt: Date
  updatedAt: Date
}
```

**Indexes:**
- `{ category: 1, isPublished: 1, publishedAt: -1 }`
- `{ authorId: 1 }`
- `{ tags: 1 }`
- `{ isPublished: 1, viewsCount: -1 }`

---

## 🚀 Améliorations Futures

### 1️⃣ Système d'abonnement
- Permettre aux utilisateurs de s'abonner à des catégories spécifiques
- Notifications push ciblées

### 2️⃣ WebSocket en temps réel
- Socket.IO pour les notifications instantanées
- Mise à jour automatique du badge

### 3️⃣ Notifications par email
- Envoyer un email pour les notifications importantes
- Préférences utilisateur pour les notifications email

### 4️⃣ Historique et archivage
- Archive automatique après X jours
- Export de l'historique des notifications

### 5️⃣ Système de priorité
- Notifications prioritaires (haute, moyenne, basse)
- Tri par priorité dans la liste

### 6️⃣ Actions rapides
- Boutons d'action directement dans la notification
- Ex: "Voir le résultat", "Ignorer", "Rappeler plus tard"

---

## 🔒 Sécurité

- ✅ Authentification JWT requise pour tous les endpoints (sauf Knowledge public)
- ✅ Les utilisateurs ne peuvent voir que leurs propres notifications
- ✅ Validation des permissions pour créer du contenu Knowledge
- ✅ Rate limiting appliqué globalement
- ✅ TTL (Time To Live) pour auto-suppression des notifications expirées

---

## 📝 Exemples d'utilisation

### Scénario 1: Client reçoit le résultat de sa consultation

1. Admin/Consultant met à jour la consultation avec le résultat
2. Système crée automatiquement une notification pour le client
3. Client se connecte et voit le badge de notification
4. Client clique sur la notification et est redirigé vers la consultation
5. Notification marquée comme lue automatiquement

### Scénario 2: Consultant partage une nouvelle connaissance

1. Consultant crée une nouvelle connaissance et la publie
2. Système crée une notification (structure prête pour diffusion)
3. Tous les utilisateurs intéressés reçoivent la notification
4. Utilisateurs peuvent consulter la connaissance et l'aimer
5. Compteur de vues et likes mis à jour

### Scénario 3: Consultation assignée à un consultant

1. Admin assigne une consultation à un consultant
2. Système crée automatiquement une notification pour le consultant
3. Consultant reçoit la notification et peut prendre en charge la consultation

---

## 💡 Conseils d'implémentation Frontend

### 1️⃣ Polling vs WebSocket

**Polling (Simple):**
```javascript
// Vérifier toutes les 30 secondes
useEffect(() => {
  const interval = setInterval(fetchNotifications, 30000);
  return () => clearInterval(interval);
}, []);
```

**WebSocket (Recommandé):**
```javascript
// Temps réel avec Socket.IO
socket.on('notification', (notification) => {
  setNotifications(prev => [notification, ...prev]);
  setUnreadCount(prev => prev + 1);
});
```

### 2️⃣ Affichage visuel

```jsx
<NotificationIcon>
  {unreadCount > 0 && (
    <Badge>{unreadCount}</Badge>
  )}
</NotificationIcon>

<NotificationList>
  {notifications.map(notif => (
    <NotificationItem 
      key={notif._id}
      isUnread={!notif.isRead}
      onClick={() => handleClick(notif)}
    >
      <Title>{notif.title}</Title>
      <Message>{notif.message}</Message>
      <Time>{formatTime(notif.createdAt)}</Time>
    </NotificationItem>
  ))}
</NotificationList>
```

### 3️⃣ Toast notifications

```javascript
// Afficher un toast pour les nouvelles notifications
socket.on('notification', (notification) => {
  toast.info(notification.message, {
    onClick: () => router.push(notification.metadata.url)
  });
});
```

---

## 🎓 Conclusion

Le système de notifications est maintenant pleinement fonctionnel et intégré avec les modules existants. Il permet une communication efficace avec les utilisateurs et améliore considérablement l'expérience utilisateur de la plateforme Mon Étoile.

**Modules livrés:**
- ✅ NotificationsModule (service, controller, schema)
- ✅ KnowledgeModule (CRUD complet pour partage de connaissances)
- ✅ Intégration automatique avec ConsultationsModule
- ✅ API REST complète et documentée
- ✅ Base prête pour WebSocket temps réel

**Prochaines étapes suggérées:**
1. Implémenter WebSocket pour notifications en temps réel
2. Ajouter système d'abonnement par catégorie
3. Intégrer notifications email
4. Développer le frontend avec React/Vue
