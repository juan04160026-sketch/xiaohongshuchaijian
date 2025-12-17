# 如何获取飞书 Table ID

## 🎯 快速获取

### 方法 1: 从 URL 中复制 (推荐)

1. **打开飞书多维表格**
   - 访问 https://feishu.cn
   - 打开你的多维表格

2. **查看 URL**
   - 地址栏会显示类似:
   ```
   https://feishu.cn/base/xxxxx?table=tblXXXXXXXX
   ```

3. **复制 Table ID**
   - 找到 `?table=` 后面的部分
   - 复制 `tblXXXXXXXX` (包括 tbl 前缀)
   - 粘贴到配置中

### 方法 2: 从分享链接中获取

1. **分享多维表格**
   - 右键点击表格 → 分享
   - 复制分享链接

2. **提取 Table ID**
   - 分享链接格式:
   ```
   https://feishu.cn/base/xxxxx?table=tblXXXXXXXX
   ```
   - 复制 `tblXXXXXXXX` 部分

## 📍 Table ID 位置示例

### 完整 URL 示例
```
https://feishu.cn/base/bascXXXXXXXX?table=tblXXXXXXXX&view=viwXXXXXXXX
                                          ↑
                                    这就是 Table ID
```

### 正确的 Table ID 格式
- ✅ `tblXXXXXXXX` (以 tbl 开头，后跟字母和数字)
- ✅ `tbl1234567890abcdef`
- ❌ `bascXXXXXXXX` (这是 Base ID，不是 Table ID)
- ❌ `viwXXXXXXXX` (这是 View ID，不是 Table ID)

## 🔍 常见错误

### 错误 1: 复制了 Base ID

**错误示例**:
```
https://feishu.cn/base/bascXXXXXXXX?table=tblXXXXXXXX
                      ↑
                   这是 Base ID，不要复制这个
```

**正确做法**:
- 只复制 `?table=` 后面的部分
- 应该是 `tblXXXXXXXX`

### 错误 2: 复制了 View ID

**错误示例**:
```
https://feishu.cn/base/bascXXXXXXXX?table=tblXXXXXXXX&view=viwXXXXXXXX
                                                             ↑
                                                        这是 View ID
```

**正确做法**:
- 只复制 `?table=` 后面的部分
- 不要复制 `&view=` 后面的部分

### 错误 3: 包含了多余的字符

**错误示例**:
- ❌ `?table=tblXXXXXXXX` (包含了 ?table=)
- ❌ `tblXXXXXXXX&view=viwXXXXXXXX` (包含了 &view=)
- ❌ `tblXXXXXXXX?` (包含了 ?)

**正确做法**:
- ✅ 只复制 `tblXXXXXXXX` 部分
- 不要包含任何其他字符

## 📋 验证 Table ID

### 检查清单

- [ ] 以 `tbl` 开头
- [ ] 长度约 20-30 个字符
- [ ] 只包含字母和数字
- [ ] 没有空格或特殊字符
- [ ] 没有 `?` 或 `&` 符号

### 测试 Table ID

1. 在配置中填写 Table ID
2. 点击"测试连接"按钮
3. 如果显示 "✅ 连接成功"，说明 Table ID 正确
4. 如果显示 "❌ Table ID 不存在"，请重新检查

## 🎓 详细步骤

### 步骤 1: 打开飞书

```
1. 访问 https://feishu.cn
2. 登录你的飞书账号
3. 找到你的多维表格
```

### 步骤 2: 打开多维表格

```
1. 点击多维表格打开
2. 等待页面加载完成
3. 查看浏览器地址栏
```

### 步骤 3: 复制 Table ID

```
1. 在地址栏中找到 ?table=tblXXXXXXXX
2. 选中 tblXXXXXXXX 部分
3. 按 Ctrl+C (或 Cmd+C) 复制
```

### 步骤 4: 粘贴到配置

```
1. 打开小红书自动发布助手
2. 选择"配置"标签
3. 在"飞书表格 ID"字段粘贴
4. 点击"测试连接"验证
```

## 💡 提示

### 多个表格的情况

如果一个 Base 中有多个表格:

```
Base: bascXXXXXXXX
├─ 表格 1: tblXXXXXXXX (发布计划)
├─ 表格 2: tblYYYYYYYY (内容库)
└─ 表格 3: tblZZZZZZZZ (统计数据)
```

- 每个表格都有不同的 Table ID
- 你需要使用包含待发布内容的表格的 ID
- 通常是"发布计划"表格

### 表格 URL 变化

不同的视图可能有不同的 URL:

```
视图 1: https://feishu.cn/base/bascXXXXXXXX?table=tblXXXXXXXX&view=viwAAAA
视图 2: https://feishu.cn/base/bascXXXXXXXX?table=tblXXXXXXXX&view=viwBBBB
```

- Table ID 保持不变 (`tblXXXXXXXX`)
- 只有 View ID 不同
- 所以 Table ID 总是相同的

## 🔧 故障排除

### 问题: 找不到 Table ID

**解决**:
1. 确保已打开多维表格
2. 检查地址栏中是否有 `?table=`
3. 如果没有，尝试刷新页面
4. 尝试在不同的浏览器中打开

### 问题: Table ID 显示为 NOTEXIST

**解决**:
1. 检查 Table ID 是否正确复制
2. 确保没有多余的空格
3. 确保以 `tbl` 开头
4. 尝试重新复制一次

### 问题: 测试连接显示权限不足

**解决**:
1. 检查飞书应用是否已发布
2. 检查应用是否有表格读取权限
3. 在飞书开放平台添加权限后重新发布
4. 等待 5-10 分钟生效

## 📞 获取帮助

如果仍然无法获取 Table ID:

1. 查看 `DIAGNOSIS_GUIDE.md`
2. 查看 `TROUBLESHOOTING.md`
3. 检查浏览器控制台的错误信息
4. 尝试在不同的浏览器中操作

---

**提示**: Table ID 是一个以 `tbl` 开头的字符串，长度约 20-30 个字符。如果不确定，可以点击"测试连接"验证！
