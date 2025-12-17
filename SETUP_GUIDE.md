# 小红书自动发布插件 - 完整设置指南

## 你的目标
从飞书多维表格 (Base ID: `GGh2bW3Q2aHpi1shiVqcAlhmnMd`) 读取数据，自动发布到小红书。

## 第一步：在飞书开放平台创建应用

### 1.1 打开飞书开放平台
访问 https://open.feishu.cn

### 1.2 创建应用
1. 点击 "我的应用"
2. 点击 "创建应用"
3. 填写应用信息：
   - **应用名称**: 小红书自动发布
   - **应用描述**: 从飞书自动发布内容到小红书
4. 点击 "创建"

### 1.3 获取凭证
创建后，在应用详情页面找到 "凭证与基础信息"：
- 复制 **App ID** ← 这个很重要！
- 复制 **App Secret** ← 这个也很重要！

**保存这两个值，后面会用到。**

## 第二步：添加应用权限

### 2.1 进入权限管理
在应用详情页面，左侧菜单找到 "权限管理"

### 2.2 添加必要权限
点击 "添加权限"，搜索并添加以下权限：

1. **bitable:app:readonly**
   - 搜索: `bitable:app:readonly`
   - 勾选并添加

2. **bitable:table:readonly**
   - 搜索: `bitable:table:readonly`
   - 勾选并添加

### 2.3 保存权限
点击 "保存"

## 第三步：发布应用

### 3.1 发布应用
在应用详情页面，点击 "发布" 按钮

**重要：必须发布应用，否则 API 调用会失败！**

## 第四步：在浏览器中测试连接

### 4.1 打开浏览器开发者工具
按 F12 打开开发者工具，切换到 "Console" 标签

### 4.2 运行测试脚本
复制以下代码，替换你的 App ID 和 App Secret，然后粘贴到控制台运行：

```javascript
// 替换这些值为你的实际值
const APP_ID = 'YOUR_APP_ID';           // 从飞书开放平台复制
const APP_SECRET = 'YOUR_APP_SECRET';   // 从飞书开放平台复制
const BASE_ID = 'GGh2bW3Q2aHpi1shiVqcAlhmnMd';

async function testConnection() {
  console.log('%c🔍 开始测试飞书连接...', 'font-size: 14px; font-weight: bold; color: #1890ff;');
  console.log('');

  try {
    // 步骤 1：获取 Token
    console.log('%c📝 步骤 1: 获取 Token', 'font-weight: bold; color: #1890ff;');
    const tokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
    });
    
    const tokenData = await tokenRes.json();
    
    if (tokenData.code !== 0) {
      console.error('%c❌ Token 获取失败', 'color: #f5222d; font-weight: bold;');
      console.error('错误代码:', tokenData.code);
      console.error('错误信息:', tokenData.msg);
      console.error('');
      console.error('可能的原因：');
      console.error('  • App ID 或 App Secret 错误');
      console.error('  • 应用未发布');
      console.error('  • 应用已禁用');
      return;
    }
    
    console.log('%c✅ Token 获取成功', 'color: #52c41a; font-weight: bold;');
    const token = tokenData.tenant_access_token;
    console.log('');

    // 步骤 2：读取表格列表
    console.log('%c📝 步骤 2: 读取表格列表', 'font-weight: bold; color: #1890ff;');
    const tableRes = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_ID}/tables`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    const tableData = await tableRes.json();
    
    if (tableData.code !== 0) {
      console.error('%c❌ 表格读取失败', 'color: #f5222d; font-weight: bold;');
      console.error('错误代码:', tableData.code);
      console.error('错误信息:', tableData.msg);
      console.error('');
      console.error('可能的原因：');
      console.error('  • Base ID 错误或不存在');
      console.error('  • 应用权限不足');
      return;
    }
    
    const tables = tableData.data?.items || [];
    console.log('%c✅ 表格列表读取成功', 'color: #52c41a; font-weight: bold;');
    console.log('找到', tables.length, '个表格');
    console.log('');

    if (tables.length === 0) {
      console.warn('%c⚠️ 表格中没有数据表', 'color: #faad14; font-weight: bold;');
      return;
    }

    // 步骤 3：读取第一个表格的记录
    console.log('%c📝 步骤 3: 读取表格记录', 'font-weight: bold; color: #1890ff;');
    const tableId = tables[0].table_id;
    const recordRes = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_ID}/tables/${tableId}/records`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    const recordData = await recordRes.json();
    
    if (recordData.code !== 0) {
      console.error('%c❌ 记录读取失败', 'color: #f5222d; font-weight: bold;');
      console.error('错误代码:', recordData.code);
      console.error('错误信息:', recordData.msg);
      return;
    }
    
    const records = recordData.data?.items || [];
    console.log('%c✅ 记录读取成功', 'color: #52c41a; font-weight: bold;');
    console.log('找到', records.length, '条记录');
    console.log('');

    if (records.length > 0) {
      console.log('%c📋 第一条记录的字段：', 'font-weight: bold;');
      const firstRecord = records[0];
      Object.entries(firstRecord.fields).forEach(([key, value]) => {
        const valueStr = JSON.stringify(value);
        console.log(`  • ${key}: ${valueStr.substring(0, 100)}`);
      });
    }

    console.log('');
    console.log('%c🎉 所有测试通过！连接正常', 'font-size: 14px; font-weight: bold; color: #52c41a;');
    console.log('');
    console.log('现在你可以在插件中使用这些凭证：');
    console.log('App ID:', APP_ID);
    console.log('App Secret:', APP_SECRET);
    console.log('Base ID:', BASE_ID);

  } catch (error) {
    console.error('%c❌ 测试异常:', 'color: #f5222d; font-weight: bold;', error.message);
  }
}

testConnection();
```

### 4.3 查看测试结果
- 如果看到 `🎉 所有测试通过！连接正常`，说明配置正确
- 如果看到错误，按照错误信息中的提示进行修复

## 第五步：在插件中配置

### 5.1 打开插件
在 Chrome 浏览器中打开小红书自动发布插件

### 5.2 切换到配置标签
点击 "配置" 标签

### 5.3 填写配置
- **飞书 App ID**: 粘贴你的 App ID
- **飞书 App Secret**: 粘贴你的 App Secret
- **飞书表格 ID**: 粘贴 Base ID (`GGh2bW3Q2aHpi1shiVqcAlhmnMd`)

### 5.4 保存配置
点击 "保存配置" 按钮

### 5.5 测试连接
点击 "测试连接" 按钮，验证配置是否正确

## 第六步：准备飞书表格数据

### 6.1 表格字段要求
你的飞书表格应该包含以下字段：
- **小红书标题** - 笔记的标题
- **小红书文案** - 笔记的内容
- **小红书封面** - 笔记的封面图片
- **状态** - 记录状态（"pending" 或 "待发布"）

### 6.2 添加待发布内容
在飞书表格中添加内容，并将状态设置为 "pending" 或 "待发布"

## 第七步：开始发布

### 7.1 切换到发布标签
点击 "发布" 标签

### 7.2 点击开始发布
点击 "开始发布" 按钮

### 7.3 监控发布进度
在 "日志" 标签中查看发布进度和日志

## 常见问题

### Q: 测试连接时显示 "code: 1" 错误
**A**: App ID 或 App Secret 错误。请重新复制凭证，确保没有多余空格。

### Q: 测试连接时显示 "code: 6" 错误
**A**: 应用未发布。请在飞书开放平台点击 "发布" 按钮。

### Q: 测试连接时显示 "code: 91402" 错误
**A**: Base ID 错误。请检查 Base ID 是否正确（应该是 20+ 个字母和数字）。

### Q: 测试连接时显示 "code: 99991001" 错误
**A**: 应用权限不足。请在权限管理中添加 `bitable:app:readonly` 权限。

### Q: 插件无法读取表格数据
**A**: 
1. 确保表格中有数据
2. 确保有状态为 "pending" 或 "待发布" 的记录
3. 检查表格字段名称是否正确

## 需要帮助？

如果遇到问题，请：
1. 打开浏览器开发者工具 (F12)
2. 查看 Console 标签中的错误信息
3. 根据错误信息进行排查

