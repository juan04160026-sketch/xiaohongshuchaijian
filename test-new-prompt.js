/**
 * 测试新的标题提示词
 */

const nodeFetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';
const PROXY_URL = 'http://127.0.0.1:7897';
const MODEL_ID = 'gemini-3-flash-preview';

async function testNewPrompt() {
  console.log('🧪 测试新的标题提示词\n');

  const agent = new HttpsProxyAgent(PROXY_URL);
  
  const topic = '公众号运营';
  
  // 新的提示词（和代码中一致）
  const prompt = `你是一个小红书爆款标题创作专家。根据主题"${topic}"，创作一个具有爆款潜力的标题。

要求：
- 字数严格控制在 20 字以内
- 多采用"数字+关键词"、"提问式"、"揭秘式"或"保姆级教程"等格式
- 可以适当使用 emoji 增加吸引力

直接输出标题，不要任何解释或额外文字。`;

  console.log('📝 提示词:');
  console.log('─────────────────────────────────');
  console.log(prompt);
  console.log('─────────────────────────────────\n');

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`;
    
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 100,
      }
    };

    console.log('📤 发送请求...\n');
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
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    console.log('✅ 原始输出:');
    console.log('─────────────────────────────────');
    console.log(text);
    console.log('─────────────────────────────────\n');
    
    // 应用后处理（和代码中一致）
    let cleaned = text.trim();
    
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
      cleaned = cleaned.replace(prefix, '');
    }
    
    cleaned = cleaned.replace(/^["'「『《]|["'」』》]$/g, '');
    cleaned = cleaned.replace(/\n+/g, ' ');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    console.log('✅ 清理后输出:');
    console.log('─────────────────────────────────');
    console.log(cleaned);
    console.log('─────────────────────────────────\n');
    
    console.log(`📊 字数: ${cleaned.length}`);
    
    if (cleaned.length <= 20) {
      console.log('✅ 长度符合要求 (≤20字)');
    } else {
      console.log('⚠️ 长度超出要求 (>20字)');
    }

  } catch (error) {
    console.error('❌ 请求失败:', error.message);
  }
}

if (require.main === module) {
  if (GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
    console.error('❌ 请设置 GEMINI_API_KEY 环境变量');
    console.log('\n使用方法:');
    console.log('  set GEMINI_API_KEY=your_key && node test-new-prompt.js');
    process.exit(1);
  }
  
  testNewPrompt().catch(console.error);
}
