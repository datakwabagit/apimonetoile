import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SpiritualPractice } from './schemas/spiritual-practice.schema';
import { CreateSpiritualPracticeDto } from './dto/create-spiritual-practice.dto';

@Injectable()
export class SpiritualiteService {
  constructor(
    @InjectModel(SpiritualPractice.name)
    private spiritualPracticeModel: Model<SpiritualPractice>,
  ) {}

  /**
   * Créer une nouvelle pratique spirituelle
   */
  async create(createSpiritualPracticeDto: CreateSpiritualPracticeDto): Promise<SpiritualPractice> {
    const created = new this.spiritualPracticeModel(createSpiritualPracticeDto);
    return created.save();
  }

  /**
   * Obtenir toutes les pratiques (publiées ou toutes si admin)
   */
  async findAll(publishedOnly: boolean = true): Promise<SpiritualPractice[]> {
    const query = publishedOnly ? { published: true } : {};
    return this.spiritualPracticeModel.find(query).sort({ order: 1 }).exec();
  }

  /**
   * Obtenir une pratique par ID
   */
  async findById(id: string): Promise<SpiritualPractice> {
    const practice = await this.spiritualPracticeModel.findOne({ id }).exec();
    if (!practice) {
      throw new NotFoundException(`Pratique spirituelle avec l'ID ${id} non trouvée`);
    }
    return practice;
  }

  /**
   * Obtenir une pratique par slug
   */
  async findBySlug(slug: string): Promise<SpiritualPractice> {
    const practice = await this.spiritualPracticeModel.findOne({ slug }).exec();
    if (!practice) {
      throw new NotFoundException(`Pratique spirituelle avec le slug ${slug} non trouvée`);
    }
    return practice;
  }

  /**
   * Mettre à jour une pratique
   */
  async update(
    id: string,
    updateSpiritualPracticeDto: Partial<CreateSpiritualPracticeDto>,
  ): Promise<SpiritualPractice> {
    const practice = await this.spiritualPracticeModel
      .findOneAndUpdate({ id }, updateSpiritualPracticeDto, { new: true })
      .exec();
    if (!practice) {
      throw new NotFoundException(`Pratique spirituelle avec l'ID ${id} non trouvée`);
    }
    return practice;
  }

  /**
   * Supprimer une pratique
   */
  async delete(id: string): Promise<{ message: string }> {
    const result = await this.spiritualPracticeModel.deleteOne({ id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Pratique spirituelle avec l'ID ${id} non trouvée`);
    }
    return { message: `Pratique ${id} supprimée avec succès` };
  }

  /**
   * Exporter les pratiques au format JSON
   */
  async exportToJSON(): Promise<string> {
    const practices = await this.findAll(false);
    return JSON.stringify(practices, null, 2);
  }

  /**
   * Générer les instructions SQL INSERT pour PostgreSQL
   */
  async generateSQLInsert(tableName: string = 'spiritual_practices'): Promise<string> {
    const practices = await this.findAll(false);

    const sqlStatements = practices.map((practice) => {
      const escapeSql = (str: string): string => str.replace(/'/g, "''");

      const values = {
        id: practice.id,
        slug: practice.slug,
        title: practice.title,
        icon_name: practice.iconName,
        category: practice.category,
        published: practice.published,
        order_index: practice.order,
        description: escapeSql(practice.description),
        introduction: escapeSql(practice.introduction),
        key_elements: escapeSql(JSON.stringify(practice.keyElements)),
        detailed_guide: escapeSql(practice.detailedGuide),
        benefits: escapeSql(JSON.stringify(practice.benefits)),
        practical_steps: escapeSql(JSON.stringify(practice.practicalSteps)),
        warnings: escapeSql(JSON.stringify(practice.warnings)),
        affirmation: escapeSql(practice.affirmation),
        materials: practice.materials ? escapeSql(JSON.stringify(practice.materials)) : null,
        best_timing: practice.bestTiming ? escapeSql(practice.bestTiming) : null,
      };

      const materialValue = values.materials !== null ? `'${values.materials}'` : 'NULL';
      const timingValue = values.best_timing !== null ? `'${values.best_timing}'` : 'NULL';

      return `INSERT INTO ${tableName} (
  id, slug, title, icon_name, category, published, order_index,
  description, introduction, key_elements, detailed_guide,
  benefits, practical_steps, warnings, affirmation, materials, best_timing,
  created_at, updated_at
) VALUES (
  '${values.id}',
  '${values.slug}',
  '${values.title}',
  '${values.icon_name}',
  '${values.category}',
  ${values.published},
  ${values.order_index},
  '${values.description}',
  '${values.introduction}',
  '${values.key_elements}',
  '${values.detailed_guide}',
  '${values.benefits}',
  '${values.practical_steps}',
  '${values.warnings}',
  '${values.affirmation}',
  ${materialValue},
  ${timingValue},
  NOW(),
  NOW()
);`;
    });

    return sqlStatements.join('\n\n');
  }

  /**
   * Obtenir le schéma de table PostgreSQL
   */
  getTableSchema(): string {
    return `
CREATE TABLE spiritual_practices (
  id VARCHAR(50) PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  icon_name VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  published BOOLEAN DEFAULT true,
  order_index INTEGER NOT NULL,
  description TEXT NOT NULL,
  introduction TEXT NOT NULL,
  key_elements JSONB NOT NULL,
  detailed_guide TEXT NOT NULL,
  benefits JSONB NOT NULL,
  practical_steps JSONB NOT NULL,
  warnings JSONB NOT NULL,
  affirmation TEXT NOT NULL,
  materials JSONB,
  best_timing TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_spiritual_practices_category ON spiritual_practices(category);
CREATE INDEX idx_spiritual_practices_published ON spiritual_practices(published);
CREATE INDEX idx_spiritual_practices_order ON spiritual_practices(order_index);
`;
  }

  /**
   * Importer les données initiales
   */
  async seedPractices(): Promise<{ message: string; count: number }> {
    const existingCount = await this.spiritualPracticeModel.countDocuments().exec();
    if (existingCount > 0) {
      return { message: 'Les données existent déjà', count: existingCount };
    }

    const practices = this.getDefaultPractices();
    await this.spiritualPracticeModel.insertMany(practices);
    return {
      message: `${practices.length} pratiques spirituelles importées`,
      count: practices.length,
    };
  }

  /**
   * Données par défaut des 5 pratiques spirituelles
   */
  private getDefaultPractices(): CreateSpiritualPracticeDto[] {
    return [
      {
        id: 'sp-bases',
        slug: 'bases',
        title: 'Notions de Base',
        iconName: 'BookOpen',
        category: 'spiritualite-africaine',
        published: true,
        order: 1,
        description: 'Fondements essentiels de la spiritualité africaine ancestrale',
        introduction:
          "La spiritualité africaine est un système de croyances millénaires basé sur l'interconnexion entre les vivants, les ancêtres, la nature et le divin. Elle repose sur le principe que tout dans l'univers est énergie et conscience.",
        keyElements: [
          'Connexion avec les ancêtres : Ils sont nos guides et protecteurs spirituels',
          "Force vitale (Ashé/Nyama) : L'énergie universelle qui anime toute chose",
          'Équilibre cosmique : Harmonie entre le monde visible et invisible',
          'Respect de la nature : Arbres, rivières, montagnes sont habités par des esprits',
          'Transmission orale : Les enseignements se transmettent de génération en génération',
          'Ritualisation : Chaque acte sacré suit un protocole précis',
          'Communauté : La spiritualité est collective, pas seulement individuelle',
        ],
        detailedGuide:
          "Dans la cosmogonie africaine, le monde est divisé en trois sphères interconnectées : le monde des vivants (Aiyé), le monde des ancêtres (Orun) et le monde des divinités (Orisha/Lwa/Vodun selon les traditions). Les ancêtres jouent un rôle crucial car ils servent de pont entre les humains et les forces supérieures. La spiritualité africaine n'est pas dogmatique : elle s'adapte, évolue et intègre les contextes locaux tout en préservant ses principes fondamentaux. Le concept de Maat (équilibre, justice, vérité) est central : vivre en harmonie avec les lois cosmiques garantit la prospérité et la paix. La divination (Ifa, géomancie, cauris) permet de consulter les forces invisibles pour obtenir des guidances. Le pouvoir des mots (Nommo) est considéré comme créateur : ce que nous disons se manifeste dans la réalité.",
        benefits: [
          'Reconnexion avec vos racines spirituelles profondes',
          "Compréhension de votre place dans l'univers",
          'Accès à la sagesse ancestrale millénaire',
          "Développement d'une relation personnelle avec vos ancêtres",
          'Éveil de votre force vitale intérieure (Ashé)',
          'Protection spirituelle naturelle renforcée',
        ],
        practicalSteps: [
          'Créez un autel ancestral simple : photos, bougies blanches, eau fraîche, fleurs',
          "Apprenez l'histoire de vos ancêtres : interrogez les aînés de votre famille",
          'Pratiquez la salutation matinale aux quatre directions (Est, Sud, Ouest, Nord)',
          "Offrez régulièrement de l'eau et de la lumière à vos ancêtres",
          'Méditez quotidiennement en vous connectant à la Terre (pieds nus)',
          'Étudiez les symboles Adinkra et leur signification profonde',
          'Rejoignez une communauté ou trouvez un mentor spirituel authentique',
        ],
        warnings: [
          'Ne pratiquez jamais de rituels dont vous ne comprenez pas le sens',
          'Respectez les protocoles : certains rituels nécessitent une initiation',
          'Méfiez-vous des charlatans qui promettent des résultats instantanés',
          'La spiritualité africaine demande engagement et respect, pas superstition',
        ],
        affirmation:
          "Je suis relié(e) à la sagesse infinie de mes ancêtres. Leur force coule dans mes veines. Je marche sur le chemin de la vérité et de l'équilibre.",
        materials: [
          'Bougies blanches (pureté)',
          'Eau fraîche (élément vital)',
          'Encens naturel (oliban, copal, sauge)',
          "Tissu blanc pour l'autel",
          'Calebasse ou bol en terre cuite',
        ],
        bestTiming:
          'Tous les jours, particulièrement le matin au lever du soleil pour les salutations, et le soir pour communiquer avec les ancêtres',
      },
      {
        id: 'sp-protection',
        slug: 'protection',
        title: 'Rituels de Protection',
        iconName: 'Shield',
        category: 'spiritualite-africaine',
        published: true,
        order: 2,
        description: 'Protégez votre énergie, votre maison et vos proches des influences négatives',
        introduction:
          "Dans la tradition africaine, la protection spirituelle est essentielle pour maintenir l'équilibre de votre force vitale. Ces rituels créent un bouclier énergétique contre les attaques psychiques, le mauvais œil, les envies négatives et les entités malveillantes.",
        keyElements: [
          'Bain de purification (avec plantes sacrées et sel marin)',
          'Cercle de protection avec sel, cendre ou poudre blanche (pemba)',
          'Invocation des gardiens des quatre directions',
          'Utilisation de gris-gris et talismans consacrés',
          'Fumigation avec encens protecteur (benjoin, myrrhe, rue)',
          'Scellement des ouvertures (portes, fenêtres) avec signes sacrés',
          'Protection par les ancêtres et esprits tutélaires',
        ],
        detailedGuide:
          "La protection spirituelle africaine fonctionne sur plusieurs niveaux : physique (corps), énergétique (aura), spatial (maison/lieu) et temporel (moment). Le rituel de base commence par une purification : bain aux herbes (basilic, citronnelle, laurier) additionné de sel marin et de prières. Ensuite, on crée une barrière protectrice autour de soi ou de son espace. Le sel gemme est particulièrement puissant car il absorbe les énergies négatives. Les quatre coins cardinaux doivent être honorés et scellés car ce sont des portes énergétiques. Le gris-gris (sachet de protection) contient des éléments naturels chargés de pouvoir : racines, pierres, plumes, herbes, symboles écrits. Il doit être consacré lors d'un rituel et porté sur soi ou placé dans un lieu stratégique. La protection n'est pas statique : elle doit être renouvelée régulièrement, surtout après des événements perturbateurs ou lors des changements de saison.",
        benefits: [
          'Bouclier énergétique contre les attaques psychiques et le mauvais œil',
          'Paix et sérénité dans votre espace de vie',
          'Sommeil réparateur sans cauchemars ou paralysies du sommeil',
          'Protection de votre famille et de vos proches',
          'Blocage des influences négatives extérieures',
          'Renforcement de votre aura et de votre champ magnétique',
        ],
        practicalSteps: [
          'Prenez un bain de purification : eau + sel marin + basilic frais + 7 gouttes de citron',
          'Tracez un cercle de sel aux quatre coins de votre maison en priant',
          "Fumigez chaque pièce avec de l'encens de benjoin (sens anti-horaire)",
          'Placez du sel dans des coupelles aux entrées et fenêtres',
          'Créez un gris-gris personnel : sachet rouge avec ail, rue, sel, œil de tigre',
          "Invoquez vos ancêtres protecteurs : 'Ancêtres, formez un mur de lumière autour de moi'",
          'Répétez le rituel chaque nouvelle lune pour maintenir la protection active',
        ],
        warnings: [
          "Ne jetez jamais l'eau de purification n'importe où : versez-la dans la terre ou à un carrefour",
          'Ne prêtez jamais votre gris-gris personnel : il est chargé de VOTRE énergie',
          'Si vous sentez une résistance forte pendant le rituel, faites appel à un initié',
          "La protection doit être accompagnée d'une vie éthique : elle n'est pas une excuse pour mal agir",
        ],
        affirmation:
          "Je suis protégé(e) par la force de mes ancêtres. Un bouclier de lumière m'entoure. Aucune énergie négative ne peut me toucher.",
        materials: [
          'Sel marin ou sel gemme',
          'Herbes : basilic, rue, laurier, citronnelle',
          'Encens : benjoin, myrrhe, oliban',
          'Bougie blanche (purification) et rouge (force)',
          'Tissu rouge pour gris-gris',
          'Pierre : œil de tigre, obsidienne ou tourmaline noire',
        ],
        bestTiming:
          "Nouvelle lune (nouveau cycle de protection), mardi (jour de Mars - force), ou en cas d'urgence immédiate",
      },
      {
        id: 'sp-abondance',
        slug: 'abondance',
        title: "Rituels d'Abondance",
        iconName: 'CircleDollarSign',
        category: 'spiritualite-africaine',
        published: true,
        order: 3,
        description:
          "Attirez la prospérité, la richesse et l'abondance dans tous les domaines de votre vie",
        introduction:
          "L'abondance dans la spiritualité africaine ne concerne pas seulement l'argent, mais la richesse globale : santé, amour, succès, opportunités. Ces rituels ouvrent les chemins bloqués et activent la circulation de l'énergie d'abondance (Ashé/Baraka).",
        keyElements: [
          "Offrandes à Ochùn/Erzulie (divinités de l'abondance et de l'amour)",
          'Utilisation du miel (attraction), cannelle (prospérité), pièces dorées',
          "Rituel du bol d'abondance avec éléments symboliques",
          "Bain d'attraction avec herbes magnétiques (basilic, menthe, cannelle)",
          'Activation des quatre coins de richesse dans votre maison',
          "Prières et chants d'invocation de la prospérité",
          "Danse et tambours pour élever la vibration d'abondance",
        ],
        detailedGuide:
          "Les rituels d'abondance africains reposent sur le principe que l'énergie suit l'intention et les symboles. Le miel est l'ingrédient roi : il \"adoucit\" les situations et attire le positif. Le rituel du bol d'abondance consiste à préparer un récipient doré (ou jaune) contenant : pièces de monnaie, grains (riz, maïs), miel, cannelle, une bougie dorée. Ce bol est placé dans la zone richesse de votre maison (coin sud-est selon le Feng Shui africain adapté). Les bains d'attraction se prennent pendant 7 jours consécutifs, toujours dans le sens horaire (pour attirer) avec des herbes bouillies puis refroidies. L'important est l'état d'esprit : vous devez SENTIR l'abondance déjà présente, pas la supplier de venir. Les divinités comme Ochùn aiment les offrandes luxueuses : miel, champagne doux, oranges, miroirs, bijoux dorés. En échange de votre dévotion et de vos offrandes, elles ouvrent les portes de la prospérité. La générosité est clé : plus vous donnez (avec joie), plus vous recevez (loi du retour).",
        benefits: [
          'Attraction de nouvelles opportunités financières inattendues',
          'Déblocage des situations de stagnation économique',
          'Augmentation de votre magnétisme personnel',
          "Circulation fluide de l'argent dans votre vie",
          'Succès dans les projets et entreprises',
          'Prospérité globale : santé, amour, relations enrichissantes',
        ],
        practicalSteps: [
          "Préparez un bol d'abondance : récipient doré + 5 pièces + miel + cannelle + riz + bougie dorée",
          "Placez-le dans votre coin richesse (sud-est) ou près de l'entrée principale",
          'Allumez la bougie dorée chaque jeudi (jour de Jupiter - expansion) pendant 15 min',
          "Prenez 7 bains d'attraction : eau + basilic + menthe + miel + 5 pièces au fond de la baignoire",
          "Frottez vos mains avec de la cannelle en visualisant l'argent venir à vous",
          "Offrez du miel à Ochùn : versez du miel en rivière ou près d'eau avec une prière",
          'Donnez régulièrement (argent, nourriture) pour activer la loi du retour',
        ],
        warnings: [
          "L'abondance ne vient pas sans action : les rituels OUVRENT les portes, vous devez les traverser",
          'Ne soyez pas avide : demandez ce dont vous avez besoin, pas plus',
          "Si vous promettez une offrande aux esprits en échange d'aide, tenez TOUJOURS votre promesse",
          "L'argent obtenu par rituels doit être utilisé avec sagesse et générosité",
        ],
        affirmation:
          "Je suis un aimant à abondance. L'argent coule vers moi facilement et joyeusement. Je suis riche dans tous les domaines de ma vie.",
        materials: [
          'Miel naturel pur',
          'Cannelle en poudre et bâtons',
          'Pièces de monnaie (cuivre et dorées)',
          'Bougie dorée ou jaune',
          'Herbes : basilic, menthe, verveine',
          'Bol ou récipient doré/jaune',
          'Riz et grains (symboles de multiplication)',
        ],
        bestTiming:
          'Jeudi (jour de Jupiter - expansion et chance), pendant la lune croissante (croissance), de préférence le matin',
      },
      {
        id: 'sp-ancetres',
        slug: 'ancetres',
        title: 'Invocation des Ancêtres',
        iconName: 'Feather',
        category: 'spiritualite-africaine',
        published: true,
        order: 4,
        description:
          'Connectez-vous profondément avec vos guides ancestraux pour recevoir guidance et protection',
        introduction:
          "Les ancêtres sont le pilier de la spiritualité africaine. Ils ne sont pas \"morts\" mais transitionnés vers un autre plan d'existence d'où ils continuent à guider, protéger et bénir leur descendance. L'invocation crée un pont conscient entre vous et eux.",
        keyElements: [
          "Création d'un autel ancestral sacré",
          'Offrandes régulières : eau, café, alcool (rhum/gin), nourriture préférée',
          'Libations rituelles versées au sol en prononçant les noms',
          "Prières d'invocation en langues sacrées ou dans votre langue",
          'Utilisation de la bougie blanche (lumière pour éclairer leur chemin)',
          'Communication par rêves, signes et intuitions',
          'Honneur des défunts lors des dates importantes (anniversaires, décès)',
        ],
        detailedGuide:
          "L'autel ancestral est le téléphone spirituel qui vous relie à vos aïeuls. Il doit être placé dans un endroit calme et respectueux, de préférence dans votre chambre ou un espace privé. Sur l'autel, disposez : photos des ancêtres (si disponibles), sinon une image symbolique ; un verre d'eau fraîche changée quotidiennement (les ancêtres \"boivent\" l'essence) ; une bougie blanche allumée régulièrement ; des fleurs blanches ; des objets leur ayant appartenu. Les libations sont cruciales : versez de l'eau, du café ou de l'alcool au sol (ou dans une plante) en appelant chaque ancêtre par son nom si vous le connaissez, sinon \"Ancêtres de mon sang, recevez cette offrande\". Parlez-leur quotidiennement comme s'ils étaient présents physiquement : racontez votre journée, demandez conseil, remerciez-les. Les signes de leur présence : rêves vivides, sensations de présence bienveillante, synchronicités, odeurs familières sans source, réussite soudaine après avoir demandé leur aide. Pour des demandes importantes, faites un \"festin ancestral\" : préparez leurs plats préférés, mettez une assiette pour eux, invitez-les à manger avec vous.",
        benefits: [
          'Guidance claire dans les moments de confusion et de choix difficiles',
          'Protection puissante contre les dangers physiques et spirituels',
          'Bénédictions sur vos projets et entreprises',
          'Guérison des traumatismes transgénérationnels familiaux',
          "Sentiment profond d'appartenance et de soutien",
          "Accès à la sagesse et l'expérience de ceux qui ont vécu avant vous",
        ],
        practicalSteps: [
          "Créez votre autel ancestral : table couverte de tissu blanc + photos + verre d'eau + bougie",
          'Allumez la bougie chaque matin et saluez vos ancêtres : "Bonjour, chers ancêtres"',
          "Changez l'eau quotidiennement (versez l'ancienne dans une plante)",
          "Faites une libation hebdomadaire : versez de l'eau au sol en prononçant les noms connus",
          'Parlez-leur régulièrement : demandez conseil, racontez vos joies et peines',
          'Offrez du café noir (sans sucre/lait) le lundi matin (ouverture de semaine)',
          'Notez vos rêves : les ancêtres parlent souvent dans le sommeil',
        ],
        warnings: [
          "Ne négligez jamais l'autel une fois créé : c'est un manque de respect grave",
          'Si vous promettez quelque chose à vos ancêtres, tenez votre parole',
          'Certains ancêtres peuvent être "non élevés" (énergies lourdes) : priez pour leur élévation',
          "Ne demandez JAMAIS aux ancêtres de nuire à quelqu'un : ça se retourne contre vous",
        ],
        affirmation:
          "Mes ancêtres marchent avec moi. Leur sagesse me guide, leur force me protège, leur amour m'entoure. Je ne suis jamais seul(e).",
        materials: [
          'Photos ou images représentatives des ancêtres',
          "Verre transparent pour l'eau fraîche",
          'Bougies blanches (7 jours de préférence)',
          "Tissu blanc pour couvrir l'autel",
          'Café noir, rhum blanc ou gin (selon tradition familiale)',
          'Fleurs blanches fraîches',
          'Encens (oliban, copal ou sauge)',
        ],
        bestTiming:
          "Quotidien pour l'entretien de l'autel. Lundi (ouverture de semaine), vendredi (connexion spirituelle), ou dates anniversaires des défunts",
      },
      {
        id: 'sp-meditations',
        slug: 'meditations',
        title: 'Méditations Guidées',
        iconName: 'Sparkle',
        category: 'spiritualite-africaine',
        published: true,
        order: 5,
        description:
          "Méditations sacrées inspirées des traditions africaines pour l'éveil spirituel",
        introduction:
          'Les méditations africaines traditionnelles ne sont pas seulement assises silencieuses. Elles intègrent le mouvement (danse), le son (tambours, chants), la respiration (souffle de vie) et la visualisation pour atteindre des états de conscience élevés et la connexion avec le divin.',
        keyElements: [
          "Méditation de l'arbre (enracinement et expansion)",
          'Respiration du serpent (activation de la kundalini africaine)',
          'Voyage chamanique aux tambours pour rencontrer les guides',
          'Méditation des quatre éléments (Terre, Eau, Feu, Air)',
          'Chants sacrés et mantras en langues africaines',
          'Visualisation du fleuve de lumière (purification)',
          'Danse méditative extatique pour libération émotionnelle',
        ],
        detailedGuide:
          'La méditation de l\'Arbre est fondamentale : debout, pieds écartés largeur des hanches, visualisez des racines sortant de vos pieds et plongeant profondément dans la Terre-Mère. Sentez sa force vitale remonter par vos racines, remplir vos jambes, votre bassin, votre torse. Imaginez vos bras comme des branches s\'élevant vers le Ciel-Père. Vous êtes le pont entre Terre et Ciel. Cette méditation ancre et élève simultanément. La respiration du serpent : inspirez par le nez en gonflant le ventre (4 temps), retenez (4 temps), expirez par la bouche en contractant le ventre (4 temps), retenez poumons vides (4 temps). Visualisez une énergie serpentine rouge à la base de votre colonne qui monte vertèbre par vertèbre jusqu\'au sommet du crâne. Cette pratique éveille votre force vitale dormante. Le voyage au tambour : allongé confortablement, écoutez un rythme de tambour constant (ou audio). Visualisez-vous descendant dans la Terre par un tunnel lumineux. Vous arrivez dans un monde intérieur où vous rencontrez vos animaux totems, guides ancestraux ou divinités. Demandez-leur un message ou une guérison. Quand le rythme change, revenez. Les chants sacrés (comme "Kumbaya", "Ashe Ashe" ou chants en Yoruba) élèvent la vibration et ouvrent les canaux spirituels.',
        benefits: [
          'Enracinement profond dans votre corps et la Terre',
          'Activation de votre force vitale (Kundalini/Ashé)',
          'Connexion directe avec vos guides spirituels et divinités',
          'Libération des blocages émotionnels et énergétiques',
          'États de conscience élargis et visions spirituelles',
          'Paix intérieure profonde et centrage',
        ],
        practicalSteps: [
          'Méditation quotidienne : "L\'Arbre" pendant 10 minutes chaque matin',
          'Pratiquez la respiration du serpent : 9 cycles avant les rituels pour vous préparer',
          'Écoutez un audio de tambours chamaniques 1x/semaine pour voyage intérieur',
          'Apprenez 1 chant sacré africain et chantez-le quotidiennement (ex: "Ashe Ashe Ashe O")',
          'Dansez librement sur des rythmes africains pour libérer les émotions bloquées',
          "Méditez avec les quatre éléments : allumez une bougie (Feu), ayez de l'eau (Eau), touchez la terre (Terre), sentez l'air",
          'Tenez un journal de vos visions et messages reçus pendant les méditations',
        ],
        warnings: [
          'Si vous ressentez des vertiges pendant la respiration du serpent, ralentissez le rythme',
          'Les voyages au tambour peuvent révéler des vérités inconfortables : soyez prêt',
          'Ne pratiquez pas de méditations profondes en état de vulnérabilité psychologique sans accompagnement',
          'Certaines visions sont symboliques, pas littérales : apprenez le langage des symboles',
        ],
        affirmation:
          "Je suis l'Arbre sacré : mes racines plongent dans la sagesse de la Terre, mes branches touchent la lumière du Ciel. Je suis connecté(e) au Tout.",
        materials: [
          'Tapis ou natte naturelle',
          'Audio de tambours chamaniques (YouTube ou applications)',
          "Encens ou sauge pour purifier l'espace",
          'Bougie (élément Feu)',
          "Bol d'eau (élément Eau)",
          'Pierre ou cristal (élément Terre)',
          'Vêtements confortables, de préférence blancs ou naturels',
        ],
        bestTiming:
          'Tôt le matin au lever du soleil (énergie montante) ou tard le soir (connexion aux mondes invisibles). Les périodes de pleine lune amplifient les visions',
      },
    ];
  }
}
