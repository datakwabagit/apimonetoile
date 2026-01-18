import { ApiProperty } from '@nestjs/swagger';
import { UserGrade } from '../../common/enums/user-grade.enum';

export class GradeProgressDto {
  @ApiProperty({ enum: UserGrade, nullable: true })
  currentGrade: UserGrade | null;

  @ApiProperty({ enum: UserGrade, nullable: true })
  nextGrade: UserGrade | null;

  @ApiProperty()
  consultationsCompleted: number;

  @ApiProperty()
  rituelsCompleted: number;

  @ApiProperty()
  booksRead: number;

  @ApiProperty({ required: false })
  nextGradeRequirements?: {
    consultations: number;
    rituels: number;
    livres: number;
  };

  @ApiProperty({ required: false })
  progress?: {
    consultations: number;
    rituels: number;
    livres: number;
  };
}

export class GradeInfoDto {
  @ApiProperty({ enum: UserGrade })
  grade: UserGrade;

  @ApiProperty()
  level: number;

  @ApiProperty()
  requirements: {
    consultations: number;
    rituels: number;
    livres: number;
  };
}

export class GradeUpdateResponseDto {
  @ApiProperty()
  updated: boolean;

  @ApiProperty({ enum: UserGrade, nullable: true })
  oldGrade: UserGrade | null;

  @ApiProperty({ enum: UserGrade, nullable: true })
  newGrade: UserGrade | null;

  @ApiProperty({ required: false })
  message?: string;
}
