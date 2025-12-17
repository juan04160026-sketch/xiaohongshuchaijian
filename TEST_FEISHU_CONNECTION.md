# 飞书连接测试 - 快速诊断

## 你的信息
- **Base ID**: `GGh2bW3Q2aHpi1shiVqcAlhmnMd`
- **URL**: https://ai.feishu.cn/base/GGh2bW3Q2aHpi1shiVqcAlhmnMd

## 需要的信息

要让插件正常工作，你需要提供：

1. **App ID** - 从飞书开放平台获取
2. **App Secret** - 从飞书开放平台获取

## 获取 App ID 和 App Secret 的步骤

### 步骤 1：打开飞书开放平台
访问 https://open.feishu.cn

### 步骤 2：创建或选择应用
- 如果没有应用，点击 "创建应用"
- 如果已有应用，点击进入应用详情

### 步骤 3：获取凭证
在应用详情页面，找到 "凭证与基础信息" 部分：
- 复制 **App ID**
- 复制 **App Secret**

### 步骤 4：添加权限
在应用的 "权限管理" 中，确保有以下权限：
- ✅ `bitable:app:readonly` - 读取多维表格
- ✅ `bitable:table:readonly` - 读取表格

### 步骤 5：发布应用
点击 "发布" 按钮发布应用（重要！）

## 在浏览器中测试连接

打开浏览器开发者工具 (F12)，在 Console 标签中运行以下代码：

```javascript
// 替换这些值
const APP_ID = 'YOUR_APP_ID';
const APP_SECRET = 'YOUR_APP_SECRET';
const BASE_ID = 'GGh2bW3Q2aHpi1shiVqcAlhmnMd';

async function testConnection() {
  console.log('🔍 开始测试飞书连接...\n');

  // 步骤 1：获取 Token
  console.log('📝 步骤 1: 获取 Token...');
  try {
    const tokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
    });
    
    const tokenData = await tokenRes.json();
    
    if (tokenData.code !== 0) {
      console.error('❌ Token 获取失败');
      console.error('错误代码:', tokenData.code);
      console.error('错误信息:', tokenData.msg);
      return;
    }
    
    console.log('✅ Token 获取成功\n');
    const token = tokenData.tenant_access_token;

    // 步骤 2：读取表格列表
    console.log('📝 步骤 2: 读取表格列表...');
    const tableRes = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_ID}/tables`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    const tableData = await tableRes.json();
    
    if (tableData.code !== 0) {
      console.error('❌ 表格读取失败');
      console.error('错误代码:', tableData.code);
      console.error('错误信息:', tableData.msg);
      return;
    }
    
    const tables = tableData.data?.items || [];
    console.log('✅ 表格读取成功');
    console.log('找到', tables.length, '个表格\n');

    if (tables.length === 0) {
      console.warn('⚠️ 表格中没有数据表');
      return;
    }

    // 步骤 3：读取第一个表格的记录
    console.log('📝 步骤 3: 读取表格记录...');
    const tableId = tables[0].table_id;
    const recordRes = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_ID}/tables/${tableId}/records`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    const recordData = await recordRes.json();
    
    if (recordData.code !== 0) {
      console.error('❌ 记录读取失败');
      console.error('错误代码:', recordData.code);
      console.error('错误信息:', recordData.msg);
      return;
    }
    
    const records = recordData.data?.items || [];
    console.log('✅ 记录读取成功');
    console.log('找到', records.length, '条记录\n');

    if (records.length > 0) {
      console.log('📋 第一条记录的字段：');
      const firstRecord = records[0];
      Object.entries(firstRecord.fields).forEach(([key, value]) => {
        console.log(`  • ${key}: ${JSON.stringify(value).substring(0, 100)}`);
      });
    }

    console.log('\n🎉 所有测试通过！连接正常');
    console.log('\n现在你可以在插件中使用这些凭证：');
    console.log('App ID:', APP_ID);
    console.log('App Secret:', APP_SECRET);
    console.log('Base ID:', BASE_ID);

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testConnection();
```

## 常见问题

### 问题 1：Token 获取失败 (code: 1)
**原因**: App ID 或 App Secret 错误
**解决**: 重新复制凭证，确保没有多余空格

### 问题 2：Token 获取失败 (code: 6)
**原因**: 应用未发布
**解决**: 在飞书开放平台点击 "发布" 按钮

### 问题 3：表格读取失败 (code: 91402)
**原因**: Base ID 错误或不存在
**解决**: 检查 Base ID 是否正确（应该是 20+ 个字母和数字）

### 问题 4：表格读取失败 (code: 99991001)
**原因**: 应用权限不足
**解决**: 在权限管理中添加 `bitable:app:readonly` 权限

## 如果仍然无法连接

请提供以下信息：
1. 测试时的完整错误信息
2. 浏览器控制台的所有错误日志
3. 确认 App ID 和 App Secret 是否正确复制

