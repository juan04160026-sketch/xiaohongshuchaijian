# 诊断和故障排除指南

## 🔍 快速诊断

### 步骤 1: 测试连接

1. 打开侧边栏
2. 选择"配置"标签
3. 填写飞书凭证
4. 点击"测试连接"按钮

### 步骤 2: 查看测试结果

- ✅ **连接成功**: 显示"✅ 连接成功！找到 X 个表格"
- ❌ **连接失败**: 显示具体的错误信息

## 🐛 常见错误和解决方案

### 错误 1: Token 获取失败

**错误信息**: `Token 获取失败 (code): message`

**原因**:
- App ID 或 App Secret 错误
- 飞书应用未发布
- 网络连接问题

**解决方案**:
1. 检查 App ID 是否正确
   - 访问 https://open.feishu.cn/
   - 选择应用 → 凭证与基础信息
   - 复制正确的 App ID

2. 检查 App Secret 是否正确
   - 同上位置获取 App Secret
   - 确保没有多余空格

3. 检查应用状态
   - 应用必须已发布
   - 检查应用权限是否完整

4. 检查网络连接
   - 确保能访问 open.feishu.cn
   - 尝试在浏览器中直接访问

### 错误 2: 表格读取失败

**错误信息**: `表格读取失败 (code): message`

**原因**:
- Table ID 错误
- 应用没有表格读取权限
- 表格已被删除

**解决方案**:
1. 检查 Table ID 是否正确
   - 打开飞书多维表格
   - 从 URL 中提取 Table ID
   - 格式: `https://feishu.cn/base/...?table=tblXXXXXXXX`

2. 检查应用权限
   - 访问 https://open.feishu.cn/
   - 应用 → 权限管理
   - 添加以下权限:
     - `bitable:app:readonly` - 读取多维表格
     - `bitable:table:readonly` - 读取表格
     - `bitable:record:readonly` - 读取记录

3. 重新发布应用
   - 添加权限后需要重新发布
   - 等待 5-10 分钟生效

### 错误 3: HTTP 400 错误

**错误信息**: `HTTP 400: 读取飞书表格失败`

**原因**:
- 请求格式错误
- 参数不正确
- API 版本不兼容

**解决方案**:
1. 确保 Table ID 格式正确
   - 应该是 `tblXXXXXXXX` 格式
   - 不要包含其他字符

2. 检查网络请求
   - 打开浏览器开发者工具 (F12)
   - 查看 Network 标签
   - 检查请求头和响应

3. 尝试重新加载扩展
   - 打开 chrome://extensions/
   - 找到扩展 → 点击刷新

### 错误 4: 没有找到待发布内容

**错误信息**: `没有找到待发布的内容（状态应为 "pending" 或 "待发布"）`

**原因**:
- 表格中没有记录
- 记录的状态不是 "pending" 或 "待发布"
- 字段名不匹配

**解决方案**:
1. 检查表格中是否有记录
   - 打开飞书多维表格
   - 确保有数据行

2. 检查状态字段
   - 确保有"状态"字段
   - 状态值必须是 "pending" 或 "待发布"
   - 检查是否有空格或大小写问题

3. 检查字段名
   - 确保字段名完全匹配:
     - 小红书标题
     - 小红书文案
     - 小红书封面
     - 主题
     - 状态

### 错误 5: 发布失败 - 找不到发布按钮

**错误信息**: `发布失败: 标题 - 找不到发布按钮`

**原因**:
- 小红书 UI 已更新
- 页面加载不完全
- 选择器不匹配

**解决方案**:
1. 检查小红书创建页面
   - 手动打开 https://www.xiaohongshu.com/creation
   - 确保能看到编辑器和发布按钮

2. 增加等待时间
   - 编辑 background.js
   - 找到 `await sleep(3000);`
   - 改为 `await sleep(5000);` 或更长

3. 更新选择器
   - 打开小红书创建页面
   - 按 F12 打开开发者工具
   - 检查发布按钮的选择器
   - 更新 content.js 中的选择器

## 📊 诊断信息收集

### 收集日志

1. 打开侧边栏
2. 选择"日志"标签
3. 截图或复制日志内容

### 查看浏览器控制台

1. 按 F12 打开开发者工具
2. 选择"Console"标签
3. 查看是否有错误信息

### 查看后台日志

1. 打开 chrome://extensions/
2. 找到"小红书自动发布助手"
3. 点击"Service Worker"
4. 在打开的开发者工具中查看 Console

## 🔧 高级诊断

### 检查 API 端点

在浏览器控制台中测试 API:

```javascript
// 测试 Token 获取
fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    app_id: 'YOUR_APP_ID',
    app_secret: 'YOUR_APP_SECRET'
  })
}).then(r => r.json()).then(console.log);
```

### 检查权限

1. 访问 https://open.feishu.cn/
2. 应用 → 权限管理
3. 确保有以下权限:
   - ✅ bitable:app:readonly
   - ✅ bitable:table:readonly
   - ✅ bitable:record:readonly

### 检查表格字段

1. 打开飞书多维表格
2. 确保有以下字段:
   - ✅ 小红书标题
   - ✅ 小红书文案
   - ✅ 小红书封面
   - ✅ 主题
   - ✅ 状态

## 📞 获取帮助

### 步骤 1: 收集信息

- [ ] 记下完整的错误信息
- [ ] 截图日志内容
- [ ] 记下 App ID (不要分享 Secret)
- [ ] 记下 Table ID

### 步骤 2: 查看文档

- 查看 `TROUBLESHOOTING.md`
- 查看 `API_REFERENCE.md`
- 查看 `LOG_MONITORING_GUIDE.md`

### 步骤 3: 尝试解决

- 按照上面的解决方案尝试
- 重新加载扩展
- 清除浏览器缓存

### 步骤 4: 联系支持

如果问题仍未解决:
1. 收集所有诊断信息
2. 提供详细的错误描述
3. 提供复现步骤

## 🎯 测试清单

- [ ] 能访问 https://open.feishu.cn/
- [ ] 能访问 https://www.xiaohongshu.com/
- [ ] 飞书应用已创建
- [ ] 飞书应用已发布
- [ ] 飞书应用有必要权限
- [ ] 多维表格已创建
- [ ] 多维表格有正确的字段
- [ ] 多维表格有待发布的记录
- [ ] 小红书账号已登录
- [ ] 扩展已加载到 Chrome

## 💡 最佳实践

1. **定期测试连接**
   - 每次修改配置后测试
   - 定期检查连接状态

2. **保存日志**
   - 发布前截图日志
   - 记录发布统计

3. **监控错误**
   - 及时查看错误日志
   - 快速处理问题

4. **更新信息**
   - 定期检查飞书 API 变化
   - 更新选择器和参数

---

**提示**: 使用"测试连接"功能可以快速诊断配置问题！
