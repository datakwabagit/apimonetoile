export type RubriqueCategory = 'GENERAL';

export interface ConsultationOffering {
  category: 'animal' | 'vegetal' | 'beverage';
  offeringId: string;
  quantity: number;
}

export interface ConsultationChoice {
  id: string;
  title: string;
  description: string;
  offering: {
    alternatives: ConsultationOffering[];
  };
}

export interface Rubrique {
  id?: string;
  titre: string;
  description: string;
  categorie: RubriqueCategory;
  consultationChoices: ConsultationChoice[];
}
