# 快速开始指南

## 5 分钟快速上手

### 第 1 步：安装依赖

```bash
npm install
```

### 第 2 步：启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:3000 启动。

### 第 3 步：配置飞书 API

1. 打开应用，点击"配置设置"标签
2. 在"飞书配置"部分填入：
   - **App ID**: 你的飞书应用 ID
   - **App Secret**: 你的飞书应用密钥
   - **表格 ID**: 你的飞书多维表格 ID
3. 点击"保存配置"

### 第 4 步：添加小红书账号

1. 在"配置设置"中找到"小红书账号管理"
2. 输入小红书用户名和密码
3. 点击"添加账号"

### 第 5 步：准备飞书表格

在飞书多维表格中创建以下字段：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| 小红书标题 | 文本 | 发布的标题 |
| 小红书文案 | 文本 | 发布的正文内容 |
| 小红书封面 | 链接 | 封面图片的 URL |
| 定时时间 | 日期时间 | 发布的时间 |
| 状态 | 单选 | 待发布/已发布/失败 |
| 商品ID | 文本 | 关联的商品 ID（可选） |

### 第 6 步：开始发布

1. 点击"发布监控"标签
2. 点击"开始发布"按钮
3. 系统将自动：
   - 从飞书读取数据
   - 按定时时间发布内容
   - 显示实时进度

## 常见问题

### Q: 如何获取飞书 App ID 和 Secret？

A: 
1. 登录飞书开发者平台
2. 创建或选择应用
3. 在应用设置中找到 App ID 和 App Secret
4. 复制到配置中

### Q: 如何获取飞书表格 ID？

A:
1. 打开飞书多维表格
2. 在 URL 中找到表格 ID
3. 例如：`https://feishu.cn/base/...?table=tblXXXXXXXX`
4. `tblXXXXXXXX` 就是表格 ID

### Q: 发布失败怎么办？

A:
1. 查看"日志查询"中的错误信息
2. 检查小红书账号是否有效
3. 确保内容符合小红书规范
4. 系统会自动重试（最多 3 次）

### Q: 如何暂停发布？

A:
1. 在"发布监控"中点击"暂停发布"
2. 系统将停止发布新任务
3. 点击"继续发布"恢复

### Q: 如何查看发布历史？

A:
1. 点击"日志查询"标签
2. 使用搜索和过滤功能
3. 可以按任务 ID、时间、级别过滤

## 开发命令

```bash
# 开发模式
npm run dev

# 构建
npm run build

# 测试
npm run test

# 代码检查
npm run lint

# 代码格式化
npm run format

# 打包应用
npm run build && npx electron-builder
```

## 项目结构

```
.
├── src/
│   ├── main/              # Electron 主进程
│   ├── renderer/          # React UI
│   └── types/             # TypeScript 类型
├── package.json
├── tsconfig.json
├── jest.config.js
├── vite.config.ts
└── electron-builder.json
```

## 下一步

- 📖 阅读 [README.md](README.md) 了解完整功能
- 🔧 查看 [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) 了解技术细节
- 🐛 遇到问题？查看日志查询功能

## 支持

如有问题，请：
1. 查看应用中的日志
2. 检查配置是否正确
3. 提交 Issue 或联系支持

---

**祝你使用愉快！** 🚀
