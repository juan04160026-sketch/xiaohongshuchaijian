/**
 * Gemini 图片生成 API 调试脚本
 * 用于测试图片生成 API 的响应格式
 */

const nodeFetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs');
const path = require('path');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';
const PROXY_URL = 'http://127.0.0.1:7897';

async function testImageGeneration() {
  console.log('🧪 测试 Gemini 图片生成 API\n');

  const agent = new HttpsProxyAgent(PROXY_URL);
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GEMINI_API_KEY}`;
  
  const body = {
    contents: [{
      parts: [{
        text: 'Create a beautiful spring fashion guide cover image, fresh and bright style, suitable for social media'
      }]
    }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: '1:1',
        imageSize: '1K'
      }
    }
  };

  console.log('📤 发送请求...');
  console.log('URL:', url.replace(GEMINI_API_KEY, 'API_KEY'));
  console.log('Body:', JSON.stringify(body, null, 2));
  console.log('');

  try {
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
    
    console.log('✅ API 响应成功\n');
    console.log('📦 完整响应结构:');
    console.log(JSON.stringify(result, null, 2));
    console.log('');

    // 分析响应
    const candidates = result.candidates || [];
    console.log(`📋 候选结果数量: ${candidates.length}`);
    
    if (candidates.length > 0) {
      const parts = candidates[0].content?.parts || [];
      console.log(`📋 Parts 数量: ${parts.length}`);
      
      parts.forEach((part, i) => {
        console.log(`\n  Part ${i}:`);
        console.log(`    字段: ${Object.keys(part).join(', ')}`);
        
        if (part.text) {
          console.log(`    text: ${part.text.substring(0, 100)}...`);
        }
        
        if (part.inlineData) {
          console.log(`    inlineData.mimeType: ${part.inlineData.mimeType}`);
          console.log(`    inlineData.data 长度: ${part.inlineData.data.length} 字符`);
          
          // 尝试保存图片
          try {
            const buffer = Buffer.from(part.inlineData.data, 'base64');
            const ext = part.inlineData.mimeType.split('/')[1] || 'png';
            const filename = `test_image_${Date.now()}.${ext}`;
            fs.writeFileSync(filename, buffer);
            console.log(`    ✅ 图片已保存: ${filename}`);
          } catch (err) {
            console.error(`    ❌ 保存图片失败:`, err.message);
          }
        }
        
        if (part.image) {
          console.log(`    image 字段:`, Object.keys(part.image));
        }
      });
    }

  } catch (error) {
    console.error('❌ 请求失败:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  if (GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
    console.error('❌ 请设置 GEMINI_API_KEY 环境变量');
    console.log('使用方法: GEMINI_API_KEY=your_key node test-gemini-image-debug.js');
    process.exit(1);
  }
  
  testImageGeneration().catch(console.error);
}
