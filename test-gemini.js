// Gemini API 测试脚本
// 使用方法: node test-gemini.js YOUR_API_KEY

const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.argv[2] || process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.log('❌ 请提供 API Key');
  console.log('用法: node test-gemini.js YOUR_API_KEY');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

// 要测试的模型列表
const TEXT_MODELS = [
  'gemini-3-pro-preview',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

async function testModel(modelId) {
  try {
    console.log(`\n🔄 测试模型: ${modelId}`);
    const model = genAI.getGenerativeModel({ model: modelId });
    const result = await model.generateContent('说"你好"');
    const text = result.response.text();
    console.log(`✅ ${modelId} - 成功`);
    console.log(`   响应: ${text.substring(0, 50)}...`);
    return true;
  } catch (error) {
    console.log(`❌ ${modelId} - 失败`);
    console.log(`   错误: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('========== Gemini API 测试 ==========');
  console.log(`API Key: ${API_KEY.substring(0, 8)}...`);
  
  for (const modelId of TEXT_MODELS) {
    await testModel(modelId);
  }
  
  console.log('\n========== 测试完成 ==========');
}

main();
