# Mise à jour : Support des Offrandes Requises dans les Consultations

## Modifications Effectuées

### 1. **DTO (Data Transfer Object)**
**Fichier:** `src/consultations/dto/create-consultation.dto.ts`

Ajout de deux nouvelles classes pour valider les données :

- `RequiredOfferingDto`: Structure pour les offrandes requises
  - `offeringId: string` - ID de l'offrande
  - `quantity: number` - Quantité requise (min: 1)

- `RequiredOfferingDetailDto`: Structure pour les détails enrichis
  - `_id: string` - ID de l'offrande
  - `name: string` - Nom de l'offrande
  - `price: number` - Prix
  - `icon: string` - Icône/emoji
  - `category: string` - Catégorie (animal, etc.)
  - `quantity: number` - Quantité requise

Ajout de deux champs optionnels à `CreateConsultationDto`:
- `requiredOfferings?: RequiredOfferingDto[]` - Liste des offrandes requises
- `requiredOfferingsDetails?: RequiredOfferingDetailDto[]` - Détails enrichis

### 2. **Schéma MongoDB**
**Fichier:** `src/consultations/schemas/consultation.schema.ts`

Ajout de deux sous-schémas :

- `RequiredOffering`: Stocke l'ID et la quantité d'une offrande requise
- `RequiredOfferingDetail`: Stocke tous les détails enrichis d'une offrande

Ajout de deux champs à la classe `Consultation`:
- `requiredOfferings: RequiredOffering[]` - Tableau des offrandes requises
- `requiredOfferingsDetails: RequiredOfferingDetail[]` - Tableau des détails enrichis

### 3. **Service**
**Fichier:** `src/consultations/consultations.service.ts`

✅ **Aucune modification requise** - Le service utilise déjà la méthode générique qui accepte tous les champs du DTO, y compris les nouveaux.

La méthode `create()` enregistre automatiquement les champs `requiredOfferings` et `requiredOfferingsDetails` depuis le DTO.

### 4. **Controller**
**Fichier:** `src/consultations/consultations.controller.ts`

✅ **Aucune modification requise** - Le contrôleur passe simplement le body au service.

## Workflow Frontend ↔ Backend

### Lors de la création d'une consultation :

1. **Frontend** envoie un POST `/consultations` avec:
```json
{
  "serviceId": "...",
  "type": "ASTRO",
  "title": "Consultation Astrologique",
  "description": "...",
  "formData": { /* données du formulaire */ },
  "requiredOfferings": [
    { "offeringId": "id1", "quantity": 2 },
    { "offeringId": "id2", "quantity": 1 }
  ],
  "requiredOfferingsDetails": [
    {
      "_id": "id1",
      "name": "Offrande 1",
      "price": 50,
      "icon": "🕯️",
      "category": "animal",
      "quantity": 2
    }
  ]
}
```

2. **Backend** valide et enregistre :
   - Les offrandes requises dans `consultation.requiredOfferings`
   - Les détails enrichis dans `consultation.requiredOfferingsDetails`

3. **Frontend** peut ensuite :
   - Récupérer la consultation avec l'ID
   - Afficher les offrandes requises à l'utilisateur
   - Valider les offrandes sélectionnées du wallet

## Avantages de cette approche

✅ **Cohérence**: Les détails enrichis sont sauvegardés avec la consultation (pas de risque de change)
✅ **Traçabilité**: Historique complet des offrandes requises au moment de la création
✅ **Flexibilité**: Support de multiples offrandes par consultation
✅ **Validation**: Validation stricte via les classes DTO
✅ **Retrocompatibilité**: Les champs sont optionnels, ne casse pas l'API existante

## Prochaines étapes

Si vous avez besoin de:
- ✅ Récupérer une consultation avec ses offrandes requises
- ✅ Filtrer les consultations par offrandes requises
- ✅ Générer des rapports sur les offrandes requises

Tout fonctionne déjà grâce au schéma MongoDB qui persiste ces données.
