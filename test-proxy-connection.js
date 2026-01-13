/**
 * 代理连接测试脚本
 * 用于测试 Clash Verge 代理是否正常工作
 */

const nodeFetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

const PROXY_URL = 'http://127.0.0.1:7897';

async function testProxy() {
  console.log('🧪 测试代理连接\n');
  console.log(`代理地址: ${PROXY_URL}\n`);

  const agent = new HttpsProxyAgent(PROXY_URL);

  // 测试 1: 访问 Google
  console.log('📡 测试 1: 访问 Google...');
  try {
    const response = await nodeFetch('https://www.google.com', {
      method: 'HEAD',
      agent,
      timeout: 10000,
    });
    
    if (response.ok) {
      console.log('✅ Google 访问成功\n');
    } else {
      console.log(`⚠️ Google 返回状态: ${response.status}\n`);
    }
  } catch (error) {
    console.error('❌ Google 访问失败:', error.message);
    console.error('   请检查 Clash Verge 是否正在运行\n');
  }

  // 测试 2: 访问 Gemini API
  console.log('📡 测试 2: 访问 Gemini API...');
  try {
    const response = await nodeFetch(
      'https://generativelanguage.googleapis.com/v1beta/models',
      {
        method: 'GET',
        agent,
        timeout: 10000,
      }
    );
    
    if (response.ok) {
      console.log('✅ Gemini API 访问成功\n');
    } else {
      console.log(`⚠️ Gemini API 返回状态: ${response.status}\n`);
    }
  } catch (error) {
    console.error('❌ Gemini API 访问失败:', error.message);
    console.error('   可能原因:');
    console.error('   1. Clash Verge 未运行');
    console.error('   2. 代理端口不是 7897');
    console.error('   3. 代理规则未正确配置\n');
  }

  // 测试 3: 不使用代理访问国内网站
  console.log('📡 测试 3: 访问百度（不使用代理）...');
  try {
    const response = await nodeFetch('https://www.baidu.com', {
      method: 'HEAD',
      timeout: 10000,
    });
    
    if (response.ok) {
      console.log('✅ 百度访问成功（网络正常）\n');
    } else {
      console.log(`⚠️ 百度返回状态: ${response.status}\n`);
    }
  } catch (error) {
    console.error('❌ 百度访问失败:', error.message);
    console.error('   网络连接可能有问题\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 诊断建议:');
  console.log('');
  console.log('如果 Google 和 Gemini API 都失败:');
  console.log('  1. 打开 Clash Verge');
  console.log('  2. 确认代理端口是 7897（混合代理）');
  console.log('  3. 确认代理模式为"规则"或"全局"');
  console.log('  4. 检查代理规则是否包含 Google 域名');
  console.log('');
  console.log('如果百度也失败:');
  console.log('  - 检查网络连接');
  console.log('  - 检查防火墙设置');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// 运行测试
if (require.main === module) {
  testProxy().catch(console.error);
}
