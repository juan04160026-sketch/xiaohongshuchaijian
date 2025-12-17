# 小红书自动发布助手 - 快速参考

## 5 分钟快速开始

### 1. 安装扩展 (1 分钟)
```
1. 打开 chrome://extensions/
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择项目目录
```

### 2. 获取飞书凭证 (2 分钟)
```
1. 访问 https://open.feishu.cn/
2. 创建应用或选择现有应用
3. 复制 App ID 和 App Secret
4. 获取多维表格的 Table ID
```

### 3. 配置扩展 (1 分钟)
```
1. 点击扩展图标
2. 选择"配置"标签
3. 填写 App ID、App Secret、Table ID
4. 点击"保存配置"
```

### 4. 开始发布 (1 分钟)
```
1. 选择"发布"标签
2. 点击"开始发布"
3. 查看日志监控进度
```

## 常用命令

### 修改发布间隔
编辑 `background.js`，找到：
```javascript
await sleep(30000); // 改为你想要的毫秒数
```

### 修改日志条数
编辑 `background.js`，找到：
```javascript
if (logs.length > 100) { // 改为你想要的数量
  logs.shift();
}
```

### 修改小红书选择器
编辑 `content.js`，找到：
```javascript
const titleInput = document.querySelector('input[placeholder*="标题"]');
// 如果找不到，尝试其他选择器
```

## 飞书表格字段

| 字段名 | 类型 | 必需 | 说明 |
|-------|------|------|------|
| 小红书标题 | 文本 | ✓ | 发布的标题 |
| 小红书文案 | 文本 | ✓ | 发布的正文 |
| 小红书封面 | 文本 | ✓ | 图片 URL |
| 主题 | 文本 | ✗ | 标签内容 |
| 状态 | 文本 | ✓ | "pending" 或 "待发布" |
| 定时时间 | 文本 | ✗ | 预留字段 |

## 文件说明

| 文件 | 用途 |
|------|------|
| `manifest.json` | 扩展配置 |
| `popup.html` | 弹窗 UI |
| `popup.css` | 弹窗样式 |
| `popup.js` | 弹窗逻辑 |
| `background.js` | 后台服务 |
| `content.js` | 页面脚本 |

## 常见错误

| 错误 | 原因 | 解决 |
|------|------|------|
| 无法读取飞书数据 | 凭证错误 | 检查 App ID/Secret |
| 找不到发布按钮 | UI 变化 | 更新选择器 |
| 发布超时 | 页面加载慢 | 增加等待时间 |
| 扩展崩溃 | 内存泄漏 | 重新加载扩展 |

## 调试技巧

### 查看后台日志
```
1. 打开 chrome://extensions/
2. 找到扩展 → 点击"Service Worker"
3. 查看 Console 标签
```

### 查看弹窗日志
```
1. 右键点击扩展图标
2. 选择"检查弹窗"
3. 查看 Console 标签
```

### 查看页面日志
```
1. 在小红书创建页面按 F12
2. 查看 Console 标签
```

## 性能指标

| 指标 | 目标 | 实际 |
|------|------|------|
| 启动时间 | < 1s | - |
| 发布间隔 | 30s | - |
| 内存占用 | < 50MB | - |
| 日志条数 | 100 | - |

## 支持的浏览器

- ✓ Chrome 120+
- ✓ Edge 120+
- ? Firefox (需要适配)
- ? Safari (需要适配)

## 权限说明

| 权限 | 用途 |
|------|------|
| `storage` | 保存配置和日志 |
| `activeTab` | 访问当前标签页 |
| `scripting` | 执行页面脚本 |
| `tabs` | 创建/关闭标签页 |

## 飞书权限

需要添加以下权限：
- `bitable:app:readonly` - 读取多维表格
- `bitable:table:readonly` - 读取表格
- `bitable:record:readonly` - 读取记录

## 小红书账号要求

- 已登录小红书账号
- 账号有发布权限
- 账号未被限制

## 网络要求

- 能访问 `open.feishu.cn`
- 能访问 `www.xiaohongshu.com`
- 能访问 `edith.xiaohongshu.com`

## 数据安全

- ✓ 凭证保存在本地存储
- ✓ 不上传到服务器
- ✓ 不收集用户数据
- ✓ 开源代码可审计

## 更新检查

定期检查以下内容：
- [ ] Chrome 版本是否最新
- [ ] 小红书 UI 是否变化
- [ ] 飞书 API 是否更新
- [ ] 扩展是否有新版本

## 备份和恢复

### 备份配置
```javascript
// 导出配置
chrome.storage.sync.get(null, (items) => {
  console.log(JSON.stringify(items));
});
```

### 恢复配置
```javascript
// 导入配置
const config = { /* 之前导出的配置 */ };
chrome.storage.sync.set(config);
```

## 联系方式

- 📧 Email: [your-email]
- 🐛 Bug Report: [issue-tracker]
- 💬 Discussion: [discussion-forum]

## 许可证

MIT License - 自由使用和修改

## 更新日志

### v1.0.0 (2024-12-16)
- ✨ 初始版本发布
- ✨ 支持从飞书读取数据
- ✨ 支持自动发布到小红书
- ✨ 支持暂停/继续/停止
- ✨ 实时日志和监控

## 下一步

1. 阅读 [EXTENSION_SETUP.md](EXTENSION_SETUP.md) 了解详细安装步骤
2. 查看 [TROUBLESHOOTING.md](TROUBLESHOOTING.md) 解决常见问题
3. 参考 [API_REFERENCE.md](API_REFERENCE.md) 了解 API 细节
4. 运行 [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) 进行测试

## 常见问题速查

**Q: 如何修改发布间隔？**
A: 编辑 `background.js`，修改 `await sleep(30000);` 中的数字

**Q: 如何添加新字段？**
A: 编辑 `background.js` 中的 `fetchFromFeishu` 函数

**Q: 如何支持多账号？**
A: 需要修改 `background.js` 以支持账号切换

**Q: 如何支持定时发布？**
A: 需要添加定时任务逻辑到 `background.js`

**Q: 如何支持视频发布？**
A: 需要修改 `content.js` 以支持视频上传

## 贡献指南

欢迎提交 Pull Request 或 Issue！

## 致谢

感谢所有贡献者和用户的支持！
