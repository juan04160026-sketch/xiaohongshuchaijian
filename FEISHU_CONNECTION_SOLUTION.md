# 飞书连接不通 - 完整解决方案

## 问题分析

你的插件已经完全开发好了，现在的问题是 **飞书连接不通**。

这通常是因为：
1. ❌ 还没有创建飞书应用
2. ❌ 应用创建了但没有发布
3. ❌ 应用没有必要的权限
4. ❌ App ID 或 App Secret 错误

---

## 解决方案（按顺序执行）

### ✅ 第 1 步：创建飞书应用（2 分钟）

1. 打开 https://open.feishu.cn
2. 点击 "我的应用"
3. 点击 "创建应用"
4. 填写应用信息：
   - 应用名称：`小红书自动发布`
   - 应用描述：`从飞书自动发布内容到小红书`
5. 点击 "创建"

### ✅ 第 2 步：获取凭证（1 分钟）

应用创建后，在应用详情页找到 "凭证与基础信息"：
- 复制 **App ID** ← 保存这个
- 复制 **App Secret** ← 保存这个

### ✅ 第 3 步：添加权限（1 分钟）

在应用详情页：
1. 左侧菜单 → "权限管理"
2. 点击 "添加权限"
3. 搜索 `bitable:app:readonly` → 勾选 → 添加
4. 搜索 `bitable:table:readonly` → 勾选 → 添加
5. 点击 "保存"

### ✅ 第 4 步：发布应用（1 分钟）

在应用详情页：
- 点击 "发布" 按钮
- **这一步很重要！不发布的话 API 调用会失败**

### ✅ 第 5 步：在插件中配置（1 分钟）

打开插件 → "配置" 标签：
1. **飞书 App ID**: 粘贴你的 App ID
2. **飞书 App Secret**: 粘贴你的 App Secret
3. **飞书表格 ID**: `GGh2bW3Q2aHpi1shiVqcAlhmnMd`
4. 点击 "保存配置"
5. 点击 "测试连接"

### ✅ 第 6 步：验证连接（1 分钟）

如果看到以下信息，说明连接成功：
```
✅ 连接成功！找到 X 个表格，Y 条记录
```

---

## 如果测试连接失败

### 错误：`code: 1` - App ID 或 Secret 错误

**解决方案：**
1. 重新打开 https://open.feishu.cn
2. 进入应用详情
3. 重新复制 App ID 和 App Secret
4. 确保没有多余空格
5. 重新粘贴到插件中
6. 重新测试

### 错误：`code: 6` - 应用未发布

**解决方案：**
1. 打开 https://open.feishu.cn
2. 进入应用详情
3. 点击 "发布" 按钮
4. 等待发布完成
5. 重新测试

### 错误：`code: 91402` - Base ID 错误

**解决方案：**
1. 打开你的飞书多维表格
2. 查看浏览器地址栏
3. 从 URL 中复制 Base ID：`https://ai.feishu.cn/base/[BASE_ID]?...`
4. 只复制 `[BASE_ID]` 部分（20+ 个字母和数字）
5. 重新粘贴到插件中
6. 重新测试

### 错误：`code: 99991001` - 权限不足

**解决方案：**
1. 打开 https://open.feishu.cn
2. 进入应用详情
3. 左侧菜单 → "权限管理"
4. 确保有以下权限：
   - ✅ `bitable:app:readonly`
   - ✅ `bitable:table:readonly`
5. 如果没有，点击 "添加权限" 添加
6. 点击 "保存"
7. **重新发布应用**
8. 重新测试

---

## 在浏览器中快速测试

如果不确定是否配置正确，可以在浏览器控制台 (F12) 运行以下代码：

```javascript
// 替换这些值为你的实际值
const APP_ID = 'YOUR_APP_ID';
const APP_SECRET = 'YOUR_APP_SECRET';
const BASE_ID = 'GGh2bW3Q2aHpi1shiVqcAlhmnMd';

async function quickTest() {
  console.log('🔍 快速测试...\n');
  
  try {
    // 获取 Token
    const tokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
    });
    
    const tokenData = await tokenRes.json();
    
    if (tokenData.code !== 0) {
      console.error('❌ Token 获取失败:', tokenData.msg);
      return;
    }
    
    console.log('✅ Token 获取成功');
    
    // 读取表格
    const tableRes = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_ID}/tables`,
      { headers: { 'Authorization': `Bearer ${tokenData.tenant_access_token}` } }
    );
    
    const tableData = await tableRes.json();
    
    if (tableData.code !== 0) {
      console.error('❌ 表格读取失败:', tableData.msg);
      return;
    }
    
    console.log('✅ 表格读取成功');
    console.log('找到', tableData.data?.items?.length || 0, '个表格');
    console.log('\n🎉 连接正常！');
    
  } catch (e) {
    console.error('❌ 测试失败:', e.message);
  }
}

quickTest();
```

---

## 总结

| 步骤 | 操作 | 时间 |
|------|------|------|
| 1 | 创建飞书应用 | 2 分钟 |
| 2 | 获取 App ID 和 Secret | 1 分钟 |
| 3 | 添加权限 | 1 分钟 |
| 4 | 发布应用 | 1 分钟 |
| 5 | 在插件中配置 | 1 分钟 |
| 6 | 测试连接 | 1 分钟 |
| **总计** | | **7 分钟** |

---

## 下一步

连接成功后：

1. 在飞书表格中添加待发布内容
2. 设置状态为 "pending" 或 "待发布"
3. 在插件中点击 "发布" 标签
4. 点击 "开始发布"
5. 在 "日志" 标签中查看发布进度

---

## 需要帮助？

- 查看 `QUICK_START_SETUP.md` - 快速开始指南
- 查看 `SETUP_GUIDE.md` - 完整设置指南
- 查看 `FEISHU_CONNECTION_ISSUES.md` - 错误诊断

