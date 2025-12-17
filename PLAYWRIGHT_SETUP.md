# Playwright 集成指南

## 快速开始

### 1. 安装依赖

```bash
npm install
npx playwright install chromium
```

### 2. 使用方式

#### 方式 A：在 Electron 应用中使用

```typescript
import { PlaywrightPublisher } from './services/PlaywrightPublisher';

const publisher = new PlaywrightPublisher();

// 发布单个内容
await publisher.launch();
await publisher.openPublishPage();
await publisher.publishContent({
  id: '1',
  title: '我的标题',
  content: '我的文案'
});
await publisher.close();
```

#### 方式 B：批量发布

```typescript
const tasks = [
  { id: '1', title: '标题1', content: '文案1' },
  { id: '2', title: '标题2', content: '文案2' },
];

await publisher.publishBatch(tasks, 30000); // 30秒间隔
```

#### 方式 C：通过 IPC（推荐）

在主进程中：
```typescript
import { initPlaywrightIPC } from './playwright-integration';
initPlaywrightIPC();
```

在渲染进程中：
```typescript
const { ipcRenderer } = require('electron');

// 发布单个内容
const result = await ipcRenderer.invoke('playwright:publish', {
  id: '1',
  title: '标题',
  content: '文案'
});

// 批量发布
const batchResult = await ipcRenderer.invoke('playwright:publish-batch', tasks, 30000);

// 停止发布
await ipcRenderer.invoke('playwright:stop');
```

---

## 功能特性

### ✅ 已实现

- ✅ 自动打开小红书发布页面
- ✅ 自动填写标题
- ✅ 自动填写文案
- ✅ 自动点击发布按钮
- ✅ 批量发布支持
- ✅ 自定义发布间隔
- ✅ 错误处理和日志

### 🔄 待实现

- ⏳ 图片上传
- ⏳ 标签添加
- ⏳ 发布时间设置
- ⏳ 多账号支持

---

## 配置选项

### PlaywrightPublisher 选项

```typescript
// 启动浏览器
await publisher.launch({
  headless: false,  // 显示浏览器窗口
  slowMo: 100,      // 减速 100ms（便于调试）
});

// 发布内容
await publisher.publishContent({
  id: '1',
  title: '标题',
  content: '文案',
  coverImage: 'https://...',  // 可选
  topic: '话题',              // 可选
});

// 批量发布
await publisher.publishBatch(tasks, 30000); // 30秒间隔
```

---

## 调试技巧

### 1. 显示浏览器窗口

```typescript
await publisher.launch({
  headless: false,
});
```

### 2. 减速执行

```typescript
await publisher.launch({
  slowMo: 500, // 每个操作延迟 500ms
});
```

### 3. 查看详细日志

```typescript
// 在 PlaywrightPublisher.ts 中已有详细的 console.log
// 运行时查看控制台输出
```

### 4. 截图调试

```typescript
// 在 publishContent 方法中添加
await this.page?.screenshot({ path: 'debug.png' });
```

---

## 常见问题

### Q: 浏览器无法启动

**原因：** Playwright 浏览器未安装

**解决：**
```bash
npx playwright install chromium
```

### Q: 找不到元素

**原因：** 小红书页面结构改变

**解决：**
1. 打开浏览器窗口（headless: false）
2. 手动检查页面元素
3. 更新选择器

### Q: 发布失败

**原因：** 多种可能

**调试步骤：**
1. 启用 headless: false 查看页面
2. 添加 slowMo 减速执行
3. 查看控制台日志
4. 添加截图调试

---

## 性能优化

### 1. 并发发布

```typescript
// 同时发布多个内容
const results = await Promise.all([
  publisher.publishContent(task1),
  publisher.publishContent(task2),
  publisher.publishContent(task3),
]);
```

### 2. 连接复用

```typescript
// 不关闭浏览器，复用连接
await publisher.launch();
for (const task of tasks) {
  await publisher.publishContent(task);
}
await publisher.close();
```

### 3. 内存管理

```typescript
// 定期清理内存
if (i % 10 === 0) {
  await publisher.close();
  await publisher.launch();
}
```

---

## 与飞书集成

```typescript
import { FeishuReader } from './services/FeishuReader';
import { PlaywrightPublisher } from './services/PlaywrightPublisher';

const feishuReader = new FeishuReader();
const publisher = new PlaywrightPublisher();

// 读取飞书数据
const tasks = await feishuReader.readTasks();

// 发布到小红书
await publisher.publishBatch(tasks, 30000);
```

---

## 下一步

1. **集成到 UI**
   - 在 React 组件中调用 IPC
   - 显示发布进度
   - 实时日志输出

2. **添加更多功能**
   - 图片上传
   - 标签添加
   - 发布时间设置

3. **错误处理**
   - 重试机制
   - 失败恢复
   - 详细错误日志

4. **性能优化**
   - 并发发布
   - 连接复用
   - 内存管理

