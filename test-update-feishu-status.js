const axios = require('axios');

// 飞书配置 - 使用你的配置
const APP_ID = 'cli_a9ab3d3b4a389cda';
const APP_SECRET = 'Fs9xhwfNBqYslTGVIKpJAeWhsr6wIxJt';
const TABLE_ID = 'GGh2bW3Q2aHpi1shiVqcAlhmnMd';

// 创建飞书客户端
const feishuClient = axios.create({
  baseURL: 'https://open.feishu.cn/open-apis',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

async function testUpdateStatus() {
  console.log('=== 测试飞书状态更新 ===\n');

  try {
    // 1. 获取 Token
    console.log('1. 获取 Token...');
    const tokenRes = await feishuClient.post('/auth/v3/tenant_access_token/internal', {
      app_id: APP_ID,
      app_secret: APP_SECRET,
    });

    if (tokenRes.data.code !== 0) {
      console.error('获取 Token 失败:', tokenRes.data.msg);
      return;
    }

    const token = tokenRes.data.tenant_access_token;
    console.log('✅ Token 获取成功\n');

    // 2. 获取表格列表
    console.log('2. 获取表格列表...');
    const tablesRes = await feishuClient.get(`/bitable/v1/apps/${TABLE_ID}/tables`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (tablesRes.data.code !== 0) {
      console.error('获取表格失败:', tablesRes.data.msg);
      return;
    }

    const tables = tablesRes.data.data?.items || [];
    if (tables.length === 0) {
      console.error('表格为空');
      return;
    }

    const firstTableId = tables[0].table_id;
    console.log(`✅ 表格ID: ${firstTableId}, 表名: ${tables[0].name}\n`);

    // 3. 获取字段列表，查看状态字段的类型
    console.log('3. 获取字段列表...');
    const fieldsRes = await feishuClient.get(`/bitable/v1/apps/${TABLE_ID}/tables/${firstTableId}/fields`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (fieldsRes.data.code === 0) {
      const fields = fieldsRes.data.data?.items || [];
      console.log('字段列表:');
      fields.forEach(f => {
        console.log(`  - ${f.field_name} (类型: ${f.type})`);
      });
      
      const statusField = fields.find(f => f.field_name === '状态');
      if (statusField) {
        console.log('\n状态字段详情:', JSON.stringify(statusField, null, 2));
      }
    }
    console.log('');

    // 4. 获取记录列表
    console.log('4. 获取记录列表...');
    const recordsRes = await feishuClient.get(`/bitable/v1/apps/${TABLE_ID}/tables/${firstTableId}/records`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (recordsRes.data.code !== 0) {
      console.error('获取记录失败:', recordsRes.data.msg);
      return;
    }

    const records = recordsRes.data.data?.items || [];
    console.log(`✅ 共 ${records.length} 条记录\n`);

    // 找一条待发布的记录
    const pendingRecord = records.find(r => {
      const status = r.fields?.['状态'];
      if (Array.isArray(status)) {
        return status.some(s => s.text === '待发布' || s === '待发布');
      }
      return status === '待发布';
    });

    if (!pendingRecord) {
      console.log('没有找到待发布的记录，尝试更新第一条记录');
      if (records.length === 0) {
        console.log('表格中没有记录');
        return;
      }
    }

    const recordToUpdate = pendingRecord || records[0];
    const recordId = recordToUpdate.record_id;
    console.log(`5. 准备更新记录: ${recordId}`);
    console.log('   当前状态:', JSON.stringify(recordToUpdate.fields?.['状态']));

    // 5. 尝试更新状态
    console.log('\n6. 尝试更新状态为"已发布"...');
    
    // 尝试不同的格式
    const formats = [
      { '状态': '已发布' },  // 纯文本
      { '状态': { text: '已发布' } },  // 对象格式
      { '状态': [{ text: '已发布' }] },  // 数组格式
    ];

    for (let i = 0; i < formats.length; i++) {
      console.log(`\n尝试格式 ${i + 1}:`, JSON.stringify(formats[i]));
      
      try {
        const updateRes = await feishuClient.put(
          `/bitable/v1/apps/${TABLE_ID}/tables/${firstTableId}/records/${recordId}`,
          { fields: formats[i] },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log('响应:', JSON.stringify(updateRes.data, null, 2));

        if (updateRes.data.code === 0) {
          console.log('✅ 更新成功！使用格式:', JSON.stringify(formats[i]));
          break;
        } else {
          console.log('❌ 更新失败:', updateRes.data.msg);
        }
      } catch (error) {
        console.log('❌ 请求异常:', error.message);
      }
    }

  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testUpdateStatus();
