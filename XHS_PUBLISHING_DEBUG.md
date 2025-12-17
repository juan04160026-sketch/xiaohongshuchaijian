# 小红书发布调试指南

## 问题：页面打开后立即消失

### 原因分析

1. **页面加载不完全** - 页面还没加载完就关闭了
2. **脚本执行失败** - 找不到输入框或发布按钮
3. **权限问题** - 扩展没有权限访问该页面

### 解决方案

#### 步骤 1：检查浏览器控制台

1. 打开浏览器开发者工具 (F12)
2. 切换到 "Console" 标签
3. 点击插件的 "开始发布"
4. 查看控制台中的日志信息

**预期日志：**
```
📝 开始填写内容: 标题
✅ 标题已填写: 标题
✅ 文案已填写
✅ 找到发布按钮: 发布
✅ 发布按钮已点击
```

#### 步骤 2：检查页面元素

如果看到错误信息，按照以下步骤检查：

1. **找不到标题输入框**
   - 打开小红书发布页面
   - 按 F12 打开开发者工具
   - 按 Ctrl+Shift+C 打开元素选择器
   - 点击标题输入框
   - 查看 HTML 结构中的 placeholder 属性

2. **找不到文案编辑器**
   - 同样方式选择文案编辑区域
   - 查看是否有 `contenteditable="true"` 属性

3. **找不到发布按钮**
   - 选择发布按钮
   - 查看按钮的文本内容和属性

#### 步骤 3：手动测试

1. 打开小红书发布页面：
   https://creator.xiaohongshu.com/publish/publish?source=official&from=menu&target=image

2. 在浏览器控制台运行以下代码测试：

```javascript
// 测试 1: 查找标题输入框
const titleInput = document.querySelector('input[placeholder*="标题"]') || 
                   document.querySelector('input[placeholder*="title"]') ||
                   document.querySelector('input[type="text"]');
console.log('标题输入框:', titleInput);

// 测试 2: 查找文案编辑器
const contentEditor = document.querySelector('[contenteditable="true"]');
console.log('文案编辑器:', contentEditor);

// 测试 3: 查找发布按钮
const buttons = Array.from(document.querySelectorAll('button'));
const publishBtn = buttons.find(btn => btn.textContent.includes('发布'));
console.log('发布按钮:', publishBtn);

// 测试 4: 列出所有按钮
console.log('所有按钮:', buttons.map(b => b.textContent.trim()));
```

---

## 常见问题

### Q: 页面打开后立即消失

**原因：** 脚本执行失败或页面加载不完全

**解决方案：**
1. 检查浏览器控制台的错误信息
2. 增加等待时间（在 background.js 中修改 `sleep()` 的值）
3. 检查页面元素是否存在

### Q: 找不到标题输入框

**原因：** 小红书页面结构可能改变

**解决方案：**
1. 打开小红书发布页面
2. 按 F12 查看标题输入框的 HTML 结构
3. 告诉我 placeholder 属性的值
4. 我会更新代码来适配

### Q: 找不到发布按钮

**原因：** 发布按钮的文本或属性可能改变

**解决方案：**
1. 打开小红书发布页面
2. 按 F12 查看发布按钮的 HTML 结构
3. 告诉我按钮的文本内容
4. 我会更新代码来适配

### Q: 发布成功但没有看到内容

**原因：** 可能需要手动确认或审核

**解决方案：**
1. 检查小红书草稿箱
2. 检查是否需要手动点击确认
3. 查看是否有审核提示

---

## 调试技巧

### 1. 增加日志输出

在 background.js 中的 `publishContent` 函数中添加更多 `console.log()` 语句。

### 2. 增加等待时间

如果页面加载不完全，增加 `sleep()` 的时间：

```javascript
// 从 5000 增加到 8000
await sleep(8000);
```

### 3. 检查权限

确保 manifest.json 中有以下权限：

```json
"host_permissions": [
  "https://creator.xiaohongshu.com/*"
]
```

### 4. 使用浏览器开发者工具

- **Console**: 查看日志和错误
- **Elements**: 查看页面结构
- **Network**: 查看网络请求
- **Application**: 查看存储数据

---

## 获取帮助

如果遇到问题，请提供以下信息：

1. **浏览器控制台的完整错误信息**
2. **小红书发布页面的 HTML 结构**（特别是输入框和按钮）
3. **插件日志中的错误信息**
4. **你的浏览器版本**

---

## 相关文件

- `background.js` - 后台服务（包含 publishContent 函数）
- `manifest.json` - 扩展配置（权限设置）
- `popup.js` - UI 逻辑

