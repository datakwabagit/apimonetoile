import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { AnalysisDbService } from './analysis-db.service';
import { SaveAnalysisDto } from './dto/save-analysis.dto';

import { Patch } from '@nestjs/common';

@Controller('analyses')
export class AnalysisController {
  constructor(private readonly analysisDbService: AnalysisDbService) {}

  @Post()
  async create(@Body() dto: SaveAnalysisDto) {
    return this.analysisDbService.createAnalysis(dto);
  }

  @Get()
  async findAll() {
    return this.analysisDbService['analysisModel'].find();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.analysisDbService['analysisModel'].findById(id);
  }

  @Get('by-consultation/:consultationId')
  async getByConsultationId(@Param('consultationId') consultationId: string) {
    return this.analysisDbService['analysisModel'].findOne({ consultationID: consultationId });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { texte: string }) {
    return this.analysisDbService['analysisModel'].findByIdAndUpdate(id, { texte: body.texte }, { new: true });
  }

  /**
   * PATCH /analyses/by-consultation/:consultationId/texte
   * Met à jour le texte d'une analyse à partir du consultationID
   */
  @Patch('by-consultation/:consultationId/texte')
  async updateTexteByConsultationId(
    @Param('consultationId') consultationId: string,
    @Body('texte') texte: string
  ) {
    return this.analysisDbService['analysisModel'].findOneAndUpdate(
      { consultationID: consultationId },
      { texte },
      { new: true }
    );
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.analysisDbService['analysisModel'].findByIdAndDelete(id);
  }
}
