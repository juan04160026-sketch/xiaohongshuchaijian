# 飞书 → 小红书 完整集成指南

## 数据流

```
飞书多维表格
    ↓
FeishuReader (读取数据)
    ↓
PublishTask (数据模型)
    ↓
PlaywrightPublisher (自动化填写)
    ↓
小红书发布页面
    ↓
发布成功
```

---

## 快速开始

### 1. 配置飞书凭证

```typescript
const feishuConfig = {
  appId: 'YOUR_APP_ID',           // 从飞书开放平台获取
  appSecret: 'YOUR_APP_SECRET',   // 从飞书开放平台获取
  tableId: 'GGh2bW3Q2aHpi1shiVqcAlhmnMd', // 你的 Base ID
};
```

### 2. 批量发布

```typescript
import { FeishuToXhsPublisher } from './src/main/services/FeishuToXhsPublisher';

const publisher = new FeishuToXhsPublisher();

const result = await publisher.publishFromFeishu(feishuConfig, {
  interval: 30000,  // 30 秒间隔
  headless: false,  // 显示浏览器窗口
  slowMo: 100,      // 减速 100ms
});

console.log(result);
```

### 3. 发布单个内容

```typescript
const result = await publisher.publishSingleTask(
  feishuConfig,
  'rec_xxx', // 飞书记录 ID
  {
    headless: false,
    slowMo: 100,
  }
);
```

### 4. 测试连接

```typescript
const isConnected = await publisher.testFeishuConnection(feishuConfig);
console.log('连接状态:', isConnected);
```

---

## 飞书表格字段映射

| 飞书字段 | 类型 | 说明 | 小红书对应 |
|---------|------|------|----------|
| 小红书标题 | 文本 | 笔记标题 | 标题输入框 |
| 小红书文案 | 文本 | 笔记内容 | 文案编辑器 |
| 小红书封面 | URL | 封面图片 | 图片上传 |
| 主题 | 文本 | 话题标签 | 话题输入 |
| 状态 | 选项 | pending/已发布 | 过滤条件 |
| 定时时间 | 日期 | 发布时间 | 定时发布 |
| 生成时间 | 日期 | 创建时间 | 记录用 |
| 目标账号 | 文本 | 账号选择 | 多账号支持 |
| 商品ID | 文本 | 商品链接 | 商品卡片 |
| 最少页数 | 数字 | 最少页数 | 页数限制 |
| 最多页数 | 数字 | 最多页数 | 页数限制 |
| 父记录 | 链接 | 关联记录 | 系列笔记 |

---

## 数据模型

### PublishTask

```typescript
interface PublishTask {
  id: string;                    // 飞书记录 ID
  title: string;                 // 小红书标题
  content: string;               // 小红书文案
  coverImage?: string;           // 小红书封面 URL
  topic?: string;                // 主题/话题
  status: string;                // 状态 (pending/已发布)
  scheduledTime?: Date;          // 定时发布时间
  createdTime?: Date;            // 创建时间
  targetAccount?: string;        // 目标账号
  productId?: string;            // 商品 ID
  minPages?: number;             // 最少页数
  maxPages?: number;             // 最多页数
  parentRecordId?: string;       // 父记录 ID
}
```

---

## 完整流程

### 步骤 1: 连接飞书

```typescript
const feishuReader = new FeishuReader();
await feishuReader.connect(feishuConfig);
```

### 步骤 2: 读取数据

```typescript
const tasks = await feishuReader.fetchRecords();
// 返回: PublishTask[]
```

### 步骤 3: 启动 Playwright

```typescript
const publisher = new PlaywrightPublisher();
await publisher.launch({
  headless: false,
  slowMo: 100,
});
```

### 步骤 4: 打开发布页面

```typescript
await publisher.openPublishPage();
```

### 步骤 5: 发布内容

```typescript
for (const task of tasks) {
  await publisher.publishContent(task);
  await sleep(30000); // 等待 30 秒
}
```

### 步骤 6: 关闭浏览器

```typescript
await publisher.close();
```

---

## 错误处理

```typescript
try {
  const result = await publisher.publishFromFeishu(feishuConfig);
  
  if (result.success) {
    console.log('✅ 所有内容发布成功');
  } else {
    console.log('❌ 部分内容发布失败');
    console.log('详情:', result.results.details);
  }
} catch (error) {
  console.error('❌ 发布流程出错:', error);
}
```

---

## 配置选项

### publishFromFeishu 选项

```typescript
{
  interval: 30000,  // 发布间隔（毫秒）
  headless: false,  // 是否隐藏浏览器窗口
  slowMo: 0,        // 减速执行（毫秒）
}
```

### launch 选项

```typescript
{
  headless: false,  // 显示浏览器窗口
  slowMo: 100,      // 每个操作延迟 100ms
}
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

所有操作都会输出详细的 console.log，便于调试。

### 4. 保存截图

```typescript
await page.screenshot({ path: 'debug.png' });
```

---

## 常见问题

### Q: 如何获取飞书凭证？

**A:** 
1. 打开 https://open.feishu.cn
2. 创建应用
3. 在应用详情中找到 App ID 和 App Secret
4. 添加必要权限（bitable:app:readonly）
5. 发布应用

### Q: 如何获取 Base ID？

**A:**
1. 打开你的飞书多维表格
2. 从 URL 中复制 Base ID
3. 格式：`https://ai.feishu.cn/base/[BASE_ID]?...`

### Q: 发布失败怎么办？

**A:**
1. 启用 headless: false 查看浏览器
2. 启用 slowMo 减速执行
3. 查看控制台日志
4. 检查小红书页面结构是否改变

### Q: 如何支持多账号？

**A:**
1. 在飞书表格中添加 "目标账号" 字段
2. 在 PublishTask 中使用 targetAccount
3. 在 Playwright 中切换账号

---

## 下一步

### 1. 完成所有字段映射
- [ ] 标题输入
- [ ] 文案输入
- [ ] 图片上传
- [ ] 话题添加
- [ ] 定时发布

### 2. 集成到 UI
- [ ] 在 React 组件中调用
- [ ] 显示发布进度
- [ ] 实时日志输出

### 3. 添加高级功能
- [ ] 多账号支持
- [ ] 重试机制
- [ ] 失败恢复
- [ ] 性能优化

### 4. 部署
- [ ] 打包应用
- [ ] 测试发布
- [ ] 用户文档

---

## 相关文件

- `src/main/services/FeishuToXhsPublisher.ts` - 完整集成服务
- `src/main/services/FeishuReader.ts` - 飞书读取服务
- `src/main/services/PlaywrightPublisher.ts` - Playwright 自动化
- `example-feishu-to-xhs.ts` - 使用示例

