export enum UserGrade {
  ASPIRANT = 'ASPIRANT',
  CONTEMPLATEUR = 'CONTEMPLATEUR',
  CONSCIENT = 'CONSCIENT',
  INTEGRATEUR = 'INTEGRATEUR',
  TRANSMUTANT = 'TRANSMUTANT',
  ALIGNE = 'ALIGNE',
  EVEILLE = 'EVEILLE',
  SAGE = 'SAGE',
  MAITRE_DE_SOI = 'MAITRE_DE_SOI',
}

export const GRADE_ORDER = [
  UserGrade.ASPIRANT,
  UserGrade.CONTEMPLATEUR,
  UserGrade.CONSCIENT,
  UserGrade.INTEGRATEUR,
  UserGrade.TRANSMUTANT,
  UserGrade.ALIGNE,
  UserGrade.EVEILLE,
  UserGrade.SAGE,
  UserGrade.MAITRE_DE_SOI,
];

export const GRADE_REQUIREMENTS = {
  [UserGrade.ASPIRANT]: {
    consultations: 3,
    rituels: 1,
    livres: 1,
  },
  [UserGrade.CONTEMPLATEUR]: {
    consultations: 6,
    rituels: 2,
    livres: 1,
  },
  [UserGrade.CONSCIENT]: {
    consultations: 9,
    rituels: 3,
    livres: 2,
  },
  [UserGrade.INTEGRATEUR]: {
    consultations: 13,
    rituels: 4,
    livres: 2,
  },
  [UserGrade.TRANSMUTANT]: {
    consultations: 18,
    rituels: 6,
    livres: 3,
  },
  [UserGrade.ALIGNE]: {
    consultations: 23,
    rituels: 8,
    livres: 4,
  },
  [UserGrade.EVEILLE]: {
    consultations: 28,
    rituels: 10,
    livres: 5,
  },
  [UserGrade.SAGE]: {
    consultations: 34,
    rituels: 10,
    livres: 6,
  },
  [UserGrade.MAITRE_DE_SOI]: {
    consultations: 40,
    rituels: 10,
    livres: 8,
  },
};

export const GRADE_MESSAGES = {
  [UserGrade.ASPIRANT]: `Félicitations, Cher(e) {name} !
Vous venez d'atteindre le premier degré : Aspirant.
C'est le tout premier pas sur le chemin initiatique, le moment où votre curiosité s'éveille et où la quête de connaissance commence à illuminer votre vie.
Être Aspirant, c'est ouvrir votre regard sur vous-même et sur l'univers, accueillir les enseignements des sciences ancestrales et sentir la guidance de votre étoile intérieure.
Chaque question que vous vous posez, chaque expérience que vous vivez, est une pierre posée sur le chemin de votre éveil.
Ce premier pas n'est ni une fin, ni un exploit : il est l'ouverture d'une voie sacrée, un engagement à explorer avec patience et humilité les mystères du ciel et de votre âme.
Que votre étoile vous éclaire et vous accompagne dans ce voyage où chaque découverte est un pas vers la maîtrise de soi.`,

  [UserGrade.CONTEMPLATEUR]: `Félicitations, Cher(e) {name} !
Vous avez atteint le degré 2 : Contemplateur.
À présent, votre regard ne se limite plus à ce qui est visible : vous apprenez à observer avec attention, à percevoir les subtilités de votre monde intérieur et les messages de votre étoile.
Être Contemplateur, c'est écouter le silence, discerner les signes et accueillir la sagesse qui se révèle dans vos expériences. Chaque observation, chaque réflexion, devient un outil pour mieux comprendre vos cycles, vos forces et vos responsabilités.
Ce degré vous invite à la patience et à la profondeur : la connaissance ne se précipite pas, elle se révèle à ceux qui savent contempler avec humilité et attention.
Que votre étoile continue de vous guider sur ce chemin où l'intuition et la perception éclairent vos pas.`,

  [UserGrade.CONSCIENT]: `Félicitations, Cher(e) {name} !
Vous avez atteint le degré 3 : Conscient.
À ce stade, votre regard s'élargit : vous ne vous contentez plus d'observer, vous commencez à comprendre et à intégrer les leçons que la vie et votre étoile vous offrent.
Être Conscient, c'est assumer votre pouvoir intérieur et reconnaître la responsabilité qui accompagne chaque choix. Vos pensées, vos actions et vos émotions deviennent des instruments de votre évolution.
Ce degré marque un moment de clarté : ce que vous vivez prend sens, et chaque expérience devient un guide vers votre alignement et votre maîtrise de soi.
Continuez à avancer avec attention et humilité, car la voie de la connaissance est un chemin à la fois sacré et infini.
Que votre étoile éclaire vos pas et vous montre la profondeur de votre propre lumière.`,

  [UserGrade.INTEGRATEUR]: `Félicitations, Cher(e) {name} !
Vous avez atteint le degré 4 : Intégrateur.
À présent, vos expériences, vos observations et votre conscience commencent à se lier et à s'harmoniser. Vous apprenez à donner un sens à vos apprentissages et à intégrer vos découvertes dans votre vie quotidienne.
Être Intégrateur, c'est assembler les pièces de votre être, comprendre vos forces et vos limites, et laisser votre étoile guider vos choix avec équilibre et discernement.
Chaque action, chaque décision devient une manifestation de votre évolution intérieure.
Avancez avec patience et confiance, car la véritable maîtrise se construit dans l'intégration et l'harmonisation de soi.`,

  [UserGrade.TRANSMUTANT]: `Félicitations, Cher(e) {name} !
Vous avez atteint le degré 5 : Transmutant.
À ce niveau, vos expériences et vos compréhensions commencent à se transformer profondément : ce que vous viviez comme épreuves devient énergie, ce qui semblait limité devient opportunité.
Être Transmutant, c'est changer ce qui est intérieur pour refléter la lumière de votre étoile. Vous apprenez à transformer vos forces et vos fragilités en instruments de croissance et d'évolution.
Chaque pas sur ce chemin vous rapproche de l'harmonie entre votre monde intérieur et le monde qui vous entoure.
Continuez à avancer avec courage et discernement, car la transformation est le cœur même de l'initiation.`,

  [UserGrade.ALIGNE]: `Félicitations, Cher(e) {name} !
Vous avez atteint le degré 6 : Aligné.
À ce stade, vos pensées, vos émotions et vos actions commencent à résonner en harmonie. Votre étoile intérieure guide vos choix, et vous agissez désormais avec cohérence et intégrité.
Être Aligné, c'est vivre en accord avec votre essence, laisser la sagesse guider vos décisions et incarner vos valeurs dans chaque geste.
Votre chemin devient plus fluide, et chaque expérience se transforme en enseignement profond.
Avancez avec confiance et sérénité, car l'alignement ouvre la voie à l'éveil et à la maîtrise de soi.`,

  [UserGrade.EVEILLE]: `Félicitations, Cher(e) {name} !
Vous avez atteint le degré 7 : Éveillé.
À présent, votre conscience s'élargit : vous percevez avec clarté les liens entre le ciel, la terre et votre être intérieur. Votre étoile brille plus fort, et votre compréhension de vous-même et du monde devient profonde et lucide.
Être Éveillé, c'est voir au-delà des apparences, reconnaître vos forces et vos responsabilités, et incarner la sagesse que vous avez acquise.
Chaque décision, chaque pensée, chaque acte devient une expression consciente de votre lumière intérieure.
Continuez à cheminer avec humilité et discernement, car l'éveil véritable ouvre la voie à la sagesse et à la maîtrise de soi.`,

  [UserGrade.SAGE]: `Félicitations, Cher(e) {name} !
Vous avez atteint le degré 8 : Sage.
Votre parcours initiatique vous a conduit à une compréhension profonde de vous-même et du monde. Vous possédez désormais la sagesse qui éclaire vos choix, et vos actions reflètent l'harmonie entre connaissance, intuition et discernement.
Être Sage, c'est partager la lumière de votre étoile sans attendre de reconnaissance, guider les autres par votre exemple et incarner la vérité que vous avez cultivée.
Chaque expérience passée devient une source d'enseignement pour vous et pour ceux qui vous entourent.
Avancez avec humilité et générosité, car la sagesse véritable se mesure à la manière dont elle inspire et élève les autres.`,

  [UserGrade.MAITRE_DE_SOI]: `Félicitations, Cher(e) {name} !
Vous avez atteint le degré 9 : Maître de Soi.
Ce dernier palier marque l'harmonie totale entre votre ciel intérieur, votre monde terrestre et votre conscience éveillée. Vous avez intégré toutes les leçons de votre chemin initiatique, et votre étoile brille désormais dans toute sa puissance.
Être Maître de Soi, c'est vivre en équilibre parfait avec votre essence, agir avec clarté, discernement et bienveillance, et rayonner la lumière de votre être à travers chaque pensée, chaque geste et chaque parole.
Votre parcours devient alors un exemple vivant de la connaissance de soi et de la maîtrise intérieure.
Que votre étoile continue de vous guider, et que votre vie soit un reflet lumineux de tout ce que vous avez intégré et transcendé.`,
};

export const PROFILE_WELCOME_MESSAGE = `Cher(e) {name},
En créant votre compte, vous avez franchi le seuil d'un temple virtuel dédié à la connaissance de soi et aux savoirs fondamentaux de la spiritualité africaine.
Ici, les sciences ancestrales ne se limitent pas à l'observation des phénomènes : elles forment un langage sacré qui relie l'invisible au visible, l'âme au corps, le destin aux actes.
Votre étoile est votre guide.
Elle brille dans le ciel, mais elle s'exprime aussi en vous, car ce qui est en haut reflète ce qui est en bas, et ce que révèlent les astres trouve écho dans votre vie intérieure.
Votre chemin se déploie à travers 9 grades initiatiques, 9 étapes symboliques qui marquent l'approfondissement de votre conscience et votre évolution. 
Ces 9 grades sont :
1. Aspirant – le premier pas vers la connaissance de soi.
2. Contemplateur – celui qui observe, perçoit et s'ouvre à la sagesse.
3. Conscient – celui qui commence à intégrer la compréhension et la vigilance intérieure.
4. Intégrateur – celui qui harmonise ses expériences et commence à structurer son être.
5. Transmutant – celui qui transforme ses énergies et dépasse ses limites.
6. Aligné – celui dont les actions, la pensée et l'âme sont en cohérence.
7. Éveillé – celui qui a développé une perception profonde de lui-même et de l'univers.
8. Sage – celui qui détient la connaissance éclairée et sait la transmettre.
9. Maître de Soi – celui qui a atteint l'harmonie totale entre ciel, terre et conscience.
Ces degrés ne sont ni des récompenses, ni des privilèges.
Ils reflètent simplement la manière dont votre étoile s'illumine à mesure que vous comprenez vos cycles, vos épreuves, vos forces et vos responsabilités.
Ici, nul ne se presse.
L'initiation ne se force pas : elle se vit, se mûrit et s'intègre profondément.
Que votre étoile vous éclaire sur ce chemin où le ciel et la terre se répondent,
et où la connaissance de soi devient un acte sacré.`;
