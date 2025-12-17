/**
 * 完整示例：从飞书读取数据 → 自动发布到小红书
 * 
 * 使用方法：
 * 1. 配置飞书凭证
 * 2. 运行此脚本
 * 3. Playwright 会自动打开浏览器并发布内容
 */

import { FeishuToXhsPublisher } from './src/main/services/FeishuToXhsPublisher';
import { FeishuConfig } from './src/types';

async function main() {
  // 配置飞书凭证
  const feishuConfig: FeishuConfig = {
    appId: 'YOUR_APP_ID',           // 从飞书开放平台获取
    appSecret: 'YOUR_APP_SECRET',   // 从飞书开放平台获取
    tableId: 'GGh2bW3Q2aHpi1shiVqcAlhmnMd', // 你的 Base ID
  };

  const publisher = new FeishuToXhsPublisher();

  try {
    // 方式 1: 发布所有待发布内容
    console.log('=== 方式 1: 批量发布 ===\n');
    const result = await publisher.publishFromFeishu(feishuConfig, {
      interval: 30000,  // 30 秒间隔
      headless: false,  // 显示浏览器窗口
      slowMo: 100,      // 减速 100ms（便于观察）
    });

    console.log('发布结果:', result);

    // 方式 2: 发布单个内容
    // console.log('\n=== 方式 2: 发布单个内容 ===\n');
    // const singleResult = await publisher.publishSingleTask(
    //   feishuConfig,
    //   'rec_xxx', // 飞书记录 ID
    //   {
    //     headless: false,
    //     slowMo: 100,
    //   }
    // );
    // console.log('发布结果:', singleResult);

    // 方式 3: 测试飞书连接
    // console.log('\n=== 方式 3: 测试连接 ===\n');
    // const isConnected = await publisher.testFeishuConnection(feishuConfig);
    // console.log('连接状态:', isConnected);

  } catch (error) {
    console.error('❌ 出错:', error);
  }
}

// 运行
main();
