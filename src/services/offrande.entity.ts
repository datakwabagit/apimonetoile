import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Offrande {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nom: string;

  @Column('float')
  prix: number;

  @Column({ nullable: true })
  description?: string;
}

