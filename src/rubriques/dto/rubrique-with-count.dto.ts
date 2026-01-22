  buttonStatus?: 'CONSULTER' | 'RÉPONSE EN ATTENTE' | 'VOIR L\'ANALYSE';
export class ConsultationChoiceWithCountDto {
  _id: string;
  title: string;
  description: string;
  frequence: string;
  participants: string;
  order?: number;
  offering: any;
  consultationCount: number;
  showButtons: boolean;
}

export class RubriqueWithChoiceCountDto {
  _id: string;
  titre: string;
  description: string;
  categorie: string;
  typeconsultation: string;
  consultationChoices: ConsultationChoiceWithCountDto[];
}
