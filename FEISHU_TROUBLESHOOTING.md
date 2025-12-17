# 飞书连接故障排除完整指南

## 问题诊断流程

### 第一步：检查网络连接

**打开浏览器开发者工具（F12）**，在 Console 标签中运行：

```javascript
// 测试网络连接
fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    app_id: 'test_app_id',
    app_secret: 'test_app_secret'
  })
})
.then(r => {
  console.log('✅ 网络连接正常，HTTP 状态:', r.status);
  return r.json();
})
.then(d => console.log('响应数据:', d))
.catch(e => console.error('❌ 网络错误:', e.message))
```

**预期结果：**
- 如果看到 `✅ 网络连接正常`，说明网络没问题
- 如果看到 `❌ 网络错误`，检查：
  - 是否连接到互联网
  - 是否能访问 `https://open.feishu.cn`
  - 是否有代理或防火墙限制

---

### 第二步：验证 App ID 和 App Secret

**获取正确的凭证：**

1. 打开 https://open.feishu.cn
2. 登录你的飞书账号
3. 点击 "我的应用"
4. 找到你的应用
5. 点击应用名称进入详情页
6. 在 "凭证与基础信息" 中找到：
   - **App ID** - 复制这个
   - **App Secret** - 复制这个

**检查凭证：**
- 确保没有多余的空格
- 确保没有复制错误
- 确保是正确的应用（如果有多个应用）

**在控制台测试：**
```javascript
// 替换 YOUR_APP_ID 和 YOUR_APP_SECRET
fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    app_id: 'YOUR_APP_ID',
    app_secret: 'YOUR_APP_SECRET'
  })
})
.then(r => r.json())
.then(d => {
  if (d.code === 0) {
    console.log('✅ 凭证正确！Token:', d.tenant_access_token.substring(0, 20) + '...');
  } else {
    console.log('❌ 凭证错误，错误代码:', d.code, '错误信息:', d.msg);
  }
})
```

**常见错误：**
- `code: 1` - App ID 或 App Secret 错误
- `code: 4` - App ID 不存在
- `code: 5` - 应用已禁用
- `code: 6` - 应用未发布

---

### 第三步：检查应用权限

**需要的权限：**
- `bitable:app:readonly` - 读取多维表格
- `bitable:table:readonly` - 读取表格

**检查权限步骤：**

1. 打开 https://open.feishu.cn
2. 点击 "我的应用"
3. 找到你的应用，点击进入
4. 左侧菜单找到 "权限管理"
5. 查看是否有以下权限：
   - ✅ `bitable:app:readonly`
   - ✅ `bitable:table:readonly`

**如果没有这些权限：**
1. 点击 "添加权限"
2. 搜索 `bitable:app:readonly`
3. 勾选并添加
4. 搜索 `bitable:table:readonly`
5. 勾选并添加
6. 点击 "保存"
7. **重新发布应用**（重要！）

---

### 第四步：验证 Base ID

**获取 Base ID：**

1. 打开你的飞书多维表格
2. 查看浏览器地址栏
3. URL 格式：`https://ai.feishu.cn/base/[BASE_ID]?...`
4. 复制 `[BASE_ID]` 部分

**Base ID 特征：**
- 长度：20+ 个字符
- 格式：只包含字母和数字
- 例子：`GGh2bW3Q2aHpi1shiVqcAlhmnMd`

**在控制台测试：**
```javascript
// 替换 YOUR_ACCESS_TOKEN 和 YOUR_BASE_ID
const accessToken = 'YOUR_ACCESS_TOKEN';
const baseId = 'YOUR_BASE_ID';

fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${baseId}/tables`, {
  headers: { 'Authorization': `Bearer ${accessToken}` }
})
.then(r => r.json())
.then(d => {
  if (d.code === 0) {
    console.log('✅ Base ID 正确！找到', d.data.items.length, '个表格');
  } else {
    console.log('❌ Base ID 错误，错误代码:', d.code, '错误信息:', d.msg);
  }
})
```

**常见错误：**
- `code: 91402` - Base ID 不存在或格式错误
- `code: 99991001` - 权限不足

---

## 完整测试脚本

将以下脚本复制到浏览器控制台，一次性测试所有步骤：

```javascript
async function testFeishuConnection() {
  const appId = 'YOUR_APP_ID';
  const appSecret = 'YOUR_APP_SECRET';
  const baseId = 'YOUR_BASE_ID';

  console.log('🔍 开始诊断飞书连接...\n');

  // 步骤 1：测试网络
  console.log('📝 步骤 1: 测试网络连接...');
  try {
    const testResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: 'test', app_secret: 'test' })
    });
    console.log('✅ 网络连接正常\n');
  } catch (e) {
    console.error('❌ 网络连接失败:', e.message, '\n');
    return;
  }

  // 步骤 2：获取 Token
  console.log('📝 步骤 2: 获取 Token...');
  let accessToken;
  try {
    const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret })
    });
    const tokenData = await tokenResponse.json();
    
    if (tokenData.code !== 0) {
      console.error('❌ Token 获取失败:', tokenData.msg, '(错误代码:', tokenData.code, ')\n');
      return;
    }
    
    accessToken = tokenData.tenant_access_token;
    console.log('✅ Token 获取成功\n');
  } catch (e) {
    console.error('❌ Token 获取异常:', e.message, '\n');
    return;
  }

  // 步骤 3：读取表格
  console.log('📝 步骤 3: 读取表格...');
  try {
    const tableResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${baseId}/tables`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const tableData = await tableResponse.json();
    
    if (tableData.code !== 0) {
      console.error('❌ 表格读取失败:', tableData.msg, '(错误代码:', tableData.code, ')\n');
      return;
    }
    
    const tableCount = tableData.data?.items?.length || 0;
    console.log('✅ 表格读取成功，找到', tableCount, '个表格\n');
  } catch (e) {
    console.error('❌ 表格读取异常:', e.message, '\n');
    return;
  }

  console.log('🎉 所有测试通过！连接正常');
}

// 运行测试
testFeishuConnection();
```

---

## 常见错误和解决方案

| 错误 | 原因 | 解决方案 |
|------|------|--------|
| `code: 1` | App ID 或 Secret 错误 | 重新复制凭证，检查是否有空格 |
| `code: 4` | App ID 不存在 | 确认 App ID 是否正确 |
| `code: 5` | 应用已禁用 | 在飞书开放平台启用应用 |
| `code: 6` | 应用未发布 | 在飞书开放平台发布应用 |
| `code: 13` | 权限不足 | 添加 `bitable:app:readonly` 权限 |
| `code: 91402` | Base ID 错误 | 检查 Base ID 格式和是否存在 |
| 网络错误 | 无法连接到飞书 | 检查网络连接或防火墙 |

---

## 如果仍然无法连接

请收集以下信息并反馈：

1. **错误信息** - 测试连接时显示的完整错误
2. **浏览器控制台日志** - F12 → Console 中的所有错误信息
3. **Base ID 格式** - 确认是否为 20+ 个字母和数字
4. **应用状态** - 应用是否已发布
5. **权限列表** - 应用是否有 `bitable:app:readonly` 权限

