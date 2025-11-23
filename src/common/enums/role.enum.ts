/**
 * Rôles disponibles dans le système Mon Étoile
 * Hiérarchie: SUPER_ADMIN > ADMIN > CONSULTANT > USER > GUEST
 */
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN', // Accès total au système
  ADMIN = 'ADMIN', // Gestion des utilisateurs et consultations
  CONSULTANT = 'CONSULTANT', // Praticien spirituel / Voyant
  USER = 'USER', // Client standard
  GUEST = 'GUEST', // Visiteur non authentifié
}

/**
 * Vérifie si un rôle est supérieur ou égal à un autre
 */
export const isRoleHigherOrEqual = (userRole: Role, requiredRole: Role): boolean => {
  const hierarchy = {
    [Role.SUPER_ADMIN]: 5,
    [Role.ADMIN]: 4,
    [Role.CONSULTANT]: 3,
    [Role.USER]: 2,
    [Role.GUEST]: 1,
  };

  return hierarchy[userRole] >= hierarchy[requiredRole];
};
