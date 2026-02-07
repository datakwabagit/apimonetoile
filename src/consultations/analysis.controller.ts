import { Body, Controller, Delete, Get, Param, Post, Put, Patch, UseGuards } from '@nestjs/common';
import { AnalysisDbService } from './analysis-db.service';
import { SaveAnalysisDto } from './dto/save-analysis.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';

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

  @Get('by-choice/:choiceId')
  @UseGuards(JwtAuthGuard)
  async getByChoiceId(@Param('choiceId') choiceId: string, @CurrentUser() user: UserDocument) {
    const analyses = await this.analysisDbService['analysisModel']
      .find({ choiceId, clientId: user._id.toString() })
      .sort({ createdAt: -1 })
      .exec();
    return {
      success: true,
      choiceId,
      userId: user._id.toString(),
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
