import * as fs from 'fs';
import * as path from 'path';
import { HttpsProxyAgent } from 'https-proxy-agent';
import nodeFetch, { RequestInit as NodeFetchRequestInit } from 'node-fetch';

// 默认代理地址 (Clash Verge 混合代理端口)
const DEFAULT_PROXY = 'http://127.0.0.1:7897';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export interface TextGenerationResult {
  success: boolean;
  text?: string;
  error?: string;
}

export interface ImageGenerationResult {
  success: boolean;
  imagePath?: string;
  imageBase64?: string;
  error?: string;
}

export interface TestConnectionResult {
  success: boolean;
  modelName?: string;
  error?: string;
}

// 预设模型列表
export const TEXT_MODELS = [
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (实验)' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'gemini-exp-1206', name: 'Gemini Exp 1206' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview (最新)' },
];

export const IMAGE_MODELS = [
  { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image (最新)' },
  { id: 'imagen-3.0-generate-001', name: 'Imagen 3.0' },
  { id: 'imagen-3.0-fast-generate-001', name: 'Imagen 3.0 Fast' },
];

export class GeminiService {
  private apiKey: string;
  private proxyUrl: string | undefined;
  private agent: HttpsProxyAgent<string> | undefined;

  constructor(apiKey: string, proxyUrl?: string) {
    this.apiKey = apiKey;
    this.setProxy(proxyUrl || DEFAULT_PROXY);
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  setProxy(proxyUrl: string | undefined): void {
    this.proxyUrl = proxyUrl;
    this.agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
    
    if (proxyUrl) {
      console.log(`🔧 设置代理: ${proxyUrl}`);
    } else {
      console.log(`🔧 不使用代理`);
    }
  }

  // 测试代理连接
  async testProxy(): Promise<{ success: boolean; error?: string }> {
    if (!this.proxyUrl) {
      return { success: false, error: '未配置代理' };
    }

    try {
      console.log(`🧪 测试代理连接: ${this.proxyUrl}`);
      
      // 尝试访问 Google
      const response = await nodeFetch('https://www.google.com', {
        method: 'HEAD',
        agent: this.agent,
        timeout: 5000,
      } as any);

      if (response.ok) {
        console.log(`✅ 代理连接正常`);
        return { success: true };
      } else {
        return { success: false, error: `HTTP ${response.status}` };
      }
    } catch (error: any) {
      console.error(`❌ 代理连接失败:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // 通用 API 请求方法（带重试）
  private async request(endpoint: string, body: any, retries: number = 3): Promise<any> {
    const url = `${GEMINI_API_BASE}${endpoint}?key=${this.apiKey}`;
    
    const options: NodeFetchRequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      agent: this.agent,
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🌐 API 请求 (尝试 ${attempt}/${retries}): ${endpoint}`);
        
        const response = await nodeFetch(url, options);
        
        if (!response.ok) {
          const error = await response.json().catch(() => ({})) as any;
          throw new Error(error.error?.message || `HTTP ${response.status}`);
        }
        
        console.log(`✅ API 请求成功`);
        return response.json();
      } catch (error: any) {
        lastError = error;
        console.error(`❌ API 请求失败 (尝试 ${attempt}/${retries}):`, error.message);
        
        // 如果是网络错误且还有重试次数，等待后重试
        if (attempt < retries && (
          error.message.includes('ECONNRESET') ||
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('fetch failed')
        )) {
          const waitTime = attempt * 2000; // 递增等待时间：2s, 4s, 6s
          console.log(`⏳ 等待 ${waitTime/1000} 秒后重试...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // 其他错误或最后一次尝试失败，直接抛出
        throw error;
      }
    }

    throw lastError || new Error('请求失败');
  }

  // 测试文案生成连接
  async testTextConnection(modelId: string): Promise<TestConnectionResult> {
    if (!this.apiKey) {
      return { success: false, error: 'API Key 未设置' };
    }

    try {
      await this.request(`/models/${modelId}:generateContent`, {
        contents: [{ parts: [{ text: '说"连接成功"' }] }]
      });
      
      return { success: true, modelName: modelId };
    } catch (error: any) {
      return { success: false, error: error.message || '连接失败' };
    }
  }

  // 测试图片生成连接
  async testImageConnection(modelId: string): Promise<TestConnectionResult> {
    if (!this.apiKey) {
      return { success: false, error: 'API Key 未设置' };
    }

    try {
      await this.request(`/models/${modelId}:generateContent`, {
        contents: [{ parts: [{ text: '说"连接成功"' }] }]
      });
      
      return { success: true, modelName: modelId };
    } catch (error: any) {
      return { success: false, error: error.message || '连接失败' };
    }
  }


  // 生成小红书标题
  async generateTitle(
    topic: string,
    promptTemplate: string,
    modelId: string = 'gemini-3-flash-preview'
  ): Promise<TextGenerationResult> {
    if (!this.apiKey) {
      return { success: false, error: 'API Key 未设置' };
    }

    try {
      const prompt = promptTemplate.replace(/\{\{主题\}\}/g, topic);
      
      const result = await this.request(`/models/${modelId}:generateContent`, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
        }
      });

      let text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      // 清理输出：移除多余的引号、换行符、回复语等
      if (text) {
        text = text.trim();
        
        // 移除常见的回复前缀
        const prefixes = [
          /^好的[，,。！!]*\s*/,
          /^没问题[，,。！!]*\s*/,
          /^标题是[：:]*\s*/,
          /^标题[：:]*\s*/,
          /^以下是标题[：:]*\s*/,
          /^这是标题[：:]*\s*/,
          /^生成的标题是[：:]*\s*/,
          /^为您生成的标题是[：:]*\s*/,
        ];
        
        for (const prefix of prefixes) {
          text = text.replace(prefix, '');
        }
        
        // 移除首尾引号
        text = text.replace(/^["'「『《]|["'」』》]$/g, '');
        
        // 替换换行为空格
        text = text.replace(/\n+/g, ' ');
        
        // 移除多余空格
        text = text.replace(/\s+/g, ' ').trim();
      }
      
      return { success: true, text };
    } catch (error: any) {
      return { success: false, error: error.message || '生成失败' };
    }
  }

  // 生成小红书文案
  async generateContent(
    topic: string,
    promptTemplate: string,
    modelId: string = 'gemini-3-flash-preview'
  ): Promise<TextGenerationResult> {
    if (!this.apiKey) {
      return { success: false, error: 'API Key 未设置' };
    }

    try {
      const prompt = promptTemplate.replace(/\{\{主题\}\}/g, topic);

      const result = await this.request(`/models/${modelId}:generateContent`, {
        contents: [{ parts: [{ text: prompt }] }]
      });

      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      return { success: true, text };
    } catch (error: any) {
      return { success: false, error: error.message || '生成失败' };
    }
  }

  // 生成图片
  async generateImage(
    topic: string,
    promptTemplate: string,
    modelId: string = 'gemini-3-pro-image-preview',
    outputDir?: string,
    title?: string,
    content?: string
  ): Promise<ImageGenerationResult> {
    if (!this.apiKey) {
      return { success: false, error: 'API Key 未设置' };
    }

    try {
      // 替换占位符
      let imagePrompt = promptTemplate
        .replace(/\{\{主题\}\}/g, topic)
        .replace(/\{\{标题\}\}/g, title || topic)
        .replace(/\{\{正文\}\}/g, content ? content.substring(0, 100) : topic);

      console.log(`🎨 调用图片生成 API: ${modelId}`);
      console.log(`📝 提示词: ${imagePrompt.substring(0, 150)}...`);

      const result = await this.request(`/models/${modelId}:generateContent`, {
        contents: [{ parts: [{ text: imagePrompt }] }],
        generationConfig: { 
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: '1:1',  // 小红书封面建议 1:1 或 3:4
            imageSize: '1K'
          }
        }
      });

      console.log('📦 API 响应结构:', JSON.stringify(result, null, 2).substring(0, 500));

      const parts = result.candidates?.[0]?.content?.parts || [];
      console.log(`📋 响应包含 ${parts.length} 个部分`);
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const keys = Object.keys(part);
        console.log(`  部分 ${i}: 字段 [${keys.join(', ')}]`);
        
        // 打印每个字段的类型和长度
        for (const key of keys) {
          const value = part[key];
          if (typeof value === 'string') {
            console.log(`    ${key}: string, 长度 ${value.length}`);
          } else {
            console.log(`    ${key}: ${typeof value}`);
          }
        }
        
        // 检查 inlineData 字段
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';
          
          console.log(`✅ 找到图片数据 (inlineData): ${mimeType}, 大小: ${base64Data.length} 字符`);
          
          if (outputDir) {
            const ext = mimeType.split('/')[1] || 'png';
            const fileName = `ai_${Date.now()}.${ext}`;
            const filePath = path.join(outputDir, fileName);
            
            const buffer = Buffer.from(base64Data, 'base64');
            fs.writeFileSync(filePath, buffer);
            
            console.log(`💾 图片已保存: ${filePath}`);
            return { success: true, imagePath: filePath, imageBase64: base64Data };
          }
          
          return { success: true, imageBase64: base64Data };
        }
        
        // 检查 text 字段中是否包含 base64 图片数据
        if (part.text) {
          const textLength = part.text.length;
          console.log(`📝 text 字段长度: ${textLength}`);
          
          if (textLength > 1000) {
            console.log(`⚠️ 发现长文本字段，可能是 base64 图片数据`);
            
            // 尝试将文本作为 base64 图片数据
            try {
              if (outputDir) {
                const fileName = `ai_${Date.now()}.png`;
                const filePath = path.join(outputDir, fileName);
                
                const buffer = Buffer.from(part.text, 'base64');
                fs.writeFileSync(filePath, buffer);
                
                console.log(`💾 图片已保存 (从 text 字段): ${filePath}`);
                return { success: true, imagePath: filePath, imageBase64: part.text };
              }
              
              return { success: true, imageBase64: part.text };
            } catch (error: any) {
              console.error(`❌ 无法将 text 字段解析为图片:`, error.message);
            }
          }
        }
        
        // 检查其他可能的图片字段
        if (part.image) {
          console.log('⚠️ 发现 image 字段（非 inlineData）:', Object.keys(part.image));
        }
      }

      console.error('❌ 响应中未找到图片数据');
      return { success: false, error: '未能生成图片 - API 响应中无图片数据' };
    } catch (error: any) {
      console.error('❌ 图片生成异常:', error);
      return { success: false, error: error.message || '图片生成失败' };
    }
  }

  // 根据主题生成标题、文案和图片
  async generateAll(
    topic: string,
    titlePrompt: string,
    contentPrompt: string,
    imagePrompt: string,
    textModelId: string,
    imageModelId: string,
    outputDir?: string
  ): Promise<{
    title?: TextGenerationResult;
    content?: TextGenerationResult;
    image?: ImageGenerationResult;
  }> {
    const titleResult = await this.generateTitle(topic, titlePrompt, textModelId);
    const contentResult = await this.generateContent(topic, contentPrompt, textModelId);
    const imageResult = await this.generateImage(topic, imagePrompt, imageModelId, outputDir);

    return { title: titleResult, content: contentResult, image: imageResult };
  }
}
