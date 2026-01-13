/**
 * 测试正文生成
 */

const nodeFetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';
const PROXY_URL = 'http://127.0.0.1:7897';
const MODEL_ID = 'gemini-3-flash-preview';

async function testContentGeneration() {
  console.log('🧪 测试正文生成\n');

  const agent = new HttpsProxyAgent(PROXY_URL);
  
  const topic = '公众号运营';
  
  // 新的正文提示词
  const prompt = `你是一位精通小红书平台的资深内容创作者。根据主题"${topic}"，创作一篇具有爆款潜力的小红书笔记正文。

创作要求：
1. 开篇：第一句话必须抓住读者兴趣，引发共鸣
2. Emoji：全文大量使用 Emoji 作为段落分隔和重点突出（✨💡🔥👉等）
3. 结构：使用数字序号（❶❷❸）或小标题分点阐述，逻辑清晰
4. 语气：亲切真实，多用"姐妹们"、"家人们"等网络热词
5. 价值：提供实用干货、技巧或避坑指南
6. 字数：严格控制在 200 字以内
7. 标签：文末必须包含 5-8 个相关标签（格式：#标签1 #标签2）

直接输出正文内容，不要任何前缀、解释或额外文字。`;

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
        maxOutputTokens: 500,
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
    
    console.log('✅ 生成的正文:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(text);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 统计信息
    const charCount = text.trim().length;
    const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    const hashtagCount = (text.match(/#[\u4e00-\u9fa5a-zA-Z0-9]+/g) || []).length;
    
    console.log('📊 统计信息:');
    console.log(`   字数: ${charCount}`);
    console.log(`   Emoji 数量: ${emojiCount}`);
    console.log(`   标签数量: ${hashtagCount}`);
    
    if (charCount <= 200) {
      console.log('   ✅ 字数符合要求 (≤200字)');
    } else {
      console.log('   ⚠️ 字数超出要求 (>200字)');
    }
    
    if (emojiCount >= 5) {
      console.log('   ✅ Emoji 使用充足');
    } else {
      console.log('   ⚠️ Emoji 使用较少');
    }
    
    if (hashtagCount >= 5 && hashtagCount <= 8) {
      console.log('   ✅ 标签数量合适 (5-8个)');
    } else {
      console.log(`   ⚠️ 标签数量不符合要求 (当前${hashtagCount}个，建议5-8个)`);
    }

  } catch (error) {
    console.error('❌ 请求失败:', error.message);
  }
}

if (require.main === module) {
  if (GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
    console.error('❌ 请设置 GEMINI_API_KEY 环境变量');
    console.log('\n使用方法:');
    console.log('  set GEMINI_API_KEY=your_key && node test-content-generation.js');
    process.exit(1);
  }
  
  testContentGeneration().catch(console.error);
}
