# 标题字段自动化测试

## 快速开始

### 1. 安装依赖

```bash
npm install
npx playwright install chromium
```

### 2. 运行测试

```bash
node test-playwright.js
```

### 3. 观察结果

- 浏览器会自动打开小红书发布页面
- 自动填写标题字段
- 保存截图到 `test-result.png`
- 30 秒后自动关闭

---

## 测试流程

```
1. 启动浏览器
   ↓
2. 打开小红书发布页面
   ↓
3. 等待页面加载
   ↓
4. 定位标题输入框
   ↓
5. 清空现有内容
   ↓
6. 输入测试标题
   ↓
7. 验证输入结果
   ↓
8. 保存截图
   ↓
9. 关闭浏览器
```

---

## 预期结果

✅ **成功**
- 标题输入框被正确定位
- 测试标题被成功输入
- 截图显示标题已填写

❌ **失败**
- 找不到标题输入框
- 输入内容与预期不符
- 页面加载超时

---

## 调试技巧

### 1. 查看所有输入框

测试脚本会列出页面上的所有输入框：

```
📊 页面上的所有输入框:
  1. type="text" placeholder="请输入标题" value=""
  2. type="text" placeholder="搜索" value=""
  ...
```

### 2. 查看截图

运行后会生成 `test-result.png`，显示标题是否被正确填写。

### 3. 增加调试信息

在 `test-playwright.js` 中添加更多 `console.log()` 语句。

### 4. 减速执行

修改 `delay` 参数来减速输入：

```javascript
await titleInput.type(testTitle, { delay: 200 }); // 增加延迟
```

---

## 常见问题

### Q: 浏览器无法启动

**原因：** Playwright 浏览器未安装

**解决：**
```bash
npx playwright install chromium
```

### Q: 页面加载超时

**原因：** 网络连接慢或页面加载慢

**解决：**
- 增加超时时间
- 检查网络连接
- 手动打开页面测试

### Q: 找不到标题输入框

**原因：** 小红书页面结构改变

**解决：**
1. 查看浏览器窗口中的页面
2. 手动检查标题输入框的位置
3. 更新 CSS 选择器

### Q: 输入内容不显示

**原因：** 页面可能需要额外的交互

**解决：**
- 增加等待时间
- 尝试不同的输入方法
- 检查页面是否有 JavaScript 框架

---

## 下一步

### 1. 验证标题输入成功

运行测试，确保标题能正确输入。

### 2. 添加文案输入

找到文案编辑器的 CSS 选择器，添加文案输入功能。

### 3. 添加发布按钮

找到发布按钮，添加点击功能。

### 4. 集成到 PlaywrightPublisher

将测试中的代码集成到 `PlaywrightPublisher.ts`。

---

## 相关文件

- `test-playwright.js` - 测试脚本
- `src/main/services/PlaywrightPublisher.ts` - Playwright 自动化核心
- `PLAYWRIGHT_SETUP.md` - 完整使用指南

