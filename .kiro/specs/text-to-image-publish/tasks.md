# Implementation Plan

## 文字配图发布功能

- [x] 1. 扩展类型定义










  - [ ] 1.1 修改 `src/types/index.ts`，将 `ImageSourceType` 从 `'local' | 'feishu'` 扩展为 `'local' | 'feishu' | 'text2image'`
  - _Requirements: 2.1_

- [x] 2. 更新 MultiAccountPublisher























  - [ ] 2.1 在 `src/main/services/MultiAccountPublisher.ts` 中添加文字配图选择器常量
  - [ ] 2.2 添加 `useText2Image` 私有方法，实现文字配图流程
    - 点击文字配图按钮
    - 等待弹窗打开
    - 输入标题文字
    - 点击生成图片按钮
    - 等待图片生成完成
    - 点击下一步按钮
  - [ ] 2.3 修改 `publishOne` 方法，增加 `text2image` 分支处理
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4_

- [ ] 3. 更新 ChromePublisher
  - [ ] 3.1 在 `src/main/services/ChromePublisher.ts` 中添加相同的文字配图选择器常量
  - [ ] 3.2 添加 `useText2Image` 私有方法，实现文字配图流程
  - [ ] 3.3 修改发布方法，增加 `text2image` 分支处理
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4_

- [ ] 4. 更新配置界面
  - [ ] 4.1 修改 `src/renderer/components/ConfigSettings.tsx`，在图片来源选择中增加"文字配图"选项
  - [ ] 4.2 添加相应的 CSS 样式
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 5. 测试验证
  - [ ] 5.1 构建项目并启动应用
  - [ ] 5.2 验证配置界面显示三种图片来源选项
  - [ ] 5.3 验证文字配图发布流程正常工作
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3_
