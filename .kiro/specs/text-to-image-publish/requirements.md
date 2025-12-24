# Requirements Document

## Introduction

本功能扩展小红书自动发布系统，增加"文字配图"发布模式。该模式使用小红书创作者平台内置的文字配图功能，自动将飞书文档的标题生成为图片，然后完成发布流程。

## Glossary

- **文字配图**: 小红书创作者平台提供的功能，可以将文字自动生成为精美的图片卡片
- **发布模式**: 系统支持的发布方式，包括"本地图片"、"飞书图片"和"文字配图"三种
- **MultiAccountPublisher**: 多账号发布器，负责通过比特浏览器执行发布操作
- **ChromePublisher**: 谷歌浏览器发布器，负责通过本地Chrome执行发布操作

## Requirements

### Requirement 1

**User Story:** As a 内容运营人员, I want to 使用小红书的文字配图功能自动生成图片, so that 我不需要手动制作图片就能发布精美的笔记。

#### Acceptance Criteria

1. WHEN 用户选择"文字配图"发布模式 THEN 系统 SHALL 在发布页面点击"文字配图"按钮而不是上传图片
2. WHEN 文字配图弹窗打开后 THEN 系统 SHALL 在文字输入框中输入飞书文档的标题字段
3. WHEN 标题输入完成后 THEN 系统 SHALL 点击"生成图片"按钮生成图片
4. WHEN 图片生成完成后 THEN 系统 SHALL 点击"下一步"按钮进入编辑页面
5. WHEN 进入编辑页面后 THEN 系统 SHALL 继续执行现有的标题、正文输入和发布流程

### Requirement 2

**User Story:** As a 系统管理员, I want to 在配置中选择发布模式, so that 我可以灵活切换不同的图片来源方式。

#### Acceptance Criteria

1. WHEN 用户打开系统设置页面 THEN 系统 SHALL 显示三种发布模式选项：本地图片、飞书图片、文字配图
2. WHEN 用户选择"文字配图"模式 THEN 系统 SHALL 保存该配置并在发布时使用文字配图功能
3. WHEN 配置为"文字配图"模式时 THEN 系统 SHALL 在发布日志中显示"使用文字配图"的提示

### Requirement 3

**User Story:** As a 内容运营人员, I want to 在文字配图失败时得到明确的错误提示, so that 我可以了解问题并采取措施。

#### Acceptance Criteria

1. IF 文字配图按钮未找到 THEN 系统 SHALL 记录错误并返回失败状态
2. IF 文字输入框未找到 THEN 系统 SHALL 记录错误并返回失败状态
3. IF 生成图片按钮点击后超时未响应 THEN 系统 SHALL 记录超时错误并返回失败状态
4. IF 下一步按钮未找到 THEN 系统 SHALL 记录错误并返回失败状态
