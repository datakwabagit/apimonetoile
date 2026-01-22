import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategorieDto, UpdateCategorieDto } from './categorie.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) { }

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @CurrentUser() user?: UserDocument) {
    const userId = user?._id?.toString();
    return this.categoriesService.findOne(id, userId);
  }

  /**
   * GET /categories/:id/with-rubriques
   * Retourne une catégorie avec id, titre, description et ses rubriques (id, nom, titre, description, categorieId)
   */
  @Get(':id/with-rubriques')
  async getCategorieWithRubriques(@Param('id') id: string) {
    return this.categoriesService.getCategorieWithRubriques(id);
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