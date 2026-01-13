/**
 * 测试简化的图片生成
 */

const nodeFetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs');
const path = require('path');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';
const PROXY_URL = 'http://127.0.0.1:7897';
const MODEL_ID = 'gemini-3-pro-image-preview';

async function testSimpleImage() {
  console.log('🧪 测试简化的图片生成\n');

  const agent = new HttpsProxyAgent(PROXY_URL);
  
  // 模拟已生成的内容
  const topic = '公众号运营';
  const title = '3个技巧让你的公众号涨粉翻倍 📈';
  const content = '姐妹们！今天分享我做公众号的3个涨粉秘诀✨';
  
  // 简化的图片提示词（直接英文描述）
  const imagePrompt = `Create a bright and modern social media cover image (1:1 square) about: ${topic}

Title keywords: ${title}
Content focus: ${content}

Style: Fashion magazine cover style, fresh and clean, suitable for social media
Color palette: Pastel colors or Morandi colors
Composition: Eye-catching, harmonious, with clear focal point
Text integration: Naturally incorporate key words into the scene (as tags, sticky notes, or speech bubbles)

Strictly forbidden: Any brand logos, watermarks, "free" text, or random text elements.`;

  console.log('📝 图片提示词:');
  console.log('─────────────────────────────────');
  console.log(imagePrompt);
  console.log('─────────────────────────────────\n');

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`;
    
    const body = {
      contents: [{ parts: [{ text: imagePrompt }] }],
      generationConfig: { 
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: '1:1',
          imageSize: '1K'
        }
      }
    };

    console.log('📤 发送图片生成请求...\n');
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
    const parts = result.candidates?.[0]?.content?.parts || [];
    
    console.log(`✅ 响应包含 ${parts.length} 个部分\n`);
    
    let foundImage = false;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const keys = Object.keys(part);
      console.log(`部分 ${i}: [${keys.join(', ')}]`);
      
      if (part.inlineData) {
        const base64Data = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || 'image/png';
        
        console.log(`✅ 找到图片数据: ${mimeType}`);
        console.log(`   大小: ${base64Data.length} 字符`);
        
        // 保存图片
        const outputDir = path.join(process.cwd(), 'test-output');
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const ext = mimeType.split('/')[1] || 'png';
        const fileName = `test_${Date.now()}.${ext}`;
        const filePath = path.join(outputDir, fileName);
        
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(filePath, buffer);
        
        console.log(`💾 图片已保存: ${filePath}`);
        foundImage = true;
      } else if (part.text) {
        console.log(`   text 字段长度: ${part.text.length}`);
        if (part.text.length < 200) {
          console.log(`   内容: ${part.text}`);
        }
      }
    }
    
    if (!foundImage) {
      console.log('\n⚠️ 未找到图片数据');
      console.log('可能的原因：');
      console.log('  1. 模型不支持图片生成');
      console.log('  2. API Key 权限不足');
      console.log('  3. 提示词不符合要求');
    }

  } catch (error) {
    console.error('❌ 请求失败:', error.message);
  }
}

if (require.main === module) {
  if (GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
    console.error('❌ 请设置 GEMINI_API_KEY 环境变量');
    console.log('\n使用方法:');
    console.log('  set GEMINI_API_KEY=your_key && node test-simple-image.js');
    process.exit(1);
  }
  
  testSimpleImage().catch(console.error);
}
