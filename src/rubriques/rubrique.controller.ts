import { Controller, Get, Post, Put, Param, Body, Delete, Query } from '@nestjs/common';
import { RubriqueService } from './rubrique.service';
import { RubriqueDto } from './dto/rubrique.dto';
import { ReorderChoicesDto } from './dto/reorder-choices.dto';
import { RubriqueWithChoiceCountDto } from './dto/rubrique-with-count.dto';

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

  @Get(':id/choices-with-count')
  getChoicesWithConsultationCount(@Param('id') id: string, @Query('userId') userId: string): Promise<RubriqueWithChoiceCountDto> {
    return this.rubriqueService.getChoicesWithConsultationCount(id, userId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: RubriqueDto) {
    console.log('Updating rubrique with ID:', id, 'and DTO:', JSON.stringify(dto, null, 2));
    return this.rubriqueService.update(id, dto);
  }

  @Put(':id/reorder-choices')
  reorderChoices(@Param('id') id: string, @Body() dto: ReorderChoicesDto) {
    return this.rubriqueService.reorderChoices(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rubriqueService.remove(id);
  }
}
