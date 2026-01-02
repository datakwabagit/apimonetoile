import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import { Service } from './service.entity';
import { Offrande } from './offrande.entity';

@Entity()
export class Consultation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nom: string;

  @Column()
  type: string;

  @Column('text')
  description: string;

  @ManyToOne(() => Service, service => service.consultations)
  service: Service;

  @ManyToMany(() => Offrande)
  @JoinTable()
  offrandes: Offrande[];
}

