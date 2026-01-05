import { Controller, Get, Post, Put, Param, Body, Delete } from '@nestjs/common';
import { RubriqueService } from './rubrique.service';
import { RubriqueDto } from './dto/rubrique.dto';

@Controller('rubriques')
export class RubriqueController {
  constructor(private readonly rubriqueService: RubriqueService) {}

  @Get()
  findAll() {
    return this.rubriqueService.findAll();
  }

  @Post()
  create(@Body() dto: RubriqueDto) {
    return this.rubriqueService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rubriqueService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: RubriqueDto) {
    return this.rubriqueService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rubriqueService.remove(id);
  }
}
