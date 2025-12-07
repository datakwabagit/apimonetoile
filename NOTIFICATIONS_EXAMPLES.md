# 🔔 Exemples API - Notifications et Connaissances

## Notifications

### 📥 Récupérer toutes mes notifications (non lues)

```bash
curl -X GET "http://localhost:3000/notifications?isRead=false&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

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
      "createdAt": "2024-12-06T10:30:00.000Z",
      "updatedAt": "2024-12-06T10:30:00.000Z"
    }
  ],
  "total": 3,
  "unreadCount": 3,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### 🔢 Nombre de notifications non lues

```bash
curl -X GET "http://localhost:3000/notifications/unread/count" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Réponse:**
```json
5
```

### ✅ Marquer une notification comme lue

```bash
curl -X PATCH "http://localhost:3000/notifications/674a1234567890abcdef1234/read" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Réponse:**
```json
{
  "_id": "674a1234567890abcdef1234",
  "userId": "674a1234567890abcdef5678",
  "type": "CONSULTATION_RESULT",
  "title": "Résultat de consultation disponible",
  "message": "Le résultat de votre consultation \"Horoscope Annuel\" est maintenant disponible.",
  "isRead": true,
  "readAt": "2024-12-06T11:00:00.000Z",
  "metadata": {
    "consultationId": "674a1234567890abcdef9012",
    "url": "/consultations/674a1234567890abcdef9012"
  },
  "createdAt": "2024-12-06T10:30:00.000Z",
  "updatedAt": "2024-12-06T11:00:00.000Z"
}
```

### ✅✅ Marquer toutes comme lues

```bash
curl -X POST "http://localhost:3000/notifications/mark-all-read" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Réponse:**
```json
{
  "message": "Toutes les notifications ont été marquées comme lues",
  "modifiedCount": 5
}
```

### 🗑️ Supprimer une notification

```bash
curl -X DELETE "http://localhost:3000/notifications/674a1234567890abcdef1234" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Réponse:**
```json
{
  "message": "Notification supprimée avec succès"
}
```

### 🗑️🗑️ Supprimer toutes les notifications lues

```bash
curl -X DELETE "http://localhost:3000/notifications/read/all" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Réponse:**
```json
{
  "message": "Toutes les notifications lues ont été supprimées",
  "deletedCount": 10
}
```

---

## Connaissances (Knowledge)

### 📝 Créer une nouvelle connaissance (CONSULTANT/ADMIN)

```bash
curl -X POST "http://localhost:3000/knowledge" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Les Phases de la Lune et leur influence spirituelle",
    "content": "La Lune traverse différentes phases qui influencent notre vie spirituelle...",
    "category": "ASTROLOGIE",
    "tags": ["lune", "astrologie", "phases", "influence"],
    "imageUrl": "https://example.com/moon-phases.jpg",
    "isPublished": true
  }'
```

**Réponse:**
```json
{
  "_id": "674a1234567890abcdef1234",
  "title": "Les Phases de la Lune et leur influence spirituelle",
  "content": "La Lune traverse différentes phases qui influencent notre vie spirituelle...",
  "category": "ASTROLOGIE",
  "authorId": {
    "_id": "674a1234567890abcdef5678",
    "firstName": "Marie",
    "lastName": "Dubois",
    "email": "marie@monetoile.org",
    "role": "CONSULTANT"
  },
  "tags": ["lune", "astrologie", "phases", "influence"],
  "imageUrl": "https://example.com/moon-phases.jpg",
  "isPublished": true,
  "viewsCount": 0,
  "likesCount": 0,
  "likedBy": [],
  "publishedAt": "2024-12-06T10:00:00.000Z",
  "createdAt": "2024-12-06T10:00:00.000Z",
  "updatedAt": "2024-12-06T10:00:00.000Z"
}
```

> 💡 **Note:** Une notification est automatiquement créée pour informer les utilisateurs de cette nouvelle connaissance.

### 📚 Récupérer toutes les connaissances (PUBLIC)

```bash
curl -X GET "http://localhost:3000/knowledge?page=1&limit=10"
```

**Avec filtres:**
```bash
curl -X GET "http://localhost:3000/knowledge?category=ASTROLOGIE&search=lune&page=1&limit=5"
```

**Réponse:**
```json
{
  "knowledges": [
    {
      "_id": "674a1234567890abcdef1234",
      "title": "Les Phases de la Lune et leur influence spirituelle",
      "content": "La Lune traverse différentes phases...",
      "category": "ASTROLOGIE",
      "authorId": {
        "_id": "674a1234567890abcdef5678",
        "firstName": "Marie",
        "lastName": "Dubois",
        "email": "marie@monetoile.org",
        "role": "CONSULTANT"
      },
      "tags": ["lune", "astrologie", "phases"],
      "isPublished": true,
      "viewsCount": 142,
      "likesCount": 28,
      "publishedAt": "2024-12-06T10:00:00.000Z",
      "createdAt": "2024-12-06T10:00:00.000Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 10,
  "totalPages": 2
}
```

### 📖 Mes connaissances (CONSULTANT/ADMIN)

```bash
curl -X GET "http://localhost:3000/knowledge/my?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Retourne toutes vos connaissances (publiées ET brouillons).

### 🔥 Connaissances populaires (PUBLIC)

```bash
curl -X GET "http://localhost:3000/knowledge/popular?limit=5"
```

**Réponse:**
```json
[
  {
    "_id": "674a1234567890abcdef1234",
    "title": "Guide complet du Tarot de Marseille",
    "category": "TAROT",
    "viewsCount": 1523,
    "likesCount": 342,
    "authorId": { /* ... */ },
    "publishedAt": "2024-11-15T10:00:00.000Z"
  }
]
```

### 🆕 Dernières connaissances (PUBLIC)

```bash
curl -X GET "http://localhost:3000/knowledge/recent?limit=10"
```

### 📄 Détail d'une connaissance (PUBLIC)

```bash
curl -X GET "http://localhost:3000/knowledge/674a1234567890abcdef1234"
```

> 💡 **Note:** Le compteur de vues (`viewsCount`) est automatiquement incrémenté.

### ✏️ Mettre à jour une connaissance

```bash
curl -X PATCH "http://localhost:3000/knowledge/674a1234567890abcdef1234" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Titre mis à jour",
    "content": "Contenu mis à jour...",
    "isPublished": true
  }'
```

> 💡 **Note:** Si vous publiez un brouillon (`isPublished: false` → `true`), une notification est automatiquement créée.

### ❤️ Aimer/Retirer le like d'une connaissance

```bash
curl -X POST "http://localhost:3000/knowledge/674a1234567890abcdef1234/like" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Réponse:**
```json
{
  "liked": true,
  "likesCount": 43
}
```

Appeler à nouveau pour retirer le like:
```json
{
  "liked": false,
  "likesCount": 42
}
```

### 🗑️ Supprimer une connaissance

```bash
curl -X DELETE "http://localhost:3000/knowledge/674a1234567890abcdef1234" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Réponse:**
```json
{
  "message": "Connaissance supprimée avec succès"
}
```

---

## Scénarios Complets

### 🎯 Scénario 1: Consultation complétée avec résultat

**1. Mettre à jour la consultation avec le résultat (ADMIN/CONSULTANT)**

```bash
curl -X PATCH "http://localhost:3000/consultations/674a1234567890abcdef9012" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED",
    "result": "Votre horoscope pour cette année révèle des opportunités importantes...",
    "resultData": {
      "horoscope": {
        "amour": "Période favorable pour les rencontres",
        "travail": "Nouvelle opportunité professionnelle",
        "sante": "Energie positive"
      }
    }
  }'
```

**2. Le client est automatiquement notifié**

Le système crée automatiquement une notification de type `CONSULTATION_RESULT`.

**3. Le client vérifie ses notifications**

```bash
curl -X GET "http://localhost:3000/notifications?isRead=false" \
  -H "Authorization: Bearer CLIENT_JWT_TOKEN"
```

**Réponse:**
```json
{
  "notifications": [
    {
      "type": "CONSULTATION_RESULT",
      "title": "Résultat de consultation disponible",
      "message": "Le résultat de votre consultation \"Horoscope Annuel\" est maintenant disponible.",
      "metadata": {
        "consultationId": "674a1234567890abcdef9012",
        "url": "/consultations/674a1234567890abcdef9012"
      },
      "isRead": false
    }
  ],
  "unreadCount": 1
}
```

**4. Le client lit la notification**

```bash
curl -X PATCH "http://localhost:3000/notifications/[notification_id]/read" \
  -H "Authorization: Bearer CLIENT_JWT_TOKEN"
```

### 🎯 Scénario 2: Nouvelle connaissance partagée

**1. Un consultant crée et publie une connaissance**

```bash
curl -X POST "http://localhost:3000/knowledge" \
  -H "Authorization: Bearer CONSULTANT_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Introduction à la Numérologie",
    "content": "La numérologie est une science millénaire...",
    "category": "NUMEROLOGIE",
    "tags": ["numérologie", "chiffres", "initiation"],
    "isPublished": true
  }'
```

**2. Le système crée automatiquement une notification**

Une notification de type `NEW_KNOWLEDGE` est préparée (visible dans les logs).

**3. Les utilisateurs peuvent consulter les nouvelles connaissances**

```bash
curl -X GET "http://localhost:3000/knowledge/recent?limit=5"
```

**4. Un utilisateur lit et aime la connaissance**

```bash
# Lire
curl -X GET "http://localhost:3000/knowledge/[knowledge_id]"

# Aimer
curl -X POST "http://localhost:3000/knowledge/[knowledge_id]/like" \
  -H "Authorization: Bearer USER_JWT_TOKEN"
```

### 🎯 Scénario 3: Consultation assignée à un consultant

**1. Admin assigne la consultation (ADMIN/SUPER_ADMIN)**

```bash
curl -X PATCH "http://localhost:3000/consultations/674a1234567890abcdef9012/assign/674a1234567890abcdef5678" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

**2. Le consultant reçoit automatiquement une notification**

Le système crée automatiquement une notification de type `CONSULTATION_ASSIGNED`.

**3. Le consultant vérifie ses notifications**

```bash
curl -X GET "http://localhost:3000/notifications?type=CONSULTATION_ASSIGNED&isRead=false" \
  -H "Authorization: Bearer CONSULTANT_JWT_TOKEN"
```

**Réponse:**
```json
{
  "notifications": [
    {
      "type": "CONSULTATION_ASSIGNED",
      "title": "Nouvelle consultation assignée",
      "message": "Une nouvelle consultation vous a été assignée : \"Horoscope Annuel\".",
      "metadata": {
        "consultationId": "674a1234567890abcdef9012",
        "url": "/consultations/674a1234567890abcdef9012"
      },
      "isRead": false
    }
  ],
  "unreadCount": 1
}
```

---

## Catégories de Connaissances

| Catégorie | Valeur | Description |
|-----------|--------|-------------|
| Astrologie | `ASTROLOGIE` | Horoscopes, signes, planètes |
| Numérologie | `NUMEROLOGIE` | Chiffres, calculs numériques |
| Tarot | `TAROT` | Cartes, tirages, interprétations |
| Spiritualité | `SPIRITUALITE` | Pratiques spirituelles générales |
| Méditation | `MEDITATION` | Techniques de méditation |
| Développement Personnel | `DEVELOPPEMENT_PERSONNEL` | Croissance personnelle |
| Rituels | `RITUELS` | Rituels et cérémonies |
| Autres | `AUTRES` | Autres sujets |

---

## Types de Notifications

| Type | Valeur | Déclencheur | Destinataire |
|------|--------|-------------|--------------|
| Résultat disponible | `CONSULTATION_RESULT` | Consultation complétée | Client |
| Nouvelle connaissance | `NEW_KNOWLEDGE` | Connaissance publiée | Tous (à implémenter) |
| Consultation assignée | `CONSULTATION_ASSIGNED` | Attribution consultant | Consultant |
| Paiement confirmé | `PAYMENT_CONFIRMED` | Paiement validé | Client |
| Annonce système | `SYSTEM_ANNOUNCEMENT` | Manuel | Tous/Spécifique |

---

## 🔐 Permissions

### Notifications
- ✅ Authentification requise pour tous les endpoints
- ✅ Utilisateurs voient uniquement leurs propres notifications

### Connaissances (Knowledge)
- 📖 **Lecture:** PUBLIC (connaissances publiées uniquement)
- ✍️ **Création:** CONSULTANT, ADMIN, SUPER_ADMIN
- ✏️ **Modification:** Auteur, ADMIN, SUPER_ADMIN
- 🗑️ **Suppression:** Auteur, ADMIN, SUPER_ADMIN
- ❤️ **Like:** Tous les utilisateurs authentifiés

---

## 💡 Conseils d'utilisation

### Frontend: Polling des notifications

```javascript
// Vérifier les nouvelles notifications toutes les 30 secondes
useEffect(() => {
  const fetchNotifications = async () => {
    const response = await fetch('/notifications/unread/count', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const count = await response.json();
    setUnreadCount(count);
  };

  const interval = setInterval(fetchNotifications, 30000);
  return () => clearInterval(interval);
}, [token]);
```

### Frontend: Affichage badge

```jsx
<NotificationBell>
  {unreadCount > 0 && (
    <Badge>{unreadCount > 99 ? '99+' : unreadCount}</Badge>
  )}
</NotificationBell>
```

### Frontend: Liste de connaissances

```jsx
const KnowledgeList = () => {
  const [knowledges, setKnowledges] = useState([]);
  const [filter, setFilter] = useState({ category: 'ALL', page: 1 });

  useEffect(() => {
    fetchKnowledges(filter);
  }, [filter]);

  const handleLike = async (id) => {
    await axios.post(`/knowledge/${id}/like`);
    // Recharger la liste
    fetchKnowledges(filter);
  };

  return (
    <div>
      <CategoryFilter onChange={setFilter} />
      {knowledges.map(k => (
        <KnowledgeCard 
          key={k._id} 
          knowledge={k}
          onLike={() => handleLike(k._id)}
        />
      ))}
    </div>
  );
};
```

---

## 🎓 Conclusion

Ces exemples démontrent l'utilisation complète du système de notifications et de partage de connaissances. Le système est maintenant prêt à être intégré dans votre frontend pour offrir une expérience utilisateur riche et interactive.

**Points clés:**
- ✅ Notifications automatiques pour les événements importants
- ✅ Système complet de partage de connaissances
- ✅ API REST bien documentée
- ✅ Permissions et sécurité gérées
- ✅ Prêt pour intégration temps réel (WebSocket)
