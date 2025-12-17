# 小红书自动发布助手 - API 参考

## 飞书 API

### 获取 Tenant Access Token

**端点**: `POST https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal`

**请求体**:
```json
{
  "app_id": "cli_xxxxx",
  "app_secret": "xxxxx"
}
```

**响应**:
```json
{
  "code": 0,
  "msg": "ok",
  "tenant_access_token": "t-xxxxx",
  "expire": 7200
}
```

**错误处理**:
- `code !== 0`: 认证失败，检查 App ID 和 App Secret
- 网络超时: 检查网络连接

### 读取多维表格列表

**端点**: `GET https://open.feishu.cn/open-apis/bitable/v1/apps/{app_id}/tables`

**请求头**:
```
Authorization: Bearer {tenant_access_token}
```

**响应**:
```json
{
  "code": 0,
  "msg": "ok",
  "data": {
    "items": [
      {
        "table_id": "tblxxxxx",
        "revision": 1,
        "name": "表格名称"
      }
    ]
  }
}
```

### 读取表格记录

**端点**: `GET https://open.feishu.cn/open-apis/bitable/v1/apps/{app_id}/tables/{table_id}/records`

**请求头**:
```
Authorization: Bearer {tenant_access_token}
```

**查询参数**:
- `page_size`: 每页记录数（默认 100，最大 100）
- `page_token`: 分页令牌

**响应**:
```json
{
  "code": 0,
  "msg": "ok",
  "data": {
    "items": [
      {
        "record_id": "recxxxxx",
        "fields": {
          "小红书标题": "标题内容",
          "小红书文案": "文案内容",
          "小红书封面": "https://example.com/image.jpg",
          "主题": "主题标签",
          "状态": "pending",
          "定时时间": "2024-12-16 10:00:00"
        }
      }
    ],
    "has_more": false,
    "page_token": ""
  }
}
```

**字段说明**:
- `小红书标题`: 发布的标题（字符串）
- `小红书文案`: 发布的正文内容（字符串）
- `小红书封面`: 封面图片 URL（字符串）
- `主题`: 内容主题，用于添加标签（字符串）
- `状态`: 记录状态，"pending" 或 "待发布" 表示待发布（字符串）
- `定时时间`: 定时发布时间（字符串，格式：YYYY-MM-DD HH:mm:ss）

### 更新记录状态

**端点**: `PATCH https://open.feishu.cn/open-apis/bitable/v1/apps/{app_id}/tables/{table_id}/records/{record_id}`

**请求头**:
```
Authorization: Bearer {tenant_access_token}
Content-Type: application/json
```

**请求体**:
```json
{
  "fields": {
    "状态": "published"
  }
}
```

**响应**:
```json
{
  "code": 0,
  "msg": "ok",
  "data": {
    "record_id": "recxxxxx"
  }
}
```

## 小红书 API

### 创建笔记

**端点**: `POST https://edith.xiaohongshu.com/note/create`

**请求头**:
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**请求体**:
```json
{
  "title": "笔记标题",
  "desc": "笔记内容",
  "type": "normal",
  "image_list": [
    {
      "url": "https://example.com/image.jpg",
      "height": 1080,
      "width": 1080
    }
  ],
  "tag_list": [
    {
      "name": "标签名"
    }
  ]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "note_id": "xxxxx",
    "url": "https://www.xiaohongshu.com/explore/xxxxx"
  }
}
```

### 上传图片

**端点**: `POST https://edith.xiaohongshu.com/upload/image`

**请求头**:
```
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**请求体**:
```
file: <binary image data>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "url": "https://example.com/uploaded-image.jpg"
  }
}
```

## Chrome Extension API

### Storage API

#### 保存数据
```javascript
chrome.storage.sync.set({
  feishuAppId: 'value',
  feishuAppSecret: 'value',
  feishuTableId: 'value'
}, () => {
  console.log('保存成功');
});
```

#### 读取数据
```javascript
chrome.storage.sync.get(['feishuAppId', 'feishuAppSecret'], (result) => {
  console.log(result.feishuAppId);
});
```

#### 清除数据
```javascript
chrome.storage.sync.clear(() => {
  console.log('已清除');
});
```

### Tabs API

#### 创建标签页
```javascript
chrome.tabs.create({
  url: 'https://www.xiaohongshu.com/creation',
  active: false
}, (tab) => {
  console.log('标签页 ID:', tab.id);
});
```

#### 关闭标签页
```javascript
chrome.tabs.remove(tabId);
```

#### 执行脚本
```javascript
chrome.scripting.executeScript({
  target: { tabId: tabId },
  function: myFunction,
  args: [arg1, arg2]
}, (results) => {
  console.log('执行结果:', results[0].result);
});
```

### Runtime API

#### 发送消息
```javascript
chrome.runtime.sendMessage({
  action: 'startPublish'
}, (response) => {
  console.log('响应:', response);
});
```

#### 监听消息
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startPublish') {
    // 处理请求
    sendResponse({ success: true });
  }
});
```

## 数据模型

### PublishTask
```typescript
interface PublishTask {
  id: string;              // 记录 ID
  title: string;           // 标题
  content: string;         // 文案
  coverImage: string;      // 封面图片 URL
  topic: string;           // 主题标签
  status: string;          // 状态
  scheduledTime?: string;  // 定时时间
}
```

### PublishResult
```typescript
interface PublishResult {
  taskId: string;          // 任务 ID
  success: boolean;        // 是否成功
  contentId?: string;      // 发布内容 ID
  contentUrl?: string;     // 发布内容 URL
  publishedTime?: Date;    // 发布时间
  duration?: number;       // 发布耗时（毫秒）
  error?: string;          // 错误信息
}
```

### Log
```typescript
interface Log {
  timestamp: string;       // 时间戳（ISO 8601）
  level: string;           // 日志级别（info, success, warn, error）
  message: string;         // 日志消息
}
```

### Stats
```typescript
interface Stats {
  pending: number;         // 待发布数量
  published: number;       // 已发布数量
  failed: number;          // 失败数量
}
```

## 错误代码

### 飞书 API 错误

| 代码 | 含义 | 解决方案 |
|------|------|--------|
| 0 | 成功 | - |
| 1001 | 参数错误 | 检查请求参数 |
| 1002 | 认证失败 | 检查 App ID 和 App Secret |
| 1003 | 权限不足 | 添加必要的权限 |
| 1004 | 资源不存在 | 检查 Table ID 是否正确 |
| 1005 | 请求超时 | 检查网络连接 |

### 小红书 API 错误

| 代码 | 含义 | 解决方案 |
|------|------|--------|
| 200 | 成功 | - |
| 400 | 请求错误 | 检查请求格式 |
| 401 | 未授权 | 检查 access token |
| 403 | 禁止访问 | 检查权限 |
| 404 | 资源不存在 | 检查资源 ID |
| 429 | 请求过于频繁 | 增加请求间隔 |
| 500 | 服务器错误 | 稍后重试 |

## 速率限制

### 飞书 API
- 每分钟最多 600 个请求
- 每小时最多 36000 个请求

### 小红书 API
- 每分钟最多 100 个请求
- 每小时最多 6000 个请求

## 最佳实践

### 1. 错误处理
```javascript
try {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(data.msg);
  }
  return data;
} catch (error) {
  console.error('API 错误:', error);
  // 记录日志
  addLog('error', error.message);
}
```

### 2. 重试机制
```javascript
async function retryFetch(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1)); // 指数退避
    }
  }
}
```

### 3. 速率限制
```javascript
const queue = [];
const maxConcurrent = 3;
let currentCount = 0;

async function queueRequest(fn) {
  while (currentCount >= maxConcurrent) {
    await sleep(100);
  }
  currentCount++;
  try {
    return await fn();
  } finally {
    currentCount--;
  }
}
```

### 4. 缓存 Token
```javascript
let cachedToken = null;
let tokenExpireTime = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpireTime) {
    return cachedToken;
  }
  
  const response = await fetch(tokenUrl, options);
  const data = await response.json();
  cachedToken = data.tenant_access_token;
  tokenExpireTime = Date.now() + (data.expire - 300) * 1000; // 提前 5 分钟刷新
  return cachedToken;
}
```

## 示例代码

### 完整的发布流程

```javascript
async function publishContent() {
  try {
    // 1. 获取 token
    const token = await getFeishuToken(appId, appSecret);
    
    // 2. 读取表格数据
    const tasks = await fetchFeishuRecords(token, tableId);
    
    // 3. 逐条发布
    for (const task of tasks) {
      // 3.1 打开小红书创建页面
      const tab = await chrome.tabs.create({
        url: 'https://www.xiaohongshu.com/creation'
      });
      
      // 3.2 等待页面加载
      await sleep(3000);
      
      // 3.3 执行发布脚本
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: publishContent,
        args: [task]
      });
      
      // 3.4 关闭标签页
      chrome.tabs.remove(tab.id);
      
      // 3.5 等待间隔
      await sleep(30000);
    }
  } catch (error) {
    console.error('发布失败:', error);
  }
}
```

## 更新日志

### v1.0.0 (2024-12-16)
- 初始 API 文档
- 支持飞书 API v1
- 支持小红书 API v1
- Chrome Extension MV3 API
