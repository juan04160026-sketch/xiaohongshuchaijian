import { Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { BitBrowserManager, BitBrowserWindow } from './BitBrowserManager';
import { PublishTask, PublishResult } from '../../types';

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

  constructor() {
    this.bitBrowser = new BitBrowserManager();
  }

  setImageDir(dir: string): void {
    this.imageDir = dir;
  }

  setPublishInterval(seconds: number): void {
    this.publishInterval = seconds * 1000;
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
    const startTime = Date.now();
    console.log(`\n📤 [${task.windowName || task.windowId}] 发布: "${task.title}"`);

    try {
      // 打开浏览器窗口
      const context = await this.bitBrowser.openWindow(task.windowId);
      const page = await context.newPage();

      // 查找图片
      let images: string[] = [];
      if (task.images && task.images.length > 0) {
        images = task.images;
      } else if (task.productId) {
        images = this.findImagesByProductId(task.productId);
      }

      if (images.length === 0) {
        throw new Error('没有找到匹配的图片文件');
      }

      // 打开发布页面
      await page.goto(PUBLISH_URL, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(2000);

      // 上传图片
      console.log(`   上传 ${images.length} 张图片...`);
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.setInputFiles(images);
        await page.waitForTimeout(8000);
        console.log('   ✅ 图片上传完成');
      } else {
        throw new Error('找不到图片上传元素');
      }

      // 等待编辑页面
      await page.waitForTimeout(3000);
      try {
        await page.waitForSelector(SELECTORS.title, { timeout: 60000 });
      } catch (e) {
        console.log('   ⚠️ 等待编辑页面超时');
      }

      // 输入标题（截断到20字）
      await this.inputTitle(page, task.title);

      // 输入正文（处理话题）
      await this.inputContent(page, task.content);

      // 添加商品
      if (task.productId) {
        await this.addProduct(page, task.productId);
      }

      // 点击发布
      const publishBtn = await page.$('button.publishBtn');
      if (publishBtn) {
        await publishBtn.click();
        console.log('   ✅ 发布按钮已点击');
        await page.waitForTimeout(5000);
      }

      await page.close();

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
   * 输入标题（超过20字自动截断）
   */
  private async inputTitle(page: Page, title: string): Promise<void> {
    try {
      const titleInput = await page.$(SELECTORS.title);
      if (titleInput) {
        await titleInput.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Delete');

        let finalTitle = title;
        if (finalTitle.length > 20) {
          finalTitle = finalTitle.substring(0, 20);
          console.log('   ⚠️ 标题超过20字，已截断');
        }

        await titleInput.fill(finalTitle);
        console.log(`   ✅ 标题: ${finalTitle} (${finalTitle.length}字)`);
      }
    } catch (e) {
      console.log('   ⚠️ 标题输入失败');
    }
    await page.waitForTimeout(1000);
  }

  /**
   * 输入正文（智能处理话题标签）
   */
  private async inputContent(page: Page, content: string): Promise<void> {
    try {
      const contentEditor = await page.$(SELECTORS.content);
      if (contentEditor) {
        await contentEditor.click();
        await page.waitForTimeout(300);
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Delete');

        // 解析正文，分离普通文本和话题标签
        const parts = content.split(/(#[^\s#\[]+)/g);

        for (const part of parts) {
          if (!part) continue;

          if (part.startsWith('#') && part.length > 1) {
            // 话题标签
            await page.keyboard.type(part, { delay: 50 });
            await page.waitForTimeout(1500);

            // 尝试选择下拉框
            const topicItem = await page.$(SELECTORS.topicItem);
            if (topicItem) {
              await topicItem.click();
              console.log(`   ✅ 已选择话题: ${part}`);
            }
            await page.waitForTimeout(500);
            await page.keyboard.type(' ', { delay: 50 });
          } else {
            // 普通文本
            await page.keyboard.type(part, { delay: 10 });
          }
        }
        console.log('   ✅ 正文输入完成');
      }
    } catch (e) {
      console.log('   ⚠️ 正文输入失败');
    }
    await page.waitForTimeout(2000);
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
   * 串行发布 - 一个账号发完再发下一个
   */
  async publishSerial(tasks: PublishTaskWithAccount[]): Promise<PublishResult[]> {
    const results: PublishResult[] = [];

    // 按窗口分组
    const tasksByWindow = new Map<string, PublishTaskWithAccount[]>();
    for (const task of tasks) {
      const windowTasks = tasksByWindow.get(task.windowId) || [];
      windowTasks.push(task);
      tasksByWindow.set(task.windowId, windowTasks);
    }

    // 逐个窗口发布
    for (const [windowId, windowTasks] of tasksByWindow) {
      console.log(`\n========== 窗口: ${windowTasks[0].windowName || windowId} ==========`);
      
      for (let i = 0; i < windowTasks.length; i++) {
        const task = windowTasks[i];
        console.log(`[${i + 1}/${windowTasks.length}]`);
        
        const result = await this.publishOne(task);
        results.push(result);

        // 同一窗口内的发布间隔
        if (i < windowTasks.length - 1) {
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
    await this.bitBrowser.closeAll();
  }
}
