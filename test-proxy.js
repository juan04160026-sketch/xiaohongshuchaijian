// 测试代理连接
const { HttpsProxyAgent } = require('https-proxy-agent');

const PORTS = [7897, 7890, 7891, 1080, 10808];

async function testProxy(port) {
  const proxyUrl = `http://127.0.0.1:${port}`;
  const agent = new HttpsProxyAgent(proxyUrl);
  
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/', {
      agent,
      signal: AbortSignal.timeout(5000)
    });
    console.log(`✅ 端口 ${port} 可用`);
    return true;
  } catch (error) {
    console.log(`❌ 端口 ${port} 不可用: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('测试常见代理端口...\n');
  
  for (const port of PORTS) {
    await testProxy(port);
  }
  
  console.log('\n如果都不行，请打开 Clash Verge 查看实际端口号');
}

main();
