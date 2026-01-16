import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';
import { AnalysisTemplateService } from './analysis-template.service';
import { CreateAnalysisTemplateDto, UpdateAnalysisTemplateDto, GenerateAnalysisDto } from './dto/analysis-template.dto';

@ApiTags('Analysis Templates')
@Controller('analysis-templates')
export class AnalysisTemplateController {
  constructor(private readonly analysisTemplateService: AnalysisTemplateService) {}

  /**
   * GET /analysis-templates
   * Get all analysis templates
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all analysis templates' })
  @ApiResponse({ status: 200, description: 'List of analysis templates.' })
  async findAllTemplates(
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
  ) {
    const filters = {
      category,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    };
    return this.analysisTemplateService.findAllTemplates(filters);
  }

  /**
   * GET /analysis-templates/:id
   * Get a specific analysis template
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get analysis template by ID' })
  @ApiResponse({ status: 200, description: 'Analysis template.' })
  async findTemplateById(@Param('id') id: string) {
    return this.analysisTemplateService.findTemplateById(id);
  }

  /**
   * POST /analysis-templates
   * Create a new analysis template (Admin only)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create analysis template' })
  @ApiResponse({ status: 201, description: 'Analysis template created.' })
  async createTemplate(
    @Body() dto: CreateAnalysisTemplateDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.analysisTemplateService.createTemplate(dto, user._id.toString());
  }

  /**
   * PUT /analysis-templates/:id
   * Update an analysis template
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update analysis template' })
  @ApiResponse({ status: 200, description: 'Analysis template updated.' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateAnalysisTemplateDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.analysisTemplateService.updateTemplate(id, dto, user._id.toString());
  }

  /**
   * DELETE /analysis-templates/:id
   * Delete an analysis template
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete analysis template' })
  @ApiResponse({ status: 200, description: 'Analysis template deleted.' })
  async deleteTemplate(@Param('id') id: string) {
    return this.analysisTemplateService.deleteTemplate(id);
  }

  /**
   * POST /analysis-templates/:id/generate
   * Generate an analysis from a template
   */
  @Post(':id/generate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate analysis from template' })
  @ApiResponse({ status: 201, description: 'Analysis generated.' })
  async generateAnalysis(
    @Param('id') id: string,
    @Body() dto: GenerateAnalysisDto,
    @CurrentUser() user: UserDocument,
  ) {
    const dtoWithTemplateId = { ...dto, templateId: id };
    return this.analysisTemplateService.generateAnalysis(user._id.toString(), dtoWithTemplateId);
  }

  /**
   * GET /analysis-templates/generated/my
   * Get user's generated analyses
   */
  @Get('generated/my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my generated analyses' })
  @ApiResponse({ status: 200, description: 'List of generated analyses.' })
  async getMyGeneratedAnalyses(
    @CurrentUser() user: UserDocument,
    @Query('templateId') templateId?: string,
    @Query('limit') limit?: string,
  ) {
    const filters = {
      templateId,
      limit: limit ? parseInt(limit) : undefined,
    };
    return this.analysisTemplateService.findGeneratedAnalyses(user._id.toString(), filters);
  }

  /**
   * GET /analysis-templates/generated/:analysisId
   * Get a specific generated analysis
   */
  @Get('generated/:analysisId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get generated analysis by ID' })
  @ApiResponse({ status: 200, description: 'Generated analysis.' })
  async getGeneratedAnalysis(
    @Param('analysisId') analysisId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.analysisTemplateService.findGeneratedAnalysisById(user._id.toString(), analysisId);
  }

  /**
   * PUT /analysis-templates/generated/:analysisId
   * Update a generated analysis (rating, favorite, etc)
   */
  @Put('generated/:analysisId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update generated analysis' })
  @ApiResponse({ status: 200, description: 'Generated analysis updated.' })
  async updateGeneratedAnalysis(
    @Param('analysisId') analysisId: string,
    @Body() updates: any,
    @CurrentUser() user: UserDocument,
  ) {
    return this.analysisTemplateService.updateGeneratedAnalysis(user._id.toString(), analysisId, updates);
  }

  /**
   * DELETE /analysis-templates/generated/:analysisId
   * Delete a generated analysis
   */
  @Delete('generated/:analysisId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete generated analysis' })
  @ApiResponse({ status: 200, description: 'Generated analysis deleted.' })
  async deleteGeneratedAnalysis(
    @Param('analysisId') analysisId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.analysisTemplateService.deleteGeneratedAnalysis(user._id.toString(), analysisId);
  }
}
