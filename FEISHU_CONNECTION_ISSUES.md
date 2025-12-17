# 飞书连接不通 - 完整诊断和解决方案

## 问题症状
- 测试连接时显示错误
- 无法读取飞书表格数据
- 插件无法获取 Token

---

## 诊断流程

### 第一步：检查网络连接

**在浏览器控制台运行：**
```javascript
fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ app_id: 'test', app_secret: 'test' })
})
.then(r => console.log('✅ 网络正常，状态:', r.status))
.catch(e => console.error('❌ 网络错误:', e.message))
```

**预期结果：**
- ✅ 看到 `✅ 网络正常` → 网络没问题，继续下一步
- ❌ 看到 `❌ 网络错误` → 检查网络连接或防火墙

---

## 常见错误和解决方案

### 错误代码 1 - App ID 或 Secret 错误

**症状：**
```
❌ Token 获取失败 (1): 请求参数错误
```

**原因：**
- App ID 复制错误
- App Secret 复制错误
- 有多余的空格

**解决方案：**
1. 打开 https://open.feishu.cn
2. 进入应用详情
3. 找到 "凭证与基础信息"
4. 重新复制 App ID 和 App Secret
5. 确保没有多余空格
6. 重新测试

---

### 错误代码 4 - App ID 不存在

**症状：**
```
❌ Token 获取失败 (4): 应用不存在
```

**原因：**
- App ID 完全错误
- 应用已被删除

**解决方案：**
1. 确认 App ID 是否正确
2. 如果不确定，创建一个新应用
3. 使用新应用的 App ID

---

### 错误代码 5 - 应用已禁用

**症状：**
```
❌ Token 获取失败 (5): 应用已禁用
```

**原因：**
- 应用被禁用了

**解决方案：**
1. 打开 https://open.feishu.cn
2. 进入应用详情
3. 找到 "应用状态" 或 "启用/禁用" 选项
4. 启用应用
5. 重新测试

---

### 错误代码 6 - 应用未发布

**症状：**
```
❌ Token 获取失败 (6): 应用未发布
```

**原因：**
- 应用创建后没有发布
- **这是最常见的原因！**

**解决方案：**
1. 打开 https://open.feishu.cn
2. 进入应用详情
3. 找到 "发布" 按钮
4. 点击 "发布"
5. 等待发布完成
6. 重新测试

---

### 错误代码 13 - 权限不足

**症状：**
```
❌ Token 获取失败 (13): 权限不足
```

**原因：**
- 应用没有必要的权限

**解决方案：**
1. 打开 https://open.feishu.cn
2. 进入应用详情
3. 左侧菜单 → "权限管理"
4. 点击 "添加权限"
5. 搜索并添加以下权限：
   - `bitable:app:readonly` - 读取多维表格
   - `bitable:table:readonly` - 读取表格
6. 点击 "保存"
7. 重新发布应用
8. 重新测试

---

### 错误代码 91402 - Base ID 错误

**症状：**
```
❌ 表格读取失败 (91402): NOTEXIST
```

**原因：**
- Base ID 格式错误
- Base ID 不存在
- Base ID 被删除

**解决方案：**
1. 打开你的飞书多维表格
2. 查看浏览器地址栏
3. URL 格式：`https://ai.feishu.cn/base/[BASE_ID]?...`
4. 复制 `[BASE_ID]` 部分
5. 确保是 20+ 个字母和数字
6. 在插件中重新填写 Base ID
7. 重新测试

**例子：**
- ✅ 正确: `GGh2bW3Q2aHpi1shiVqcAlhmnMd` (28 个字符)
- ❌ 错误: `GGh2bW3Q2aHpi1shiVqcAlhmnMd?from=from_copylink` (包含 URL 参数)

---

### 错误代码 99991001 - 应用权限不足

**症状：**
```
❌ 表格读取失败 (99991001): 权限不足
```

**原因：**
- 应用没有 `bitable:app:readonly` 权限

**解决方案：**
1. 打开 https://open.feishu.cn
2. 进入应用详情
3. 左侧菜单 → "权限管理"
4. 确保有以下权限：
   - ✅ `bitable:app:readonly`
   - ✅ `bitable:table:readonly`
5. 如果没有，点击 "添加权限" 添加
6. 点击 "保存"
7. **重新发布应用**（重要！）
8. 重新测试

---

### 错误代码 99991002 - 应用未发布

**症状：**
```
❌ 表格读取失败 (99991002): 应用未发布
```

**原因：**
- 添加权限后没有重新发布应用

**解决方案：**
1. 打开 https://open.feishu.cn
2. 进入应用详情
3. 点击 "发布" 按钮
4. 等待发布完成
5. 重新测试

---

## 完整诊断脚本

如果不确定问题在哪里，运行这个脚本进行完整诊断：

```javascript
async function fullDiagnosis() {
  const APP_ID = prompt('请输入 App ID:');
  const APP_SECRET = prompt('请输入 App Secret:');
  const BASE_ID = 'GGh2bW3Q2aHpi1shiVqcAlhmnMd';

  console.log('%c🔍 开始完整诊断...', 'font-size: 14px; font-weight: bold; color: #1890ff;');

  // 诊断 1：网络连接
  console.log('%c📝 诊断 1: 网络连接', 'font-weight: bold;');
  try {
    const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: 'test', app_secret: 'test' })
    });
    console.log('✅ 网络连接正常');
  } catch (e) {
    console.error('❌ 网络连接失败:', e.message);
    return;
  }

  // 诊断 2：App ID 和 Secret
  console.log('%c📝 诊断 2: App ID 和 Secret', 'font-weight: bold;');
  const tokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
  });
  const tokenData = await tokenRes.json();
  
  if (tokenData.code !== 0) {
    console.error('❌ Token 获取失败:', tokenData.msg);
    console.error('错误代码:', tokenData.code);
    return;
  }
  console.log('✅ App ID 和 Secret 正确');
  const token = tokenData.tenant_access_token;

  // 诊断 3：Base ID
  console.log('%c📝 诊断 3: Base ID', 'font-weight: bold;');
  const tableRes = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_ID}/tables`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const tableData = await tableRes.json();
  
  if (tableData.code !== 0) {
    console.error('❌ Base ID 错误:', tableData.msg);
    console.error('错误代码:', tableData.code);
    return;
  }
  console.log('✅ Base ID 正确');

  // 诊断 4：权限
  console.log('%c📝 诊断 4: 权限', 'font-weight: bold;');
  const tables = tableData.data?.items || [];
  if (tables.length === 0) {
    console.warn('⚠️ 表格中没有数据表');
  } else {
    console.log('✅ 权限正确，找到', tables.length, '个表格');
  }

  console.log('%c🎉 诊断完成！所有配置正确', 'font-size: 14px; font-weight: bold; color: #52c41a;');
}

fullDiagnosis();
```

---

## 如果仍然无法解决

请收集以下信息并反馈：

1. **完整的错误信息** - 包括错误代码和错误描述
2. **浏览器控制台的所有日志** - F12 → Console
3. **你的 App ID** - 不需要完整的，只需前 5 个字符
4. **应用状态** - 是否已发布
5. **权限列表** - 应用有哪些权限

