import { GeminiService } from './GeminiService';
import { FeishuReader } from './FeishuReader';
import { AIConfig, FeishuConfig } from '../../types';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

export interface GenerationResult {
  success: boolean;
  recordId: string;
  title?: string;
  content?: string;
  imagePath?: string;
  error?: string;
}

export class AIContentGenerator {
  private geminiService: GeminiService;
  private feishuReader: FeishuReader;
  private imageDir: string;

  constructor() {
    this.geminiService = new GeminiService('');
    this.feishuReader = new FeishuReader();
    
    // 图片输出目录
    this.imageDir = path.join(os.homedir(), '.xhs-publisher', 'ai-images');
    if (!fs.existsSync(this.imageDir)) {
      fs.mkdirSync(this.imageDir, { recursive: true });
    }
  }

  // 初始化配置
  async initialize(aiConfig: AIConfig, feishuConfig: FeishuConfig): Promise<void> {
    if (!aiConfig.geminiApiKey) {
      throw new Error('Gemini API Key 未配置');
    }

    this.geminiService.setApiKey(aiConfig.geminiApiKey);
    await this.feishuReader.connect(feishuConfig);
  }

  // 为单条记录生成内容
  async generateForRecord(
    recordId: string,
    topic: string,
    aiConfig: AIConfig,
    feishuConfig: FeishuConfig,
    dataTableId?: string
  ): Promise<GenerationResult> {
    console.log(`\n🤖 开始为记录 ${recordId} 生成内容...`);
    console.log(`📝 主题: ${topic}`);

    try {
      const textModelId = aiConfig.textModel === 'custom' 
        ? aiConfig.customTextModel 
        : aiConfig.textModel;
      
      const imageModelId = aiConfig.imageModel === 'custom'
        ? aiConfig.customImageModel
        : aiConfig.imageModel;

      if (!textModelId || !imageModelId) {
        throw new Error('AI 模型未配置');
      }

      // 默认提示词模板
      const defaultTitlePrompt = `你是一个小红书爆款标题创作专家。根据主题"{{主题}}"，创作一个具有爆款潜力的标题。

要求：
- 字数严格控制在 20 字以内
- 多采用"数字+关键词"、"提问式"、"揭秘式"或"保姆级教程"等格式
- 可以适当使用 emoji 增加吸引力

直接输出标题，不要任何解释或额外文字。`;

      const defaultContentPrompt = `你是一位精通小红书平台的资深内容创作者。根据主题"{{主题}}"，创作一篇具有爆款潜力的小红书笔记正文。

创作要求：
1. 开篇：第一句话必须抓住读者兴趣，引发共鸣
2. Emoji：全文大量使用 Emoji 作为段落分隔和重点突出（✨💡🔥👉等）
3. 结构：使用数字序号（❶❷❸）或小标题分点阐述，逻辑清晰
4. 语气：亲切真实，多用"姐妹们"、"家人们"等网络热词
5. 价值：提供实用干货、技巧或避坑指南
6. 字数：严格控制在 200 字以内
7. 标签：文末必须包含 5-8 个相关标签（格式：#标签1 #标签2）

直接输出正文内容，不要任何前缀、解释或额外文字。`;

      const defaultImagePrompt = `A bright, clean, modern social media cover image about {{主题}}, pastel colors, 1:1 square, minimalist style, no text, no logos`;

      const titlePrompt = aiConfig.titlePromptTemplate || defaultTitlePrompt;
      const contentPrompt = aiConfig.contentPromptTemplate || defaultContentPrompt;
      const imagePrompt = aiConfig.imagePromptTemplate || defaultImagePrompt;

      // 生成标题
      let generatedTitle: string | undefined;
      if (titlePrompt.trim()) {
        console.log('📝 生成标题中...');
        const titleResult = await this.geminiService.generateTitle(topic, titlePrompt, textModelId);
        if (titleResult.success && titleResult.text) {
          generatedTitle = titleResult.text.trim();
          console.log(`✅ 标题: ${generatedTitle}`);
        } else {
          console.warn(`⚠️ 标题生成失败: ${titleResult.error}`);
        }
      }

      // 生成文案
      let generatedContent: string | undefined;
      if (contentPrompt.trim()) {
        console.log('📝 生成文案中...');
        const contentResult = await this.geminiService.generateContent(topic, contentPrompt, textModelId);
        if (contentResult.success && contentResult.text) {
          generatedContent = contentResult.text.trim();
          console.log(`✅ 文案生成成功 (${generatedContent.length} 字)`);
        } else {
          console.warn(`⚠️ 文案生成失败: ${contentResult.error}`);
        }
      }

      // 生成图片（使用已生成的标题和正文）
      let generatedImagePath: string | undefined;
      if (imagePrompt.trim()) {
        console.log('🎨 生成图片中...');
        try {
          const imageResult = await this.geminiService.generateImage(
            topic,
            imagePrompt,
            imageModelId,
            this.imageDir,
            generatedTitle,
            generatedContent
          );
          if (imageResult.success && imageResult.imagePath) {
            generatedImagePath = imageResult.imagePath;
            console.log(`✅ 图片: ${generatedImagePath}`);
          } else {
            console.warn(`⚠️ 图片生成失败: ${imageResult.error}`);
            console.warn(`💡 提示: 可以在飞书表格中手动上传图片，或使用小红书的文字配图功能`);
          }
        } catch (error: any) {
          console.error(`❌ 图片生成异常: ${error.message}`);
          console.warn(`💡 提示: 图片生成失败不影响标题和文案，可以继续发布`);
        }
      }

      // 写回飞书
      const fieldsToUpdate: Record<string, any> = {};
      
      if (generatedTitle) {
        fieldsToUpdate['小红书标题'] = generatedTitle;
      }
      
      if (generatedContent) {
        fieldsToUpdate['小红书文案'] = generatedContent;
      }

      // 上传图片到飞书
      if (generatedImagePath) {
        console.log('📤 上传图片到飞书...');
        const fileToken = await this.feishuReader.uploadImage(generatedImagePath);
        if (fileToken) {
          fieldsToUpdate['小红书封面'] = [{ file_token: fileToken }];
          console.log('✅ 图片上传成功');
        } else {
          console.warn('⚠️ 图片上传失败');
        }
      }

      // 更新状态
      fieldsToUpdate['状态'] = '已生成';

      if (Object.keys(fieldsToUpdate).length > 0) {
        console.log('💾 写回飞书...');
        const updateSuccess = await this.feishuReader.updateRecord(
          feishuConfig.tableId,
          dataTableId,
          recordId,
          fieldsToUpdate
        );

        if (updateSuccess) {
          console.log('✅ 内容生成完成！');
          return {
            success: true,
            recordId,
            title: generatedTitle,
            content: generatedContent,
            imagePath: generatedImagePath,
          };
        } else {
          throw new Error('写回飞书失败');
        }
      } else {
        throw new Error('没有生成任何内容');
      }
    } catch (error: any) {
      console.error('❌ 生成失败:', error);
      return {
        success: false,
        recordId,
        error: error.message || '生成失败',
      };
    }
  }

  // 批量生成（读取飞书中所有有主题的记录）
  async generateBatch(
    aiConfig: AIConfig,
    feishuConfig: FeishuConfig,
    dataTableId?: string
  ): Promise<GenerationResult[]> {
    console.log('\n🚀 开始批量生成内容...');

    await this.initialize(aiConfig, feishuConfig);

    // 测试代理连接
    console.log('🔍 检查代理连接...');
    const proxyTest = await this.geminiService.testProxy();
    if (!proxyTest.success) {
      console.warn(`⚠️ 代理连接测试失败: ${proxyTest.error}`);
      console.warn('⚠️ 请确保 Clash Verge 正在运行，端口为 7897');
      console.warn('⚠️ 继续尝试生成，但可能会失败...');
    } else {
      console.log('✅ 代理连接正常');
    }

    // 读取所有状态为"待生成"的记录
    const records = await this.feishuReader.fetchRecordsForGeneration();

    console.log(`📋 找到 ${records.length} 条待生成的记录`);

    if (records.length === 0) {
      console.log('⚠️ 没有找到待生成的记录（状态需为"待生成"）');
      return [];
    }

    const results: GenerationResult[] = [];

    for (const record of records) {
      console.log(`\n处理记录 ${record.id}: ${record.topic}`);
      
      const result = await this.generateForRecord(
        record.id,
        record.topic,
        aiConfig,
        feishuConfig,
        dataTableId
      );
      results.push(result);

      // 间隔 2 秒，避免 API 限流
      if (results.length < records.length) {
        console.log('⏳ 等待 2 秒...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`\n✅ 批量生成完成: ${successCount}/${results.length} 成功`);

    return results;
  }
}
