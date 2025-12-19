/**
 * 测试飞书连接
 * 用法: node test-feishu.js
 * 
 * 如果使用代理:
 * set HTTP_PROXY=http://127.0.0.1:7890
 * set HTTPS_PROXY=http://127.0.0.1:7890
 * node test-feishu.js
 */

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const CONFIG = {
  appId: 'cli_a9ab3d3b4a389cda',
  appSecret: 'Fs9xhwfNBqYslTGVIKpJAeWhsr6wIxJt',
  baseId: 'GGh2bW3Q2aHpi1shiVqcAlhmnMd',
};

// 检查代理设置
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;
let axiosConfig = {};
if (proxyUrl) {
  console.log('使用代理:', proxyUrl);
  axiosConfig.httpsAgent = new HttpsProxyAgent(proxyUrl);
}

async function testFeishu() {
  console.log('========================================');
  console.log('  飞书连接测试');
  console.log('========================================\n');

  console.log('配置信息:');
  console.log('  App ID:', CONFIG.appId);
  console.log('  Base ID:', CONFIG.baseId);
  console.log('');

  try {
    // 1. 获取 Token
    console.log('1. 获取 Token...');
    const tokenRes = await axios.post(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      {
        app_id: CONFIG.appId,
        app_secret: CONFIG.appSecret,
      }
    );

    console.log('   响应:', JSON.stringify(tokenRes.data, null, 2));

    if (tokenRes.data.code !== 0) {
      console.log('❌ Token 获取失败:', tokenRes.data.msg);
      return;
    }

    const token = tokenRes.data.tenant_access_token;
    console.log('✅ Token 获取成功!\n');

    // 2. 获取表格列表
    console.log('2. 获取表格列表...');
    const tablesRes = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.baseId}/tables`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('   响应:', JSON.stringify(tablesRes.data, null, 2));

    if (tablesRes.data.code !== 0) {
      console.log('❌ 获取表格失败:', tablesRes.data.msg);
      return;
    }

    const tables = tablesRes.data.data?.items || [];
    if (tables.length === 0) {
      console.log('❌ 表格为空');
      return;
    }

    const tableId = tables[0].table_id;
    const tableName = tables[0].name;
    console.log(`✅ 找到表格: ${tableName} (${tableId})\n`);

    // 3. 获取字段列表
    console.log('3. 获取字段列表...');
    const fieldsRes = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.baseId}/tables/${tableId}/fields`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (fieldsRes.data.code === 0) {
      const fields = fieldsRes.data.data?.items || [];
      console.log('✅ 字段列表:');
      fields.forEach((f, i) => {
        console.log(`   ${i + 1}. ${f.field_name} (${f.type})`);
      });
      console.log('');
    }

    // 4. 获取记录
    console.log('4. 获取记录...');
    const recordsRes = await axios.get(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.baseId}/tables/${tableId}/records`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (recordsRes.data.code !== 0) {
      console.log('❌ 获取记录失败:', recordsRes.data.msg);
      return;
    }

    const records = recordsRes.data.data?.items || [];
    console.log(`✅ 共 ${records.length} 条记录\n`);

    // 5. 显示前3条记录
    if (records.length > 0) {
      console.log('5. 记录示例 (前3条):');
      records.slice(0, 3).forEach((r, i) => {
        console.log(`\n   记录 ${i + 1}:`);
        Object.entries(r.fields).forEach(([key, value]) => {
          let displayValue = value;
          if (Array.isArray(value)) {
            displayValue = value.map(v => v.text || v).join(', ');
          } else if (typeof value === 'object' && value !== null) {
            displayValue = value.text || JSON.stringify(value);
          }
          console.log(`     ${key}: ${displayValue}`);
        });
      });
    }

    // 6. 统计待发布
    const pendingCount = records.filter(r => {
      const status = r.fields?.['状态'];
      if (Array.isArray(status)) {
        return status.some(s => s.text === '待发布' || s === '待发布');
      }
      return status === '待发布';
    }).length;

    console.log(`\n========================================`);
    console.log(`📊 统计: 总记录 ${records.length}, 待发布 ${pendingCount}`);
    console.log(`========================================`);

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }
}

testFeishu();
