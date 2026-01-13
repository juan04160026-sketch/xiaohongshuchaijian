# AI 内容生成功能 - 实现文档

## 实现概述

已完成 AI 内容生成功能的完整实现，包括：

1. ✅ 提示词模板配置 UI
2. ✅ AI 内容生成服务
3. ✅ 飞书写入功能
4. ✅ 标签提取逻辑改动
5. ✅ IPC 通信接口

---

## 文件变更清单

### 新增文件

1. **src/main/services/AIContentGenerator.ts**
   - AI 内容生成核心服务
   - 支持单条记录生成和批量生成
   - 自动上传图片到飞书

2. **src/main/utils/tagExtractor.ts**
   - 标签提取工具函数
   - 从文案中提取 `#标签` 格式

3. **test-ai-generation.js**
   - 功能测试脚本

### 修改文件

1. **src/types/index.ts**
   - 添加提示词模板字段到 `AIConfig`

2. **src/main/services/GeminiService.ts**
   - 重构方法支持自定义提示词
   - 添加 `generateTitle`、`generateContent`、`generateImage` 方法
   - 添加 `generateAll` 统一生成方法

3. **src/main/services/FeishuReader.ts**
   - 添加 `updateRecord` 方法（写入记录）
   - 添加 `uploadImage` 方法（上传图片到飞书）

4. **src/renderer/components/ConfigSettings.tsx**
   - 添加提示词模板编辑 UI
   - 支持标题/文案/图片三个提示词模板
   - 显示提示词编写技巧

5. **src/renderer/components/ConfigSettings.css**
   - 添加提示词模板区域样式

6. **src/main/services/MultiAccountPublisher.ts**
   - 修改标签输入逻辑，从文案中提取标签
   - 添加 `inputTagsArray` 方法

7. **src/main/services/ChromePublisher.ts**
   - 修改标签输入逻辑，从文案中提取标签
   - 添加 `inputTagsArray` 方法

8. **src/main/index.ts**
   - 导入 `AIContentGenerator`
   - 初始化 AI 内容生成器
   - 添加 IPC 处理器：`ai:generateForRecord`、`ai:generateBatch`

9. **src/main/preload.ts**
   - 暴露 AI 生成接口到渲染进程

---

## 功能说明

### 1. 提示词模板配置

在"系统设置 > AI 配置"中，用户可以自定义三个提示词模板：

- **标题生成提示词**：用于生成小红书标题
- **文案生成提示词**：用于生成小红书文案（含标签）
- **图片生成提示词**：用于生成封面图片

**占位符**：使用 `{{主题}}` 会被替换为飞书表格中的"主题"字段内容

**示例提示词**：

```
标题：请根据主题"{{主题}}"生成一个吸引人的小红书标题，要求简洁有力，包含关键词，长度15-25字。

文案：请根据主题"{{主题}}"生成小红书文案。要求：
1. 风格活泼、有趣、接地气
2. 适当使用 emoji 表情
3. 末尾包含 3-5 个相关话题标签（格式：#标签名）
4. 文案长度控制在 200-500 字
5. 分段清晰，易于阅读

图片：生成一张关于"{{主题}}"的小红书封面图，风格清新明亮，适合社交媒体分享，高清精美。
```

### 2. AI 内容生成流程

#### 单条记录生成

```typescript
// 调用方式
await window.api.ai.generateForRecord(recordId, topic, dataTableId);
```

**流程**：
1. 读取飞书记录的"主题"字段
2. 使用提示词模板调用 Gemini API 生成标题、文案、图片
3. 上传图片到飞书
4. 写回飞书字段：`小红书标题`、`小红书文案`、`小红书封面`
5. 更新状态为"已生成"

#### 批量生成

```typescript
// 调用方式
await window.api.ai.generateBatch(dataTableId);
```

**流程**：
1. 读取飞书中所有状态为"待发布"且有"主题"的记录
2. 逐条生成内容（间隔 2 秒避免 API 限流）
3. 返回生成结果统计

### 3. 标签处理改动

**之前**：从飞书单独的 `标签` 字段读取

**现在**：从 `小红书文案` 字段中提取 `#xxx` 格式的标签

**提取规则**：
- 匹配所有 `#` 开头的标签
- 标签结束于空格、换行、标点符号或字符串结尾
- 支持中英文、数字、下划线

**发布时标签输入方式（保持不变）**：
1. 在小红书发布页面的标签输入框中输入标签文字
2. 等待下拉框出现（约 1-2 秒）
3. 自动选择匹配的标签选项
4. 重复以上步骤处理所有标签

---

## 使用指南

### 配置步骤

1. **配置 Gemini API**
   - 在"系统设置 > AI 配置"中填写 Gemini API Key
   - 选择文案生成模型和图片生成模型
   - 点击"测试文案"和"测试图片"验证连接

2. **配置提示词模板**
   - 在"提示词模板配置"区域编辑三个提示词
   - 使用 `{{主题}}` 作为占位符
   - 文案提示词中要求在末尾包含 #标签
   - 点击"保存配置"

3. **准备飞书数据**
   - 在飞书表格中添加记录
   - 填写"主题"字段（必填）
   - 状态设为"待发布"（批量生成时会读取）

### 生成内容

#### 方式 1：单条生成（开发中）
- 在笔记列表中选择记录
- 点击"生成内容"按钮
- 等待生成完成

#### 方式 2：批量生成（开发中）
- 在系统设置或发布页面
- 点击"批量生成"按钮
- 系统会自动处理所有待生成的记录

### 发布内容

生成完成后：
1. 状态会自动更新为"已生成"
2. 可以在发布页面查看生成的内容
3. 标签会自动从文案中提取
4. 点击"开始发布"即可发布到小红书

---

## API 接口

### 前端调用

```typescript
// 获取模型列表
const models = await window.api.ai.getModels();

// 测试连接
const textResult = await window.api.ai.testText(apiKey, modelId);
const imageResult = await window.api.ai.testImage(apiKey, modelId);

// 单条生成
const result = await window.api.ai.generateForRecord(recordId, topic, dataTableId);

// 批量生成
const results = await window.api.ai.generateBatch(dataTableId);
```

### 返回格式

```typescript
interface GenerationResult {
  success: boolean;
  recordId: string;
  title?: string;
  content?: string;
  imagePath?: string;
  error?: string;
}
```

---

## 注意事项

1. **API 限流**
   - Gemini API 有调用频率限制
   - 批量生成时会自动间隔 2 秒
   - 如遇限流错误，请稍后重试

2. **提示词编写**
   - 提示词越具体，生成效果越好
   - 文案提示词中必须要求包含 #标签
   - 可以指定风格、长度、格式等要求

3. **图片上传**
   - 图片会先保存到本地，再上传到飞书
   - 上传失败不影响标题和文案的写入
   - 本地图片保存在 `~/.xhs-publisher/ai-images/`

4. **飞书字段**
   - 确保飞书表格有以下字段：
     - `主题`（文本）
     - `小红书标题`（文本）
     - `小红书文案`（多行文本）
     - `小红书封面`（附件）
     - `状态`（单选）

5. **标签格式**
   - 标签必须以 `#` 开头
   - 标签名支持中英文、数字、下划线
   - 标签之间用空格分隔
   - 示例：`#春季穿搭 #时尚 #OOTD`

---

## 测试

运行测试脚本：

```bash
# 编译项目
npm run build

# 运行测试（需要先修改配置）
node test-ai-generation.js
```

---

## 后续优化

1. **UI 集成**
   - 在笔记列表添加"生成内容"按钮
   - 在发布页面添加"批量生成"按钮
   - 显示生成进度和结果

2. **错误处理**
   - 更详细的错误提示
   - 失败重试机制
   - 生成日志记录

3. **功能扩展**
   - 支持编辑生成的内容
   - 支持保存提示词模板预设
   - 支持选择性生成（只生成标题/文案/图片）

4. **性能优化**
   - 并发生成（控制并发数）
   - 缓存机制
   - 断点续传

---

## 问题排查

### 生成失败

1. 检查 Gemini API Key 是否正确
2. 检查网络连接（可能需要代理）
3. 检查提示词模板是否包含 `{{主题}}`
4. 查看控制台日志获取详细错误信息

### 标签未提取

1. 检查文案中是否包含 `#标签` 格式
2. 确保标签以 `#` 开头
3. 标签名不要包含空格和特殊符号

### 图片上传失败

1. 检查飞书 API 权限
2. 检查图片文件是否生成成功
3. 检查网络连接

---

## 总结

AI 内容生成功能已完整实现，包括：

✅ 提示词模板配置 UI  
✅ AI 内容生成服务（标题、文案、图片）  
✅ 飞书写入功能（更新记录、上传图片）  
✅ 标签提取逻辑（从文案中提取）  
✅ IPC 通信接口  
✅ 完整的错误处理  

下一步需要在 UI 中集成生成按钮，让用户可以方便地触发内容生成。
