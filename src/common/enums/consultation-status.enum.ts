/**
 * Statuts d'une consultation spirituelle
 */
export enum ConsultationStatus {
  PENDING = 'PENDING', // En attente d'attribution
  ASSIGNED = 'ASSIGNED', // Attribuée à un consultant
  IN_PROGRESS = 'IN_PROGRESS', // En cours de réalisation
  COMPLETED = 'COMPLETED', // Terminée
  CANCELLED = 'CANCELLED', // Annulée
  REFUNDED = 'REFUNDED', // Remboursée
}

/**
 * Types de consultations disponibles
 */
export enum ConsultationType {
  HOROSCOPE = 'HOROSCOPE',
  NUMEROLOGIE = 'NUMEROLOGIE',
  VIE_PERSONNELLE = 'VIE_PERSONNELLE',
  RELATIONS = 'RELATIONS',
  PROFESSIONNEL = 'PROFESSIONNEL',
  ASTROLOGIE_AFRICAINE = 'ASTROLOGIE_AFRICAINE',
  SPIRITUALITE = 'SPIRITUALITE',
  AUTRE = 'AUTRE',
}
