import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeepseekService } from '../consultations/deepseek.service';
import { AnalysisTemplate, AnalysisTemplateDocument } from './schemas/analysis-template.schema';
import { GeneratedAnalysis, GeneratedAnalysisDocument } from './schemas/generated-analysis.schema';
import { CreateAnalysisTemplateDto, UpdateAnalysisTemplateDto, GenerateAnalysisDto } from './dto/analysis-template.dto';

@Injectable()
export class AnalysisTemplateService {
  constructor(
    @InjectModel(AnalysisTemplate.name)
    private analysisTemplateModel: Model<AnalysisTemplateDocument>,
    @InjectModel(GeneratedAnalysis.name)
    private generatedAnalysisModel: Model<GeneratedAnalysisDocument>,
    private deepseekService: DeepseekService,
  ) {}

  async createTemplate(dto: CreateAnalysisTemplateDto, userId?: string) {
    const template = new this.analysisTemplateModel({
      ...dto,
      createdBy: userId,
      updatedBy: userId,
    });
    return template.save();
  }

  async findAllTemplates(filters?: { category?: string; isActive?: boolean }) {
    const query: any = {};
    if (filters?.isActive !== undefined) query.isActive = filters.isActive;
    if (filters?.category) query.category = filters.category;
    return this.analysisTemplateModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findTemplateById(id: string) {
    const template = await this.analysisTemplateModel.findById(id).exec();
    if (!template) throw new NotFoundException('Analysis template not found');
    return template;
  }

  async updateTemplate(id: string, dto: UpdateAnalysisTemplateDto, userId?: string) {
    const template = await this.analysisTemplateModel.findByIdAndUpdate(
      id,
      { ...dto, updatedBy: userId, updatedAt: new Date() },
      { new: true },
    ).exec();
    if (!template) throw new NotFoundException('Analysis template not found');
    return template;
  }

  async deleteTemplate(id: string) {
    const template = await this.analysisTemplateModel.findByIdAndDelete(id).exec();
    if (!template) throw new NotFoundException('Analysis template not found');
    return { deleted: true };
  }

  async generateAnalysis(userId: string, dto: GenerateAnalysisDto) {
    const startTime = Date.now();

    // Récupérer le template
    const template = await this.findTemplateById(dto.templateId);

    // Construire le prompt complète avec les données astrologiques
    let fullPrompt = template.prompt;

    // Ajouter les données astrologiques si disponibles
    if (dto.astrologicalData) {
      fullPrompt += `\n\n### DONNEES ASTROLOGIQUES\n`;
      fullPrompt += this.formatAstrologicalData(dto.astrologicalData, dto.userName);
    }

    // Ajouter des instructions supplémentaires si fournies
    if (dto.customPromptAddition) {
      fullPrompt += `\n\n${dto.customPromptAddition}`;
    }

    // Générer l'analyse via DeepSeek
    let analysisContent: string;
    try {
      analysisContent = await this.deepseekService.generateContentFromPrompt(fullPrompt);
    } catch (error) {
      throw new BadRequestException(`Failed to generate analysis: ${error.message}`);
    }

    // Sauvegarder l'analyse générée
    const generationTime = Date.now() - startTime;
    const generatedAnalysis = new this.generatedAnalysisModel({
      userId,
      templateId: template._id,
      templateTitle: template.title,
      content: analysisContent,
      prompt: fullPrompt,
      astrologicalData: dto.astrologicalData,
      model: 'deepseek',
      generationTime,
      category: template.category,
      tags: template.tags || [],
    });

    const savedAnalysis = await generatedAnalysis.save();

    // Incrémenter le compteur d'utilisation du template
    await this.analysisTemplateModel.findByIdAndUpdate(
      template._id,
      { $inc: { usageCount: 1 } },
    ).exec();

    return savedAnalysis;
  }

  private formatAstrologicalData(data: any, userName?: string): string {
    let formatted = '';

    if (userName) {
      formatted += `Nom: ${userName}\n`;
    }

    if (data.birthDate) formatted += `Date de naissance: ${data.birthDate}\n`;
    if (data.birthTime) formatted += `Heure de naissance: ${data.birthTime}\n`;
    if (data.birthPlace) formatted += `Lieu de naissance: ${data.birthPlace}\n`;

    if (data.planets) {
      formatted += `\n## PLANETES\n`;
      formatted += this.formatObject(data.planets);
    }

    if (data.houses) {
      formatted += `\n## MAISONS\n`;
      formatted += this.formatObject(data.houses);
    }

    if (data.aspects) {
      formatted += `\n## ASPECTS\n`;
      formatted += this.formatObject(data.aspects);
    }

    if (data.asteroids) {
      formatted += `\n## ASTEROIDES\n`;
      formatted += this.formatObject(data.asteroids);
    }

    return formatted;
  }

  private formatObject(obj: any): string {
    if (typeof obj === 'string') return obj;
    return JSON.stringify(obj, null, 2);
  }

  async findGeneratedAnalyses(userId: string, filters?: { templateId?: string; limit?: number }) {
    const query: any = { userId };
    if (filters?.templateId) query.templateId = filters.templateId;
    
    let query_ = this.generatedAnalysisModel.find(query).sort({ createdAt: -1 });
    if (filters?.limit) query_ = query_.limit(filters.limit);
    
    return query_.exec();
  }

  async findGeneratedAnalysisById(userId: string, analysisId: string) {
    const analysis = await this.generatedAnalysisModel.findOne({
      _id: analysisId,
      userId,
    }).exec();
    if (!analysis) throw new NotFoundException('Generated analysis not found');
    return analysis;
  }

  async updateGeneratedAnalysis(userId: string, analysisId: string, updates: any) {
    const analysis = await this.generatedAnalysisModel.findOneAndUpdate(
      { _id: analysisId, userId },
      { ...updates, updatedAt: new Date() },
      { new: true },
    ).exec();
    if (!analysis) throw new NotFoundException('Generated analysis not found');
    return analysis;
  }

  async deleteGeneratedAnalysis(userId: string, analysisId: string) {
    const result = await this.generatedAnalysisModel.deleteOne({
      _id: analysisId,
      userId,
    }).exec();
    if (result.deletedCount === 0) throw new NotFoundException('Generated analysis not found');
    return { deleted: true };
  }
}
