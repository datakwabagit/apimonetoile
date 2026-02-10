import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AnalysisDbService } from './analysis-db.service';
import { AnalysisService } from './analysis.service';
import { SaveAnalysisDto } from './dto/save-analysis.dto';

@Controller('analyses')
export class AnalysisController {
  constructor(
    private readonly analysisDbService: AnalysisDbService,
    private readonly analysisService: AnalysisService,
  ) {}

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
    const existing = await this.analysisDbService.findByConsultationId(consultationId);
    if (existing) {
      return existing;
    }

    const generated = await this.analysisService.generateAnalysis(consultationId);
    return generated?.analyse ?? generated;
  }

  @Get('by-choice/:choiceId')
  @UseGuards(JwtAuthGuard)
  async getByChoiceId(@Param('choiceId') choiceId: string) {
    const analyses = await this.analysisDbService['analysisModel']
      .find({ choiceId})
      .sort({ createdAt: -1 })
      .exec();
    return {
      success: true,
      choiceId,
      total: analyses.length,
      analyses,
    };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { texte: string }) {
    return this.analysisDbService['analysisModel'].findByIdAndUpdate(id, { texte: body.texte }, { new: true });
  }
 
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
