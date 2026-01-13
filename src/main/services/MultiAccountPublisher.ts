import { Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { BitBrowserManager, BitBrowserWindow } from './BitBrowserManager';
import { PublishTask, PublishResult, ImageSourceType } from '../../types';
import { extractTagsFromContent } from '../utils/tagExtractor';

// 发布页面 URL
const PUBLISH_URL = 'https://creator.xiaohongshu.com/publish/publish?source=official&from=tab_switch&target=image';

// CSS 选择器
const SELECTORS = {
  uploadInput: 'input[type="file"]',
  title: '#web > div > div > div > div > div.body > div.content > div.plugin.title-container > div > div > div.input > div.d-input-wrapper.d-inline-block.c-input_inner > div > input',
  content: '#web > div > div > div > div > div.body > div.content > div.plugin.editor-container > div > div > div.editor-container > div.editor-content > div > div',
  publishBtn: 'button.publishBtn',
  topicItem: '#creator-editor-topic-container > div.item',
};

// 文字配图选择器
const TEXT2IMAGE_SELECTORS = {
  // 文字配图按钮
  text2imageBtn: 'button.text2image-button',
  // 文字输入框 (使用更简洁的选择器)
  textInput: '.text-editor-slide.focused .editor-content p',
  // 生成图片按钮
  generateBtn: '.edit-text-button-container > div',
  // 下一步按钮
  nextBtn: '.overview-footer > button',
};

/**
 * 发布任务（带账号信息）
 */
export interface PublishTaskWithAccount extends PublishTask {
  windowId: string;     // 比特浏览器窗口 ID
  windowName?: string;  // 窗口名称（用于显示）
}

/**
 * 多账号发布器
 * 支持使用比特浏览器的多个窗口同时发布
 */
export class MultiAccountPublisher {
  private bitBrowser: BitBrowserManager;
  private imageDir: string = '';
  private publishInterval: number = 30000; // 同一账号发布间隔（毫秒）
  private imageSource: ImageSourceType = 'local'; // 图片来源
  private isStopped: boolean = false; // 停止标志

  constructor() {
    this.bitBrowser = new BitBrowserManager();
  }

  setImageDir(dir: string): void {
    this.imageDir = dir;
  }

  setPublishInterval(seconds: number): void {
    this.publishInterval = seconds * 1000;
  }

  setImageSource(source: ImageSourceType): void {
    this.imageSource = source;
  }

  /**
   * 设置停止标志
   */
  setStopped(stopped: boolean): void {
    this.isStopped = stopped;
  }

  /**
   * 检查是否已停止
   */
  checkStopped(): boolean {
    return this.isStopped;
  }

  /**
   * 获取所有可用的浏览器窗口
   */
  async getAvailableWindows(): Promise<BitBrowserWindow[]> {
    return this.bitBrowser.getWindowList();
  }


  /**
   * 根据商品ID查找匹配的图片
   */
  findImagesByProductId(productId: string): string[] {
    if (!productId || !this.imageDir || !fs.existsSync(this.imageDir)) {
      return [];
    }

    const files = fs.readdirSync(this.imageDir);
    const matchedImages: string[] = [];
    const extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.PNG', '.JPG', '.JPEG'];

    for (const ext of extensions) {
      const exactMatch = productId + ext;
      if (files.includes(exactMatch)) {
        matchedImages.push(path.join(this.imageDir, exactMatch));
      }

      // 支持 商品ID_1.png 格式
      const pattern = new RegExp('^' + productId + '[_-]?\\d*\\' + ext + '$', 'i');
      for (const file of files) {
        if (pattern.test(file) && !matchedImages.some(img => img.endsWith(file))) {
          matchedImages.push(path.join(this.imageDir, file));
        }
      }
    }

    return matchedImages;
  }

  /**
   * 在指定窗口发布单条内容
   */
  async publishOne(task: PublishTaskWithAccount): Promise<PublishResult> {
    // 检查是否已停止
    if (this.isStopped) {
      console.log(`🛑 发布已停止，跳过任务: "${task.title}"`);
      return {
        taskId: task.id,
        success: false,
        publishedTime: new Date(),
        duration: 0,
        errorMessage: '发布已停止',
      };
    }
    
    const startTime = Date.now();
    console.log(`\n📤 [${task.windowName || task.windowId}] 发布: "${task.title}"`);
    const imageSourceName = this.imageSource === 'feishu' ? '飞书图片' : this.imageSource === 'text2image' ? '文字配图' : '本地合成图片';
    console.log(`   图片来源: ${imageSourceName}`);

    try {
      // 打开浏览器窗口
      const context = await this.bitBrowser.openWindow(task.windowId);
      const page = await context.newPage();

      // 打开发布页面 - 使用 domcontentloaded 而不是 networkidle，避免超时
      console.log('   正在打开发布页面...');
      await page.goto(PUBLISH_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      
      // 等待页面加载完成
      console.log('   等待页面加载...');
      await page.waitForTimeout(3000);

      // 根据图片来源选择不同的处理方式
      if (this.imageSource === 'text2image') {
        // 使用文字配图功能
        await this.useText2Image(page, task.title);
      } else if (this.imageSource === 'feishu') {
        // 使用飞书图片
        const feishuImages = (task as any).feishuImages || task.images || [];
        const images = feishuImages.filter((img: string) => fs.existsSync(img));
        
        if (images.length === 0) {
          // 飞书图片为空，自动切换到文字配图模式
          console.log('   ⚠️ 飞书图片为空，自动切换到文字配图模式');
          await this.useText2Image(page, task.title);
        } else {
          console.log(`   使用飞书图片: ${images.length} 张`);
          
          // 等待上传按钮出现
          try {
            await page.waitForSelector('input[type="file"]', { timeout: 30000 });
          } catch (e) {
            await page.waitForTimeout(5000);
          }

          // 上传图片
          console.log(`   上传 ${images.length} 张图片...`);
          const fileInput = await page.$('input[type="file"]');
          if (fileInput) {
            await fileInput.setInputFiles(images);
            
            // 等待图片上传完成
            console.log('   等待图片上传...');
            let uploadComplete = false;
            for (let i = 0; i < 30; i++) {
              await page.waitForTimeout(1000);
              const titleInput = await page.$(SELECTORS.title);
              if (titleInput) {
                uploadComplete = true;
                console.log('   ✅ 图片上传完成，已进入编辑页面');
                break;
              }
              const errorMsg = await page.$('.upload-error, .error-message');
              if (errorMsg) {
                throw new Error('图片上传失败');
              }
            }
            
            if (!uploadComplete) {
              console.log('   ⚠️ 等待编辑页面超时，尝试继续...');
            }
          } else {
            throw new Error('找不到图片上传元素');
          }

          await page.waitForTimeout(2000);
        }
      } else {
        // 使用本地合成图片
        let images: string[] = [];
        if (task.productId) {
          images = this.findImagesByProductId(task.productId);
        }
        if (images.length === 0) {
          throw new Error(`没有找到本地图片，请检查图片目录中是否有 ${task.productId} 相关图片`);
        }
        console.log(`   使用本地图片: ${images.length} 张`);

        // 等待上传按钮出现
        try {
          await page.waitForSelector('input[type="file"]', { timeout: 30000 });
        } catch (e) {
          await page.waitForTimeout(5000);
        }

        // 上传图片
        console.log(`   上传 ${images.length} 张图片...`);
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
          await fileInput.setInputFiles(images);
          
          // 等待图片上传完成
          console.log('   等待图片上传...');
          let uploadComplete = false;
          for (let i = 0; i < 30; i++) {
            await page.waitForTimeout(1000);
            const titleInput = await page.$(SELECTORS.title);
            if (titleInput) {
              uploadComplete = true;
              console.log('   ✅ 图片上传完成，已进入编辑页面');
              break;
            }
            const errorMsg = await page.$('.upload-error, .error-message');
            if (errorMsg) {
              throw new Error('图片上传失败');
            }
          }
          
          if (!uploadComplete) {
            console.log('   ⚠️ 等待编辑页面超时，尝试继续...');
          }
        } else {
          throw new Error('找不到图片上传元素');
        }

        await page.waitForTimeout(2000);
      }

      // 输入标题（截断到20字）
      await this.inputTitle(page, task.title);

      // 输入正文
      await this.inputContent(page, task.content);

      // 输入标签（从文案中提取）
      const tags = extractTagsFromContent(task.content);
      console.log(`   📋 从文案中提取到 ${tags.length} 个标签: ${tags.join(', ')}`);
      if (tags.length > 0) {
        await this.inputTagsArray(page, tags);
      } else {
        console.log('   ℹ️ 文案中没有标签');
      }

      // 添加商品
      if (task.productId) {
        await this.addProduct(page, task.productId);
      }

      // 点击发布
      const publishBtn = await page.$('button.publishBtn');
      if (publishBtn) {
        await publishBtn.click();
        console.log('   ✅ 发布按钮已点击');
        
        // 等待并验证发布结果
        let publishSuccess = false;
        let publishError = '';
        
        for (let i = 0; i < 15; i++) {
          await page.waitForTimeout(1000);
          
          // 检查页面是否还存在
          try {
            const isClosed = page.isClosed();
            if (isClosed) {
              publishError = '页面被意外关闭';
              break;
            }
          } catch (e) {
            publishError = '页面连接丢失';
            break;
          }
          
          // 检查是否有错误提示
          const errorToast = await page.$('.d-toast-error, .error-toast, .toast-error, [class*="error"]');
          if (errorToast) {
            const errorText = await errorToast.textContent();
            if (errorText && (errorText.includes('失败') || errorText.includes('错误') || errorText.includes('error'))) {
              publishError = errorText || '发布失败';
              break;
            }
          }
          
          // 检查是否跳转到成功页面或显示成功提示
          const currentUrl = page.url();
          if (currentUrl.includes('/publish/success') || currentUrl.includes('published')) {
            publishSuccess = true;
            console.log('   ✅ 检测到发布成功页面');
            break;
          }
          
          // 检查成功提示
          const successToast = await page.$('.d-toast-success, .success-toast, [class*="success"]');
          if (successToast) {
            const successText = await successToast.textContent();
            if (successText && (successText.includes('成功') || successText.includes('发布'))) {
              publishSuccess = true;
              console.log('   ✅ 检测到发布成功提示');
              break;
            }
          }
          
          // 检查发布按钮是否消失（可能表示发布成功）
          const btnStillExists = await page.$('button.publishBtn');
          if (!btnStillExists && i > 3) {
            // 按钮消失且没有错误，可能是成功了
            publishSuccess = true;
            console.log('   ✅ 发布按钮已消失，可能发布成功');
            break;
          }
        }
        
        if (publishError) {
          throw new Error(publishError);
        }
        
        if (!publishSuccess) {
          console.log('   ⚠️ 无法确认发布结果，假定成功');
        }
      } else {
        throw new Error('找不到发布按钮');
      }

      try {
        await page.close();
      } catch (e) {
        // 页面可能已经关闭，忽略错误
      };

      const duration = Date.now() - startTime;
      return {
        taskId: task.id,
        success: true,
        publishedTime: new Date(),
        duration,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`   ❌ 发布失败: ${errorMessage}`);
      return {
        taskId: task.id,
        success: false,
        publishedTime: new Date(),
        duration: Date.now() - startTime,
        errorMessage,
      };
    }
  }


  /**
   * 计算字符串的视觉长度（正确处理 emoji）
   * emoji 算作 1 个字符
   */
  private getVisualLength(str: string): number {
    return [...str].length;
  }

  /**
   * 移除字符串中的所有 emoji
   */
  private removeEmoji(str: string): string {
    // 匹配常见的 emoji 范围
    return str.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '');
  }

  /**
   * 按视觉长度截断字符串（正确处理 emoji）
   * 优先保留文字，截断时去掉emoji
   */
  private truncateTitle(title: string, maxLength: number): string {
    const chars = [...title];
    const visualLength = chars.length;
    
    // 如果不超过限制，保留完整标题
    if (visualLength <= maxLength) {
      return title;
    }
    
    // 计算去掉emoji后的长度
    const textOnly = this.removeEmoji(title);
    const textLength = [...textOnly].length;
    
    // 如果纯文字不超过20字，保留完整标题（包括emoji）
    // 小红书可能会自动处理超出的emoji
    if (textLength <= maxLength) {
      console.log(`   📝 纯文字${textLength}字，保留完整标题（含emoji）`);
      return title;
    }
    
    // 纯文字也超过20字，需要截断
    // 先去掉emoji，再截断到20字
    const textChars = [...textOnly];
    return textChars.slice(0, maxLength).join('');
  }

  /**
   * 输入标题（超过20字自动截断）
   */
  private async inputTitle(page: Page, title: string): Promise<void> {
    try {
      const titleInput = await page.$(SELECTORS.title);
      if (titleInput) {
        await titleInput.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Delete');
        await page.waitForTimeout(300);

        // 智能截断：优先保留文字内容
        const visualLength = this.getVisualLength(title);
        const textOnly = this.removeEmoji(title);
        const textLength = this.getVisualLength(textOnly);
        
        console.log(`   📊 原标题: "${title}" (总长度:${visualLength}, 纯文字:${textLength})`);
        
        let finalTitle = title;
        
        // 只有纯文字超过20字才截断
        if (textLength > 20) {
          finalTitle = this.truncateTitle(title, 20);
          console.log(`   ⚠️ 纯文字超过20字(${textLength}字)，已截断`);
        }

        const finalVisualLength = this.getVisualLength(finalTitle);
        console.log(`   📝 准备输入标题: "${finalTitle}" (视觉长度:${finalVisualLength}字, JS长度:${finalTitle.length})`);
        
        // 方法1: 使用 evaluate 直接设置 input 的 value 并触发事件
        await page.evaluate((text) => {
          const input = document.querySelector('#web > div > div > div > div > div.body > div.content > div.plugin.title-container > div > div > div.input > div.d-input-wrapper.d-inline-block.c-input_inner > div > input') as HTMLInputElement;
          if (input) {
            input.value = text;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, finalTitle);
        await page.waitForTimeout(500);
        
        // 验证输入结果
        let inputValue = await titleInput.inputValue();
        const inputVisualLength = this.getVisualLength(inputValue);
        console.log(`   方法1结果: "${inputValue}" (视觉长度:${inputVisualLength}字)`);
        
        // 如果方法1失败，尝试方法2: fill
        if (inputVisualLength !== finalVisualLength) {
          console.log(`   ⚠️ 方法1长度不匹配，尝试 fill 方法`);
          await titleInput.click();
          await page.keyboard.press('Control+A');
          await page.keyboard.press('Delete');
          await page.waitForTimeout(200);
          await titleInput.fill(finalTitle);
          await page.waitForTimeout(500);
          inputValue = await titleInput.inputValue();
          console.log(`   方法2结果: "${inputValue}" (视觉长度:${this.getVisualLength(inputValue)}字)`);
        }
        
        // 如果方法2也失败，尝试方法3: 逐字符输入
        if (this.getVisualLength(inputValue) !== finalVisualLength) {
          console.log(`   ⚠️ 方法2长度不匹配，尝试逐字符输入`);
          await titleInput.click();
          await page.keyboard.press('Control+A');
          await page.keyboard.press('Delete');
          await page.waitForTimeout(200);
          
          // 逐字符输入，使用 spread 运算符正确处理 emoji
          for (const char of [...finalTitle]) {
            await page.keyboard.type(char, { delay: 50 });
          }
          await page.waitForTimeout(500);
          inputValue = await titleInput.inputValue();
          console.log(`   方法3结果: "${inputValue}" (视觉长度:${this.getVisualLength(inputValue)}字)`);
        }
        
        console.log(`   ✅ 最终标题: "${inputValue}" (视觉长度:${this.getVisualLength(inputValue)}字)`)
      }
    } catch (e) {
      console.log('   ⚠️ 标题输入失败:', e);
    }
    await page.waitForTimeout(1000);
  }

  /**
   * 输入正文（不包含话题标签）
   */
  private async inputContent(page: Page, content: string): Promise<void> {
    try {
      const contentEditor = await page.$(SELECTORS.content);
      if (contentEditor) {
        await contentEditor.click();
        await page.waitForTimeout(300);
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Delete');

        // 直接输入正文内容（不处理话题标签）
        await page.keyboard.type(content, { delay: 10 });
        console.log('   ✅ 正文输入完成');
      }
    } catch (e) {
      console.log('   ⚠️ 正文输入失败');
    }
    await page.waitForTimeout(1000);
  }

  /**
   * 输入话题标签（从标签数组）
   */
  private async inputTagsArray(page: Page, tags: string[]): Promise<void> {
    if (!tags || tags.length === 0) {
      console.log('   ℹ️ 没有标签需要输入');
      return;
    }

    try {
      const contentEditor = await page.$(SELECTORS.content);
      if (contentEditor) {
        // 点击正文编辑器末尾
        await contentEditor.click();
        await page.keyboard.press('End');
        await page.waitForTimeout(300);

        // 先输入换行
        await page.keyboard.press('Enter');
        await page.waitForTimeout(200);

        // 逐个输入标签
        for (const tag of tags) {
          // 输入 # 和标签名
          await page.keyboard.type(`#${tag}`, { delay: 50 });
          await page.waitForTimeout(1500);

          // 尝试选择下拉框
          const topicItem = await page.$(SELECTORS.topicItem);
          if (topicItem) {
            await topicItem.click();
            console.log(`   ✅ 已选择话题: #${tag}`);
          }
          await page.waitForTimeout(500);
          await page.keyboard.type(' ', { delay: 50 });
        }
        console.log('   ✅ 标签输入完成');
      }
    } catch (e) {
      console.log('   ⚠️ 标签输入失败:', e);
    }
    await page.waitForTimeout(1000);
  }

  /**
   * 输入话题标签（从标签字段读取 - 保留用于兼容）
   */
  private async inputTags(page: Page, tags: string): Promise<void> {
    if (!tags || tags.trim() === '') {
      console.log('   ℹ️ 没有标签需要输入');
      return;
    }

    try {
      const contentEditor = await page.$(SELECTORS.content);
      if (contentEditor) {
        // 点击正文编辑器末尾
        await contentEditor.click();
        await page.keyboard.press('End');
        await page.waitForTimeout(300);

        // 先输入换行
        await page.keyboard.press('Enter');
        await page.waitForTimeout(200);

        // 解析标签，分离各个话题
        const tagList = tags.split(/(#[^\s#\[]+)/g).filter(t => t && t.trim());

        for (const tag of tagList) {
          if (tag.startsWith('#') && tag.length > 1) {
            // 话题标签
            await page.keyboard.type(tag, { delay: 50 });
            await page.waitForTimeout(1500);

            // 尝试选择下拉框
            const topicItem = await page.$(SELECTORS.topicItem);
            if (topicItem) {
              await topicItem.click();
              console.log(`   ✅ 已选择话题: ${tag}`);
            }
            await page.waitForTimeout(500);
            await page.keyboard.type(' ', { delay: 50 });
          } else if (tag.trim()) {
            // 普通文本（标签之间的空格等）
            await page.keyboard.type(tag, { delay: 10 });
          }
        }
        console.log('   ✅ 标签输入完成');
      }
    } catch (e) {
      console.log('   ⚠️ 标签输入失败:', e);
    }
    await page.waitForTimeout(1000);
  }

  /**
   * 添加商品
   */
  private async addProduct(page: Page, productId: string): Promise<void> {
    try {
      const addProductBtn = await page.$('text=添加商品');
      if (addProductBtn) {
        await addProductBtn.click();
        await page.waitForTimeout(2000);

        const searchInput = await page.$('input[placeholder*="搜索"]');
        if (searchInput) {
          await searchInput.fill(productId);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(2000);

          const firstProduct = await page.$('.goods-list-normal .good-card-container .d-checkbox');
          if (firstProduct) {
            await firstProduct.click();
            await page.waitForTimeout(1000);

            const confirmBtn = await page.$('button:has-text("确定"), button:has-text("保存")');
            if (confirmBtn) {
              await confirmBtn.click();
              console.log('   ✅ 商品添加完成');
            }
          }
        }
      }
    } catch (e) {
      console.log('   ⚠️ 添加商品失败');
    }
  }

  /**
   * 使用文字配图功能生成图片
   */
  private async useText2Image(page: Page, title: string): Promise<void> {
    console.log('   使用文字配图功能...');
    
    // 1. 点击文字配图按钮
    console.log('   点击文字配图按钮...');
    const text2imageBtn = await page.$(TEXT2IMAGE_SELECTORS.text2imageBtn);
    if (!text2imageBtn) {
      throw new Error('文字配图按钮未找到');
    }
    await text2imageBtn.click();
    await page.waitForTimeout(2000);
    
    // 2. 等待文字输入框出现并输入标题
    console.log('   等待文字输入框...');
    let textInput = null;
    for (let i = 0; i < 10; i++) {
      textInput = await page.$(TEXT2IMAGE_SELECTORS.textInput);
      if (textInput) break;
      await page.waitForTimeout(500);
    }
    
    if (!textInput) {
      throw new Error('文字输入框未找到');
    }
    
    // 点击输入框并输入标题
    await textInput.click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type(title, { delay: 30 });
    console.log(`   ✅ 已输入标题: ${title}`);
    await page.waitForTimeout(1000);
    
    // 3. 点击生成图片按钮
    console.log('   点击生成图片按钮...');
    const generateBtn = await page.$(TEXT2IMAGE_SELECTORS.generateBtn);
    if (!generateBtn) {
      throw new Error('生成图片按钮未找到');
    }
    await generateBtn.click();
    
    // 4. 等待图片生成完成（最多等待30秒）
    console.log('   等待图片生成...');
    let nextBtnFound = false;
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1000);
      const nextBtn = await page.$(TEXT2IMAGE_SELECTORS.nextBtn);
      if (nextBtn) {
        // 检查按钮是否可点击（不是禁用状态）
        const isDisabled = await nextBtn.getAttribute('disabled');
        if (!isDisabled) {
          nextBtnFound = true;
          console.log('   ✅ 图片生成完成');
          break;
        }
      }
    }
    
    if (!nextBtnFound) {
      throw new Error('生成图片超时');
    }
    
    // 5. 点击下一步按钮
    console.log('   点击下一步...');
    const nextBtn = await page.$(TEXT2IMAGE_SELECTORS.nextBtn);
    if (!nextBtn) {
      throw new Error('下一步按钮未找到');
    }
    await nextBtn.click();
    
    // 等待进入编辑页面
    console.log('   等待进入编辑页面...');
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1000);
      const titleInput = await page.$(SELECTORS.title);
      if (titleInput) {
        console.log('   ✅ 已进入编辑页面');
        break;
      }
    }
    
    await page.waitForTimeout(2000);
  }


  /**
   * 串行发布 - 一个账号发完再发下一个
   * @param tasks 任务列表
   * @param onTaskComplete 每条任务完成后的回调函数
   */
  async publishSerial(
    tasks: PublishTaskWithAccount[],
    onTaskComplete?: (result: PublishResult, task: PublishTaskWithAccount) => Promise<void>
  ): Promise<PublishResult[]> {
    const results: PublishResult[] = [];
    
    // 重置停止标志
    this.isStopped = false;

    // 按窗口分组
    const tasksByWindow = new Map<string, PublishTaskWithAccount[]>();
    for (const task of tasks) {
      const windowTasks = tasksByWindow.get(task.windowId) || [];
      windowTasks.push(task);
      tasksByWindow.set(task.windowId, windowTasks);
    }

    // 逐个窗口发布
    for (const [windowId, windowTasks] of tasksByWindow) {
      // 检查是否已停止
      if (this.isStopped) {
        console.log('🛑 发布已停止，跳过剩余窗口');
        break;
      }
      
      console.log(`\n========== 窗口: ${windowTasks[0].windowName || windowId} ==========`);
      
      for (let i = 0; i < windowTasks.length; i++) {
        // 检查是否已停止
        if (this.isStopped) {
          console.log('🛑 发布已停止，跳过剩余任务');
          break;
        }
        
        const task = windowTasks[i];
        console.log(`[${i + 1}/${windowTasks.length}]`);
        
        const result = await this.publishOne(task);
        results.push(result);

        // 每条任务完成后立即回调（用于更新飞书状态）
        if (onTaskComplete) {
          try {
            await onTaskComplete(result, task);
          } catch (e) {
            console.error('任务完成回调执行失败:', e);
          }
        }

        // 同一窗口内的发布间隔
        if (i < windowTasks.length - 1 && !this.isStopped) {
          console.log(`⏳ 等待 ${this.publishInterval / 1000} 秒...`);
          await new Promise(resolve => setTimeout(resolve, this.publishInterval));
        }
      }
    }

    return results;
  }

  /**
   * 并行发布 - 多个账号同时发布
   */
  async publishParallel(tasks: PublishTaskWithAccount[], maxConcurrent: number = 3): Promise<PublishResult[]> {
    const results: PublishResult[] = [];

    // 按窗口分组
    const tasksByWindow = new Map<string, PublishTaskWithAccount[]>();
    for (const task of tasks) {
      const windowTasks = tasksByWindow.get(task.windowId) || [];
      windowTasks.push(task);
      tasksByWindow.set(task.windowId, windowTasks);
    }

    // 创建每个窗口的发布队列
    const windowQueues = Array.from(tasksByWindow.entries()).map(([_windowId, windowTasks]) => {
      return async () => {
        const windowResults: PublishResult[] = [];
        for (let i = 0; i < windowTasks.length; i++) {
          const task = windowTasks[i];
          const result = await this.publishOne(task);
          windowResults.push(result);

          if (i < windowTasks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, this.publishInterval));
          }
        }
        return windowResults;
      };
    });

    // 并行执行（限制并发数）
    const executing: Promise<PublishResult[]>[] = [];
    for (const queue of windowQueues) {
      const p = queue().then(r => {
        results.push(...r);
        return r;
      });
      executing.push(p);

      if (executing.length >= maxConcurrent) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * 关闭所有浏览器窗口
   */
  async closeAll(): Promise<void> {
    // 设置停止标志
    this.isStopped = true;
    await this.bitBrowser.closeAll();
  }
}
