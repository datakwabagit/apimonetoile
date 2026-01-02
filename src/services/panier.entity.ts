import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Offrande } from './offrande.entity';

@Entity()
export class Panier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column('float')
  totalDepense: number;
}

@Entity()
export class Achat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Panier)
  panier: Panier;

  @ManyToOne(() => Offrande)
  offrande: Offrande;

  @Column('int')
  quantite: number;

  @Column('datetime')
  date: Date;

  @Column('float')
  prixTotal: number;
}

