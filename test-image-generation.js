/**
 * 测试图片生成（围绕主题、标题、正文）
 */

const nodeFetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';
const PROXY_URL = 'http://127.0.0.1:7897';
const MODEL_ID = 'gemini-3-pro-image-preview';

async function testImageGeneration() {
  console.log('🧪 测试图片生成（围绕主题、标题、正文）\n');

  const agent = new HttpsProxyAgent(PROXY_URL);
  
  // 模拟已生成的内容
  const topic = '公众号运营';
  const title = '3个技巧让你的公众号涨粉翻倍 📈';
  const content = '姐妹们！今天分享我做公众号的3个涨粉秘诀✨ ❶选题要精准 ❷标题要吸睛 ❸内容要干货 #公众号运营 #涨粉技巧';
  
  // 新的图片提示词
  const promptTemplate = `你是一位专业的视觉设计师。根据以下信息，创作一张社交媒体封面图：

主题：${topic}
标题：${title}
正文核心：${content.substring(0, 50)}

创作流程：
1. 从标题中提炼1-3个关键词作为画面核心
2. 从正文中提炼不超过15字的核心卖点
3. 构思一个与主题相关的、富有故事感的视觉场景

设计要求：
- 风格：时尚杂志封面风格，清新明亮，适合社交媒体
- 构图：1:1方形，主体突出，色彩和谐
- 文字融合：将核心关键词自然融入画面（如标签、便签、对话框等形式）
- 色彩：使用马卡龙色或莫兰迪色系
- 禁止：任何品牌logo、水印、"免费"等敏感词、随机文字元素

直接输出完整的英文图片生成提示词，一段话，无换行，无格式符号。`;

  console.log('📝 输入信息:');
  console.log(`   主题: ${topic}`);
  console.log(`   标题: ${title}`);
  console.log(`   正文: ${content.substring(0, 50)}...`);
  console.log('');

  try {
    // 第一步：生成图片提示词
    console.log('🎨 第一步：生成图片提示词...\n');
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;
    
    const body = {
      contents: [{ parts: [{ text: promptTemplate }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      }
    };

    const response = await nodeFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      agent,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ API 错误:', JSON.stringify(error, null, 2));
      return;
    }

    const result = await response.json();
    const imagePrompt = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    console.log('✅ 生成的图片提示词:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(imagePrompt);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 第二步：使用提示词生成图片
    console.log('🎨 第二步：使用提示词生成图片...\n');
    
    const imageUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`;
    
    const imageBody = {
      contents: [{ parts: [{ text: imagePrompt }] }],
      generationConfig: { 
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: '1:1',
          imageSize: '1K'
        }
      }
    };

    console.log('📤 发送图片生成请求...');
    const imageResponse = await nodeFetch(imageUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(imageBody),
      agent,
    });

    if (!imageResponse.ok) {
      const error = await imageResponse.json();
      console.error('❌ 图片生成失败:', JSON.stringify(error, null, 2));
      return;
    }

    const imageResult = await imageResponse.json();
    const parts = imageResult.candidates?.[0]?.content?.parts || [];
    
    console.log(`✅ 响应包含 ${parts.length} 个部分`);
    
    let foundImage = false;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.inlineData) {
        console.log(`✅ 找到图片数据: ${part.inlineData.mimeType}`);
        console.log(`   大小: ${part.inlineData.data.length} 字符`);
        foundImage = true;
      }
    }
    
    if (!foundImage) {
      console.log('⚠️ 未找到图片数据');
    }

  } catch (error) {
    console.error('❌ 请求失败:', error.message);
  }
}

if (require.main === module) {
  if (GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
    console.error('❌ 请设置 GEMINI_API_KEY 环境变量');
    console.log('\n使用方法:');
    console.log('  set GEMINI_API_KEY=your_key && node test-image-generation.js');
    process.exit(1);
  }
  
  testImageGeneration().catch(console.error);
}
