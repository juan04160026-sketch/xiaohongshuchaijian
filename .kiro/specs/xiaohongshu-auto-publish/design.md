# 小红书自动发布插件 - 设计文档

## 概述

小红书自动发布插件是一个基于 Node.js + Electron 的后台自动化工具。系统从飞书多维表格中读取内容数据，通过小红书 API 或自动化脚本自动发布内容。系统支持多账号管理、精确到分钟的定时发布、发布间隔控制、实时监控和暂停/继续功能。

## 架构

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron 主进程                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              配置管理 (Config Manager)               │  │
│  │  - 飞书 API 密钥、表格 ID                            │  │
│  │  - 小红书账号凭证（加密存储）                        │  │
│  │  - 发布间隔、超时设置                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           任务调度器 (Task Scheduler)                │  │
│  │  - 监控待发布任务                                    │  │
│  │  - 按时间和优先级排序                                │  │
│  │  - 触发发布操作                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           发布引擎 (Publishing Engine)               │  │
│  │  - 执行发布操作                                      │  │
│  │  - 管理发布间隔                                      │  │
│  │  - 处理暂停/继续                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           日志管理器 (Logger Manager)                │  │
│  │  - 记录任务状态                                      │  │
│  │  - 记录发布结果                                      │  │
│  │  - 提供日志查询接口                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Electron 渲染进程                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              UI 界面 (React/Vue)                     │  │
│  │  - 笔记列表展示                                      │  │
│  │  - 发布监控面板                                      │  │
│  │  - 配置设置页面                                      │  │
│  │  - 日志查询界面                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    外部服务                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  飞书 API    │  │ 小红书 API   │  │ 本地存储     │     │
│  │  (数据读取)  │  │ (内容发布)   │  │ (配置/日志)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## 组件和接口

### 1. 配置管理器 (ConfigManager)

**职责**：管理系统配置，包括飞书 API、小红书账号、发布间隔等。

**接口**：
```typescript
interface ConfigManager {
  // 飞书配置
  setFeishuConfig(appId: string, appSecret: string, tableId: string): Promise<void>
  getFeishuConfig(): FeishuConfig
  validateFeishuConfig(): Promise<boolean>
  
  // 小红书账号管理
  addXhsAccount(account: XhsAccount): Promise<void>
  removeXhsAccount(accountId: string): Promise<void>
  getXhsAccounts(): XhsAccount[]
  getXhsAccount(accountId: string): XhsAccount | null
  
  // 发布设置
  setPublishInterval(seconds: number): void
  getPublishInterval(): number
  setExpiredTaskBehavior(behavior: 'publish' | 'skip'): void
  getExpiredTaskBehavior(): 'publish' | 'skip'
  
  // 配置持久化
  saveConfig(): Promise<void>
  loadConfig(): Promise<void>
}
```

### 2. 飞书数据读取器 (FeishuReader)

**职责**：从飞书多维表格读取发布任务数据。

**接口**：
```typescript
interface FeishuReader {
  // 连接和认证
  connect(config: FeishuConfig): Promise<void>
  validateConnection(): Promise<boolean>
  
  // 数据读取
  fetchRecords(): Promise<PublishTask[]>
  fetchRecordById(recordId: string): Promise<PublishTask>
  
  // 数据解析
  parseRecord(record: any): PublishTask
  validateRecord(record: PublishTask): ValidationResult
}
```

### 3. 任务调度器 (TaskScheduler)

**职责**：监控待发布任务，按时间和优先级排序，触发发布操作。

**接口**：
```typescript
interface TaskScheduler {
  // 任务管理
  addTask(task: PublishTask): void
  removeTask(taskId: string): void
  getTasks(): PublishTask[]
  
  // 调度控制
  start(): void
  stop(): void
  pause(): void
  resume(): void
  
  // 任务查询
  getNextTask(): PublishTask | null
  getTasksByStatus(status: TaskStatus): PublishTask[]
  
  // 事件
  on(event: 'task-ready', callback: (task: PublishTask) => void): void
  on(event: 'task-expired', callback: (task: PublishTask) => void): void
}
```

### 4. 发布引擎 (PublishingEngine)

**职责**：执行发布操作，管理发布间隔，处理暂停/继续。

**接口**：
```typescript
interface PublishingEngine {
  // 发布控制
  publish(task: PublishTask, account: XhsAccount): Promise<PublishResult>
  pause(): void
  resume(): void
  
  // 间隔管理
  setInterval(seconds: number): void
  getInterval(): number
  
  // 重试机制
  retry(task: PublishTask, account: XhsAccount): Promise<PublishResult>
  
  // 事件
  on(event: 'publish-start', callback: (task: PublishTask) => void): void
  on(event: 'publish-success', callback: (result: PublishResult) => void): void
  on(event: 'publish-failed', callback: (error: PublishError) => void): void
}
```

### 5. 日志管理器 (LoggerManager)

**职责**：记录任务状态、发布结果、错误信息。

**接口**：
```typescript
interface LoggerManager {
  // 日志记录
  logTaskStatus(taskId: string, status: TaskStatus, metadata?: any): void
  logPublishResult(taskId: string, result: PublishResult): void
  logError(taskId: string, error: Error): void
  
  // 日志查询
  getLogs(filter?: LogFilter): Log[]
  searchLogs(query: string): Log[]
  getLogsByTask(taskId: string): Log[]
  
  // 日志导出
  exportLogs(format: 'json' | 'csv'): Promise<string>
}
```

## 数据模型

### PublishTask（发布任务）

```typescript
interface PublishTask {
  id: string                    // 任务 ID（来自飞书记录 ID）
  title: string                 // 小红书标题
  content: string               // 小红书文案
  coverImage: string            // 小红书封面（图片链接）
  images?: string[]             // 其他图片链接
  topic: string                 // 主题
  status: TaskStatus            // 任务状态
  scheduledTime: Date           // 定时时间
  createdTime: Date             // 生成时间
  targetAccount: string         // 目标账号 ID
  productId?: string            // 商品 ID
  minPages?: number             // 最少页数
  maxPages?: number             // 最多页数
  parentRecordId?: string       // 父记录 ID
  publishedTime?: Date          // 发布时间
  publishedUrl?: string         // 发布链接
  errorMessage?: string         // 错误信息
}

type TaskStatus = 'pending' | 'processing' | 'published' | 'failed' | 'expired'
```

### XhsAccount（小红书账号）

```typescript
interface XhsAccount {
  id: string                    // 账号 ID
  username: string              // 用户名
  password: string              // 密码（加密存储）
  cookies?: string              // 登录 cookies（加密存储）
  isValid: boolean              // 凭证是否有效
  lastValidated: Date           // 最后验证时间
  createdTime: Date             // 创建时间
}
```

### PublishResult（发布结果）

```typescript
interface PublishResult {
  taskId: string                // 任务 ID
  success: boolean              // 是否成功
  contentId?: string            // 小红书内容 ID
  contentUrl?: string           // 小红书内容链接
  publishedTime: Date           // 发布时间
  duration: number              // 发布耗时（毫秒）
  errorMessage?: string         // 错误信息
}
```

### Log（日志记录）

```typescript
interface Log {
  id: string                    // 日志 ID
  timestamp: Date               // 时间戳
  taskId: string                // 任务 ID
  level: 'info' | 'warn' | 'error'  // 日志级别
  message: string               // 日志信息
  metadata?: any                // 元数据
}
```

## 正确性属性

一个属性是一个特征或行为，应该在系统的所有有效执行中保持真实——本质上，这是关于系统应该做什么的正式陈述。属性充当人类可读的规范和机器可验证的正确性保证之间的桥梁。

### 属性 1：飞书数据解析完整性
*对于任何*包含所有必需字段的飞书表格记录，系统应该能够解析出所有字段（标题、文案、封面、状态、商品ID）并创建有效的发布任务。
**验证需求：1.2**

### 属性 2：缺失字段处理
*对于任何*缺失必需字段的飞书表格记录，系统应该跳过该记录并记录错误，而不是抛出异常。
**验证需求：1.3**

### 属性 3：多账号隔离
*对于任何*发布任务和多个小红书账号，系统应该使用任务指定的账号凭证进行发布，而不是使用其他账号。
**验证需求：2.2**

### 属性 4：定时发布准确性
*对于任何*指定了发布时间的任务，当系统时间到达该时间时，系统应该立即执行发布操作。
**验证需求：3.1, 3.2**

### 属性 5：过期任务处理
*对于任何*发布时间已过期的任务，系统应该根据用户配置立即发布或标记为已过期。
**验证需求：3.3, 7.2**

### 属性 6：任务顺序处理
*对于任何*在同一时间需要发布的多个任务，系统应该按顺序依次发布，而不是并发发布。
**验证需求：3.4, 7.4**

### 属性 7：任务优先级排序
*对于任何*待发布任务集合，系统应该按优先级和时间顺序排序，确保优先级高的任务先发布。
**验证需求：4.2**

### 属性 8：发布结果记录
*对于任何*成功发布的任务，系统应该记录发布的内容 ID、链接和时间戳。
**验证需求：5.3, 6.2**

### 属性 9：发布失败处理
*对于任何*发布失败的任务，系统应该记录详细的错误信息并支持重试。
**验证需求：5.4, 6.3**

### 属性 10：任务状态一致性
*对于任何*发布任务，系统记录的任务状态应该与实际发布结果一致。
**验证需求：6.1**

### 属性 11：发布间隔遵守
*对于任何*配置的发布间隔，系统应该在两次发布之间等待至少指定的秒数。
**验证需求：8.1, 8.2**

### 属性 12：间隔配置动态更新
*对于任何*发布间隔的修改，系统应该立即应用新的间隔设置到后续的发布操作。
**验证需求：8.3**

### 属性 13：发布进度准确性
*对于任何*发布过程，系统显示的进度（已发布数/总数）应该与实际发布的任务数一致。
**验证需求：9.1**

### 属性 14：暂停状态保存
*对于任何*暂停的发布过程，系统应该保存当前状态，使得恢复后能从暂停位置继续。
**验证需求：9.3, 9.4**

### 属性 15：笔记列表状态同步
*对于任何*发布完成的任务，系统应该更新笔记列表中的状态为已发布。
**验证需求：10.3**

### 属性 16：配置持久化
*对于任何*保存的配置，系统应该能够在重启后恢复相同的配置。
**验证需求：11.3**

### 属性 17：配置验证
*对于任何*新配置，系统应该验证其有效性，只有有效的配置才能被保存。
**验证需求：11.4**

## 错误处理

### 飞书 API 错误
- 连接失败：记录错误，提示用户检查网络和 API 密钥
- 表格不存在：记录错误，提示用户检查表格 ID
- 字段缺失：跳过该记录，记录警告

### 小红书发布错误
- 账号凭证过期：提示用户重新授权
- 内容违规：记录错误，标记任务为失败
- 网络错误：支持自动重试（最多 3 次）
- 图片下载失败：记录错误，标记任务为失败

### 系统错误
- 配置文件损坏：提示用户重新配置
- 本地存储满：清理旧日志，提示用户
- 内存溢出：暂停发布，记录错误

## 测试策略

### 单元测试

单元测试验证特定的例子和边界情况：

1. **配置管理器测试**
   - 配置保存和加载
   - 账号添加和删除
   - 配置验证

2. **飞书数据读取器测试**
   - 记录解析
   - 字段验证
   - 错误处理

3. **任务调度器测试**
   - 任务排序
   - 时间触发
   - 暂停/继续

4. **发布引擎测试**
   - 发布操作
   - 间隔控制
   - 重试机制

5. **日志管理器测试**
   - 日志记录
   - 日志查询
   - 日志导出

### 属性基础测试

属性基础测试验证通用属性在所有输入上都成立。使用 **fast-check** 库进行属性基础测试，每个测试运行最少 100 次迭代。

**测试框架**：Jest + fast-check

**属性测试标记格式**：
```
**Feature: xiaohongshu-auto-publish, Property {number}: {property_text}**
```

每个属性应该有一个对应的属性基础测试：

1. **Property 1: 飞书数据解析完整性**
   - 生成随机的完整飞书记录
   - 验证系统能够解析所有字段
   - 验证创建的任务有效

2. **Property 2: 缺失字段处理**
   - 生成缺失不同字段的记录
   - 验证系统跳过这些记录
   - 验证错误被记录

3. **Property 3: 多账号隔离**
   - 生成多个账号和任务
   - 验证每个任务使用正确的账号
   - 验证账号凭证不混淆

4. **Property 4: 定时发布准确性**
   - 生成随机的发布时间
   - 模拟时间到达
   - 验证发布立即执行

5. **Property 5: 过期任务处理**
   - 生成过期的发布时间
   - 验证系统按配置处理
   - 验证结果被记录

6. **Property 6: 任务顺序处理**
   - 生成多个同时发布的任务
   - 验证系统按顺序处理
   - 验证没有并发发布

7. **Property 7: 任务优先级排序**
   - 生成多个不同优先级的任务
   - 验证排序顺序正确
   - 验证时间顺序正确

8. **Property 8: 发布结果记录**
   - 生成随机任务
   - 执行发布
   - 验证结果被正确记录

9. **Property 9: 发布失败处理**
   - 模拟发布失败
   - 验证错误被记录
   - 验证支持重试

10. **Property 10: 任务状态一致性**
    - 生成随机任务
    - 执行发布
    - 验证状态与结果一致

11. **Property 11: 发布间隔遵守**
    - 配置随机间隔
    - 执行多次发布
    - 验证间隔被遵守

12. **Property 12: 间隔配置动态更新**
    - 修改发布间隔
    - 验证新间隔立即应用
    - 验证后续发布使用新间隔

13. **Property 13: 发布进度准确性**
    - 生成随机任务集合
    - 执行发布
    - 验证进度显示准确

14. **Property 14: 暂停状态保存**
    - 暂停发布过程
    - 验证状态被保存
    - 验证恢复后继续正确

15. **Property 15: 笔记列表状态同步**
    - 发布任务
    - 验证列表状态更新
    - 验证状态与发布结果一致

16. **Property 16: 配置持久化**
    - 保存随机配置
    - 重启系统
    - 验证配置被恢复

17. **Property 17: 配置验证**
    - 生成有效和无效配置
    - 验证验证逻辑正确
    - 验证只有有效配置被保存
