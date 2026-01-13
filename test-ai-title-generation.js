/**
 * AI 标题生成测试脚本
 * 用于诊断标题生成问题
 */

const nodeFetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';
const PROXY_URL = 'http://127.0.0.1:7897';
const MODEL_ID = 'gemini-3-flash-preview';

async function testTitleGeneration() {
  console.log('🧪 测试 AI 标题生成\n');

  const agent = new HttpsProxyAgent(PROXY_URL);
  
  const topic = '公众号运营';
  
  // 测试不同的提示词
  const prompts = [
    {
      name: '简洁版',
      prompt: `生成一个小红书标题。

主题：${topic}

要求：
- 只输出标题本身，不要有任何前缀、后缀或解释
- 不要说"好的"、"标题是"等回复语
- 长度 15-25 字
- 吸引眼球，包含关键词
- 可以使用 1-2 个 emoji

标题：`
    },
    {
      name: '超简洁版',
      prompt: `${topic}

生成一个15-25字的小红书标题，直接输出：`
    },
    {
      name: '指令版',
      prompt: `请为"${topic}"生成一个小红书标题。要求：15-25字，吸引眼球，可用emoji。只输出标题，不要其他内容。`
    }
  ];

  for (const { name, prompt } of prompts) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📝 测试提示词: ${name}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log('提示词内容:');
    console.log(prompt);
    console.log('');

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`;
      
      const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 100,
        }
      };

      console.log('📤 发送请求...');
      const response = await nodeFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        agent,
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ API 错误:', JSON.stringify(error, null, 2));
        continue;
      }

      const result = await response.json();
      
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      console.log('✅ API 响应成功\n');
      console.log('原始输出:');
      console.log('─────────────────────────────────');
      console.log(text);
      console.log('─────────────────────────────────\n');
      
      // 应用后处理
      let cleaned = text.trim();
      
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
        cleaned = cleaned.replace(prefix, '');
      }
      
      // 移除首尾引号
      cleaned = cleaned.replace(/^["'「『《]|["'」』》]$/g, '');
      
      // 替换换行为空格
      cleaned = cleaned.replace(/\n+/g, ' ');
      
      // 移除多余空格
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      
      console.log('清理后输出:');
      console.log('─────────────────────────────────');
      console.log(cleaned);
      console.log('─────────────────────────────────\n');
      
      console.log(`字数: ${cleaned.length}`);
      
      if (cleaned.length >= 15 && cleaned.length <= 25) {
        console.log('✅ 长度符合要求');
      } else {
        console.log('⚠️ 长度不符合要求 (15-25字)');
      }
      
      if (cleaned.includes('好的') || cleaned.includes('标题') || cleaned.includes('生成')) {
        console.log('⚠️ 仍包含回复语');
      } else {
        console.log('✅ 无回复语');
      }

    } catch (error) {
      console.error('❌ 请求失败:', error.message);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 测试总结');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('如果所有提示词都产生回复语:');
  console.log('  - 可能是模型特性，需要更强的后处理');
  console.log('  - 或者尝试使用不同的模型');
  console.log('');
  console.log('如果某个提示词效果好:');
  console.log('  - 在 UI 中使用该提示词模板');
  console.log('  - 或者修改默认提示词');
}

// 运行测试
if (require.main === module) {
  if (GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
    console.error('❌ 请设置 GEMINI_API_KEY 环境变量');
    console.log('使用方法: set GEMINI_API_KEY=your_key && node test-ai-title-generation.js');
    process.exit(1);
  }
  
  testTitleGeneration().catch(console.error);
}
