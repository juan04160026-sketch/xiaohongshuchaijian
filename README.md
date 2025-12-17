# 小红书自动发布插件

一个强大的后台自动化工具，用于从飞书多维表格中读取内容数据，并自动发布到小红书平台。

## 功能特性

- ✅ **从飞书读取数据** - 直接从飞书多维表格读取发布内容
- ✅ **多账号管理** - 支持管理多个小红书账号
- ✅ **精确定时发布** - 精确到分钟的定时发布功能
- ✅ **后台批量处理** - 在后台批量处理多个发布任务
- ✅ **发布间隔控制** - 可配置的发布间隔，避免频繁发布
- ✅ **实时监控** - 实时显示发布进度和状态日志
- ✅ **暂停/继续** - 灵活控制发布过程
- ✅ **日志查询** - 完整的日志记录和查询功能
- ✅ **错误处理** - 自动重试和错误恢复机制

## 系统要求

- Node.js 16+
- npm 或 yarn
- Windows 10+ / macOS 10.13+ / Linux

## 安装

### 从源代码构建

```bash
# 克隆仓库
git clone <repository-url>
cd xiaohongshu-auto-publish

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建应用
npm run build

# 打包应用
npm run build && npm run package
```

## 使用指南

### 1. 配置飞书 API

1. 打开应用，进入"配置设置"标签
2. 填入飞书 App ID、App Secret 和表格 ID
3. 点击"保存配置"

### 2. 添加小红书账号

1. 在"配置设置"中的"小红书账号管理"部分
2. 输入用户名和密码
3. 点击"添加账号"

### 3. 准备飞书表格

确保飞书多维表格包含以下字段：
- 小红书标题
- 小红书文案
- 小红书封面（图片链接）
- 定时时间
- 状态（待发布、已发布等）
- 商品ID（可选）

### 4. 开始发布

1. 进入"发布监控"标签
2. 点击"开始发布"按钮
3. 系统将自动从飞书读取数据并按时间发布

## 项目结构

```
src/
├── main/                    # Electron 主进程
│   ├── services/           # 核心服务
│   │   ├── ConfigManager.ts
│   │   ├── FeishuReader.ts
│   │   ├── TaskScheduler.ts
│   │   ├── PublishingEngine.ts
│   │   ├── LoggerManager.ts
│   │   ├── PublishScheduler.ts
│   │   ├── ErrorHandler.ts
│   │   ├── TrayManager.ts
│   │   └── PerformanceOptimizer.ts
│   ├── index.ts            # 主进程入口
│   └── preload.ts          # Preload 脚本
├── renderer/               # React 渲染进程
│   ├── components/         # UI 组件
│   │   ├── NotesList.tsx
│   │   ├── PublishMonitor.tsx
│   │   ├── ConfigSettings.tsx
│   │   └── LogsViewer.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.html
└── types/                  # TypeScript 类型定义
    └── index.ts
```

## 配置说明

### 飞书配置

- **App ID**: 飞书应用的 App ID
- **App Secret**: 飞书应用的 App Secret
- **表格 ID**: 飞书多维表格的 ID

### 发布设置

- **发布间隔**: 两次发布之间的等待时间（秒）
- **过期任务处理**: 
  - 立即发布：发布时间已过期的任务立即发布
  - 标记为已过期：发布时间已过期的任务标记为已过期，不发布

## 开发

### 运行开发服务器

```bash
npm run dev
```

### 运行测试

```bash
npm test
npm run test:watch
npm run test:coverage
```

### 代码检查

```bash
npm run lint
npm run format
```

## 故障排除

### 连接飞书失败

- 检查网络连接
- 验证 App ID 和 App Secret 是否正确
- 确保表格 ID 存在且可访问

### 发布失败

- 检查小红书账号凭证是否有效
- 查看日志查询中的错误信息
- 确保内容符合小红书发布规范

### 内存占用过高

- 应用会自动清理旧日志
- 可以手动清理日志文件
- 重启应用释放内存

## 许可证

MIT

## 支持

如有问题或建议，请提交 Issue 或 Pull Request。
