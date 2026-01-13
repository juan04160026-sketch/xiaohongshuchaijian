# AI 内容生成功能修复说明

## 修复时间
2026-01-13

## 问题总结

根据之前的测试日志，发现以下问题：

### 1. 图片生成失败 ❌
- **现象**: 所有图片生成尝试都显示 `⚠️ 图片生成失败: 未能生成图片`
- **原因**: API 调用成功但响应中没有找到图片数据
- **可能原因**: 
  - API 响应格式不符合预期
  - `inlineData` 字段不存在或位置不对
  - 模型不支持图片生成或需要不同的配置

### 2. 标题生成格式错误 ⚠️
- **现象**: 生成的标题是冗长的回复而不是简洁的标题
- **示例**: "Gemini 1.5 Flash. While the "2.5" might be a slight misnomer..."
- **原因**: AI 模型没有理解要求，输出了解释性文字而不是标题

### 3. 模型名称错误 ❌
- **现象**: 代码中使用了不存在的模型 `gemini-2.5-flash`
- **正确**: 应该使用 `gemini-3-flash-preview`

## 修复内容

### 1. 修复模型名称 ✅

**文件**: 
- `src/main/services/GeminiService.ts`
- `src/main/services/ConfigManager.ts`
- `src/main/index.ts`

**修改**:
```typescript
// 旧代码
modelId: string = 'gemini-2.5-flash'

// 新代码
modelId: string = 'gemini-3-flash-preview'
```

### 2. 改进标题生成 ✅

**文件**: `src/main/services/GeminiService.ts`

**改进点**:
1. 添加 `generationConfig` 限制输出长度
2. 添加后处理清理多余格式
3. 限制 `maxOutputTokens: 100` 避免冗长回复

```typescript
const result = await this.request(`/models/${modelId}:generateContent`, {
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 100,  // 限制输出长度
  }
});

// 清理输出
if (text) {
  text = text.trim()
    .replace(/^["'「『]|["'」』]$/g, '')  // 移除首尾引号
    .replace(/\n+/g, ' ')  // 替换换行为空格
    .trim();
}
```

### 3. 增强图片生成调试 ✅

**文件**: `src/main/services/GeminiService.ts`

**改进点**:
1. 添加详细的日志输出
2. 打印 API 响应结构
3. 检查所有可能的图片字段
4. 提供更详细的错误信息

```typescript
console.log(`🎨 调用图片生成 API: ${modelId}`);
console.log(`📝 提示词: ${imagePrompt.substring(0, 100)}...`);
console.log('📦 API 响应结构:', JSON.stringify(result, null, 2).substring(0, 500));
console.log(`📋 响应包含 ${parts.length} 个部分`);

for (let i = 0; i < parts.length; i++) {
  const part = parts[i];
  console.log(`  部分 ${i}: ${Object.keys(part).join(', ')}`);
  
  if (part.inlineData) {
    console.log(`✅ 找到图片数据: ${mimeType}, 大小: ${base64Data.length} 字符`);
  }
  
  if (part.image) {
    console.log('⚠️ 发现 image 字段（非 inlineData）:', Object.keys(part.image));
  }
}
```

### 4. 优化默认提示词 ✅

**文件**: `src/main/services/AIContentGenerator.ts`

**改进点**:
1. 更明确的指令，强调"只输出标题"
2. 图片提示词改用英文（Gemini 对英文理解更好）
3. 添加更具体的格式要求

**标题提示词**:
```
你是一个小红书标题生成专家。请根据主题生成一个吸引人的小红书标题。

主题：{{主题}}

要求：
1. 只输出标题文字，不要有任何其他说明或解释
2. 长度控制在 15-25 字
3. 简洁有力，包含关键词
4. 适合小红书风格，吸引眼球
5. 可以使用 emoji，但不要过多

直接输出标题：
```

**图片提示词**（改用英文）:
```
Create a high-quality, eye-catching cover image for Xiaohongshu (Little Red Book) social media post.

Topic: {{主题}}

Requirements:
- Style: Fresh, bright, clean, modern aesthetic
- Quality: High resolution, professional look
- Composition: Suitable for social media sharing
- Mood: Positive, attractive, engaging
- Format: Square aspect ratio (1:1)

Generate the image directly without any text description.
```

## 调试工具

创建了新的调试脚本 `test-gemini-image-debug.js`，用于：
1. 测试图片生成 API 的实际响应格式
2. 打印完整的响应结构
3. 自动保存生成的图片
4. 帮助诊断 API 响应问题

**使用方法**:
```bash
GEMINI_API_KEY=your_key node test-gemini-image-debug.js
```

## 下一步测试建议

### 1. 测试标题生成
```bash
npm start
# 在 UI 中点击"批量生成内容"
# 查看控制台输出的标题是否简洁
```

### 2. 调试图片生成
```bash
# 先运行调试脚本查看 API 响应
GEMINI_API_KEY=your_key node test-gemini-image-debug.js

# 如果调试脚本成功生成图片，说明 API 可用
# 如果失败，可能是：
# - 模型不支持图片生成
# - API 配置格式不对
# - 需要使用不同的模型
```

### 3. 检查提示词模板 UI
```bash
npm start
# 打开"系统设置"
# 滚动到"AI 配置"部分
# 应该能看到"📝 提示词模板配置"区域
# 包含三个文本框：标题、文案、图片提示词
```

## 可能的图片生成问题

如果图片生成仍然失败，可能的原因：

### 1. 模型不支持
`gemini-3-pro-image-preview` 可能：
- 还未正式发布
- 需要特殊权限
- API 格式已变更

**解决方案**: 尝试其他模型
```typescript
// 在 ConfigSettings.tsx 中选择
- imagen-3.0-generate-001
- imagen-3.0-fast-generate-001
```

### 2. API 响应格式变更
Google 可能更改了响应格式，图片数据不在 `inlineData` 字段。

**解决方案**: 运行调试脚本查看实际响应
```bash
node test-gemini-image-debug.js
```

### 3. 需要不同的配置
可能需要调整 `generationConfig`。

**解决方案**: 参考用户提供的 curl 示例
```bash
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "..."}]}],
    "tools": [{"google_search": {}}],
    "generationConfig": {
      "responseModalities": ["TEXT", "IMAGE"],
      "imageConfig": {"aspectRatio": "3:4", "imageSize": "1K"}
    }
  }'
```

注意用户示例中有 `"tools": [{"google_search": {}}]`，我们的代码中没有。

## 总结

已修复：
- ✅ 模型名称错误（gemini-2.5-flash → gemini-3-flash-preview）
- ✅ 标题生成格式（添加输出限制和后处理）
- ✅ 提示词优化（更明确的指令）
- ✅ 图片生成调试（详细日志）

待验证：
- ⏳ 图片生成是否成功（需要运行调试脚本确认 API 响应格式）
- ⏳ 标题生成是否简洁（需要实际测试）
- ⏳ 提示词模板 UI 是否显示（代码已存在，可能需要滚动查看）

建议用户：
1. 先运行 `test-gemini-image-debug.js` 查看图片 API 的实际响应
2. 重新启动应用测试标题生成
3. 如果图片生成仍失败，尝试其他模型或调整配置
