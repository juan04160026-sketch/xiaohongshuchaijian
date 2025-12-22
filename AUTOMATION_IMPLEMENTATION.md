# 小红书自动化发布 - 实现文档

## 概述

本文档详细说明了小红书自动化发布功能的实现细节。

## 核心实现

### 1. XhsAutomation 类

**文件**: `src/main/services/XhsAutomation.ts`

**职责**: 单个小红书账号的自动化操作

**主要方法**:

```typescript
// 初始化浏览器
async initialize(): Promise<void>

// 登录小红书
async login(account: XhsAccount): Promise<boolean>

// 发布内容
async publish(task: PublishTask, account: XhsAccount): Promise<PublishResult>

// 上传图片
async uploadImage(imageUrl: string): Promise<void>

// 添加标签
async addTag(tag: string): Promise<void>

// 检查登录状态
async checkLogin(): Promise<boolean>

// 关闭浏览器
async close(): Promise<void>
```

**工作流程**:

```
1. initialize() - 启动 Chromium 浏览器
2. login() - 使用账号密码登录小红书
3. publish() - 执行发布流程
   - 进入创建页面
   - 上传封面图片
   - 填写标题
   - 填写文案
   - 添加标签
   - 点击发布
4. close() - 关闭浏览器
```

### 2. XhsPublishManager 类

**文件**: `src/main/services/XhsPublishManager.ts`

**职责**: 管理多个账号的并发发布

**主要特性**:

- **多账号支持**: 为每个账号创建独立的浏览器实例
- **并发控制**: 最多 2 个并发浏览器，避免资源过度占用
- **队列管理**: 自动排队和分配任务
- **自动重试**: 发布失败时自动重试（最多 3 次）
- **错误恢复**: 失败的实例自动清理和重建

**工作流程**:

```
发布请求 → 加入队列 → 检查并发数 → 获取或创建浏览器实例 → 执行发布 → 返回结果
```

### 3. PublishScheduler 集成

**文件**: `src/main/services/PublishScheduler.ts`

**更新内容**:

- 使用 `XhsPublishManager` 替代模拟发布
- 在 `handleTaskReady()` 中调用真实发布
- 在 `stop()` 中清理所有浏览器实例

**发布流程**:

```
1. 从飞书读取数据
2. 按时间排序任务
3. 当时间到达时触发发布
4. 使用 XhsPublishManager 执行发布
5. 记录发布结果到日志
```

## 技术细节

### Playwright 配置

```typescript
const browser = await chromium.launch({
  headless: true,  // 无头模式，不显示浏览器窗口
  args: ['--disable-blink-features=AutomationControlled'],  // 隐藏自动化标记
});

const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
  viewport: { width: 1920, height: 1080 },
});
```

### 浏览器指纹隐藏

为了避免被小红书检测为自动化工具，采用以下措施：

1. **禁用自动化标记**: `--disable-blink-features=AutomationControlled`
2. **真实 User-Agent**: 使用真实的浏览器标识
3. **真实 Viewport**: 设置合理的窗口大小
4. **Cookie 管理**: 保存和恢复登录状态

### 图片处理

```typescript
// 1. 下载图片
const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });

// 2. 保存到临时目录
fs.writeFileSync(imagePath, response.data);

// 3. 上传到小红书
await uploadInput.setInputFiles(imagePath);

// 4. 清理临时文件
fs.unlinkSync(imagePath);
```

### 错误处理

```typescript
try {
  // 执行发布
  const result = await automation.publish(task, account);
} catch (error) {
  // 记录错误
  loggerManager.logError(task.id, error);
  
  // 清理失败的实例
  await automation.close();
  automationInstances.delete(account.id);
  
  // 重新抛出错误以触发重试
  throw error;
}
```

## 并发管理

### 队列机制

```typescript
private publishQueue: Array<{
  task: PublishTask;
  account: XhsAccount;
  resolve: (result: PublishResult) => void;
  reject: (error: Error) => void;
}> = [];

async publish(task: PublishTask, account: XhsAccount): Promise<PublishResult> {
  return new Promise((resolve, reject) => {
    this.publishQueue.push({ task, account, resolve, reject });
    this.processQueue();
  });
}
```

### 并发控制

```typescript
private async processQueue(): Promise<void> {
  while (this.publishQueue.length > 0 && this.activePublishes < this.maxConcurrent) {
    const item = this.publishQueue.shift();
    this.activePublishes++;
    
    try {
      const result = await this.publishInternal(item.task, item.account);
      item.resolve(result);
    } finally {
      this.activePublishes--;
      this.processQueue();  // 处理下一个任务
    }
  }
}
```

## 性能优化

### 1. 浏览器实例复用

```typescript
// 为每个账号保持一个浏览器实例
private automationInstances: Map<string, XhsAutomation> = new Map();

// 检查登录状态，避免重复登录
const isLoggedIn = await automation.checkLogin();
if (!isLoggedIn) {
  await automation.login(account);
}
```

### 2. Cookie 持久化

```typescript
// 保存 Cookie
const cookies = await context.cookies();
fs.writeFileSync(cookiesPath, JSON.stringify(cookies));

// 加载 Cookie
const cookies = JSON.parse(fs.readFileSync(cookiesPath));
await context.addCookies(cookies);
```

### 3. 内存管理

```typescript
// 定期清理失败的实例
if (error) {
  await automation.close();
  automationInstances.delete(account.id);
}

// 应用关闭时清理所有实例
async closeAll(): Promise<void> {
  const promises = Array.from(this.automationInstances.values())
    .map(automation => automation.close());
  await Promise.all(promises);
  this.automationInstances.clear();
}
```

## 依赖项

### 新增依赖

```json
{
  "playwright": "^1.40.0",
  "@playwright/test": "^1.40.0"
}
```

### 安装

```bash
npm install
```

Playwright 会自动下载浏览器驱动（约 200MB）。

## 测试

### 单元测试

```typescript
describe('XhsAutomation', () => {
  it('should login successfully', async () => {
    const automation = new XhsAutomation();
    await automation.initialize();
    const result = await automation.login(testAccount);
    expect(result).toBe(true);
    await automation.close();
  });

  it('should publish content', async () => {
    const automation = new XhsAutomation();
    await automation.initialize();
    await automation.login(testAccount);
    const result = await automation.publish(testTask, testAccount);
    expect(result.success).toBe(true);
    await automation.close();
  });
});
```

### 集成测试

```typescript
describe('XhsPublishManager', () => {
  it('should handle concurrent publishes', async () => {
    const manager = new XhsPublishManager(loggerManager);
    
    const results = await Promise.all([
      manager.publish(task1, account1),
      manager.publish(task2, account2),
    ]);
    
    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);
  });
});
```

## 故障排除

### 常见问题

1. **浏览器启动失败**
   - 原因: Playwright 浏览器驱动未安装
   - 解决: 运行 `npm install` 重新安装

2. **登录失败**
   - 原因: 小红书网站结构变化
   - 解决: 更新选择器和登录逻辑

3. **发布超时**
   - 原因: 网络连接慢或小红书服务器响应慢
   - 解决: 增加超时时间或检