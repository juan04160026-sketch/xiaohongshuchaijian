/**
 * 诊断图片生成问题
 */

const nodeFetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';
const PROXY_URL = 'http://127.0.0.1:7897';

async function diagnose() {
  console.log('🔍 诊断图片生成问题\n');
  
  const agent = new HttpsProxyAgent(PROXY_URL);

  // 测试不同的模型
  const models = [
    'gemini-3-pro-image-preview',
    'imagen-3.0-generate-001',
    'imagen-3.0-fast-generate-001',
  ];

  for (const modelId of models) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📦 测试模型: ${modelId}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`;
      
      const prompt = 'A cute cat sitting on a colorful cushion, bright and clean style, 1:1 square composition';
      
      const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: '1:1',
            imageSize: '1K'
          }
        }
      };

      console.log('📤 发送请求...');
      const response = await nodeFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        agent,
        timeout: 30000,
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`❌ 失败 (HTTP ${response.status})`);
        console.error('错误信息:', JSON.stringify(error, null, 2));
        
        // 分析错误
        if (error.error?.message) {
          const msg = error.error.message;
          if (msg.includes('not found')) {
            console.log('\n💡 原因: 模型不存在或不可用');
          } else if (msg.includes('permission')) {
            console.log('\n💡 原因: API Key 没有权限使用此模型');
          } else if (msg.includes('quota')) {
            console.log('\n💡 原因: API 配额已用完');
          }
        }
        continue;
      }

      const result = await response.json();
      const parts = result.candidates?.[0]?.content?.parts || [];
      
      console.log(`✅ 请求成功`);
      console.log(`📋 响应包含 ${parts.length} 个部分`);
      
      let hasImage = false;
      for (const part of parts) {
        if (part.inlineData) {
          hasImage = true;
          console.log(`✅ 找到图片数据: ${part.inlineData.mimeType}`);
          console.log(`   大小: ${part.inlineData.data.length} 字符`);
        } else if (part.text) {
          console.log(`📝 文本响应: ${part.text.substring(0, 100)}...`);
        }
      }
      
      if (hasImage) {
        console.log(`\n🎉 模型 ${modelId} 可以生成图片！`);
        console.log(`💡 建议: 在配置中使用此模型`);
        break;
      } else {
        console.log(`\n⚠️ 模型 ${modelId} 没有返回图片数据`);
      }

    } catch (error) {
      console.error(`❌ 请求异常:`, error.message);
      
      if (error.message.includes('ECONNREFUSED')) {
        console.log('\n💡 原因: 代理连接失败，请确保 Clash Verge 正在运行');
      } else if (error.message.includes('timeout')) {
        console.log('\n💡 原因: 请求超时，可能是网络问题');
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 诊断总结');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('如果所有模型都失败:');
  console.log('  1. 检查 API Key 是否有图片生成权限');
  console.log('  2. 检查代理是否正常运行');
  console.log('  3. 尝试在 Google AI Studio 中测试图片生成');
  console.log('');
  console.log('如果某个模型成功:');
  console.log('  - 在软件配置中选择该模型');
  console.log('  - 或在自定义模型中填写该模型 ID');
}

if (require.main === module) {
  if (GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
    console.error('❌ 请设置 GEMINI_API_KEY 环境变量');
    console.log('\n使用方法:');
    console.log('  set GEMINI_API_KEY=your_key && node diagnose-image.js');
    process.exit(1);
  }
  
  diagnose().catch(console.error);
}
