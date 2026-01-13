/**
 * AI 内容生成功能测试脚本
 * 
 * 使用方法：
 * 1. 确保已配置 Gemini API Key
 * 2. 确保已配置飞书连接
 * 3. 在飞书表格中添加一条记录，主题字段填写内容，状态设为"待生成"
 * 4. 运行此脚本测试
 */

const { AIContentGenerator } = require('./dist/main/services/AIContentGenerator');

async function test() {
  console.log('🧪 AI 内容生成功能测试\n');

  // 配置信息（请根据实际情况修改）
  const aiConfig = {
    geminiApiKey: 'YOUR_GEMINI_API_KEY',
    textModel: 'gemini-2.5-flash',
    imageModel: 'gemini-3-pro-image-preview',
    titlePromptTemplate: '请根据主题"{{主题}}"生成一个吸引人的小红书标题，要求简洁有力，15-25字。',
    contentPromptTemplate: '请根据主题"{{主题}}"生成小红书文案。要求：1. 风格活泼有趣 2. 使用emoji 3. 末尾包含3-5个#标签 4. 长度200-500字',
    imagePromptTemplate: '生成一张关于"{{主题}}"的小红书封面图，风格清新明亮，适合社交媒体分享。',
  };

  const feishuConfig = {
    appId: 'YOUR_APP_ID',
    appSecret: 'YOUR_APP_SECRET',
    tableId: 'YOUR_TABLE_ID',
  };

  const generator = new AIContentGenerator();

  try {
    // 测试单条记录生成
    console.log('📝 测试单条记录生成...\n');
    const result = await generator.generateForRecord(
      'test_record_id',
      '春季穿搭指南',
      aiConfig,
      feishuConfig
    );

    if (result.success) {
      console.log('\n✅ 生成成功！');
      console.log('标题:', result.title);
      console.log('文案:', result.content?.substring(0, 100) + '...');
      console.log('图片:', result.imagePath);
    } else {
      console.log('\n❌ 生成失败:', result.error);
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  test().catch(console.error);
}

module.exports = { test };
