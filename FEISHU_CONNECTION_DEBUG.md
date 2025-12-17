# 飞书连接诊断指南

## 常见问题和解决方案

### 1. **CORS 跨域问题**（最常见）
Chrome 扩展中的 fetch 请求可能被 CORS 限制阻止。

**症状：**
- 测试连接时没有任何响应
- 浏览器控制台显示 CORS 错误

**解决方案：**
在 `manifest.json` 中添加 `host_permissions`（已添加）

### 2. **网络连接问题**
- 检查网络是否正常
- 检查是否能访问 `https://open.feishu.cn`

**测试方法：**
在浏览器控制台运行：
```javascript
fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    app_id: 'YOUR_APP_ID',
    app_secret: 'YOUR_APP_SECRET'
  })
}).then(r => r.json()).then(d => console.log(d))
```

### 3. **App ID / App Secret 错误**
- 确保从飞书开放平台复制的是正确的凭证
- 检查是否有多余的空格

### 4. **应用权限不足**
- 应用需要有 "读取多维表格" 权限
- 应用需要已发布

**检查步骤：**
1. 登录 https://open.feishu.cn
2. 找到你的应用
3. 检查 "权限管理" - 确保有以下权限：
   - `bitable:app:readonly` - 读取多维表格
   - `bitable:table:readonly` - 读取表格

### 5. **Base ID 格式错误**
- Base ID 应该是 20+ 个字母和数字
- 从 URL 中提取：`https://ai.feishu.cn/base/[BASE_ID]?...`

---

## 快速诊断步骤

### 步骤 1：验证网络连接
打开浏览器开发者工具（F12），在控制台运行：
```javascript
fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    app_id: 'test',
    app_secret: 'test'
  })
})
.then(r => r.json())
.then(d => console.log('响应:', d))
.catch(e => console.error('错误:', e))
```

如果看到响应（即使是错误），说明网络连接正常。

### 步骤 2：验证凭证
确保 App ID 和 App Secret 正确：
- 登录 https://open.feishu.cn
- 找到应用
- 复制 App ID 和 App Secret
- 粘贴到插件配置中

### 步骤 3：检查权限
1. 在飞书开放平台找到应用
2. 点击 "权限管理"
3. 确保有以下权限：
   - `bitable:app:readonly`
   - `bitable:table:readonly`
4. 如果没有，添加这些权限
5. 重新发布应用

### 步骤 4：验证 Base ID
从飞书 URL 中提取 Base ID：
- 打开你的多维表格
- URL 格式：`https://ai.feishu.cn/base/[BASE_ID]?...`
- 复制 BASE_ID 部分（20+ 个字符）

---

## 如果仍然不通

请提供以下信息：
1. 测试连接时的完整错误信息
2. 浏览器控制台的错误日志（F12 → Console）
3. 你的 Base ID 格式（不需要完整的，只需确认格式）
4. 应用是否已发布

