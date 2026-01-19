import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategorieDto, UpdateCategorieDto } from './categorie.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) { }

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.categoriesService.findOne(id, userId);
  }

  @Post()
  create(@Body() dto: CreateCategorieDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategorieDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}