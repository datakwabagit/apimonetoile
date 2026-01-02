import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Consultation } from './consultation.entity';

@Entity()
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  rubrique: string;

  @Column()
  sousRubrique: string;

  @OneToMany(() => Consultation, consultation => consultation.service)
  consultations: Consultation[];
}

