import { chromium, Page, BrowserContext } from 'playwright';
import * as path from 'path';
import * as os from 'os';

interface PublishTask {
  id: string;
  title: string;
  content: string;
  coverImage?: string;
  topic?: string;
  productId?: string;
  scheduledTime?: Date;
  images?: string[];
}

// 发布页面 URL
const PUBLISH_URL = 'https://creator.xiaohongshu.com/publish/publish?source=official&from=menu&target=image';

export class PlaywrightPublisher {
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  private getChromeUserDataDir(): string {
    const platform = os.platform();
    const homeDir = os.homedir();
    
    if (platform === 'win32') {
      return path.join(homeDir, 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
    } else if (platform === 'darwin') {
      return path.join(homeDir, 'Library', 'Application Support', 'Google', 'Chrome');
    } else {
      return path.join(homeDir, '.config', 'google-chrome');
    }
  }

  async launch(options: { headless?: boolean; slowMo?: number } = {}) {
    const { headless = false, slowMo = 0 } = options;
    const chromeUserDataDir = this.getChromeUserDataDir();
    
    this.context = await chromium.launchPersistentContext(chromeUserDataDir, {
      headless,
      slowMo,
      channel: 'chrome',
      viewport: { width: 1280, height: 800 },
      locale: 'zh-CN',
      args: ['--profile-directory=Default'],
    });
    
    console.log('✅ 已连接到系统 Chrome');
  }

  async close() {
    if (this.context) {
      await this.context.close();
      this.context = null;
      this.page = null;
      console.log('✅ 浏览器已关闭');
    }
  }

  async openPublishPage() {
    if (!this.context) {
      throw new Error('浏览器未启动');
    }
    this.page = await this.context.newPage();
    await this.page.goto(PUBLISH_URL, { waitUntil: 'networkidle' });
    console.log('✅ 发布页面已加载');
  }

  private formatDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  async publishContent(task: PublishTask) {
    if (!this.page) {
      throw new Error('页面未打开');
    }

    console.log(`📝 开始发布: ${task.title}`);

    // 1. 填写标题
    const titleSelector = '#web > div > div > div > div > div.body > div.content > div.plugin.title-container > div > div > div.input > div.d-input-wrapper.d-inline-block.c-input_inner > div > input';
    try {
      await this.page.waitForSelector(titleSelector, { timeout: 10000 });
      const titleInput = await this.page.$(titleSelector);
      if (titleInput) {
        await titleInput.click();
        await this.page.keyboard.press('Control+A');
        await this.page.keyboard.press('Delete');
        await titleInput.type(task.title, { delay: 50 });
        console.log(`✅ 标题: ${task.title}`);
      }
    } catch (error) {
      console.error('❌ 标题填写失败:', error);
    }

    await this.page.waitForTimeout(1000);

    // 2. 填写文案
    try {
      const contentEditor = await this.page.$('[contenteditable="true"]');
      if (contentEditor) {
        await contentEditor.click();
        await this.page.keyboard.press('Control+A');
        await this.page.keyboard.press('Delete');
        await contentEditor.type(task.content, { delay: 30 });
        console.log('✅ 文案已填写');
      }
    } catch (error) {
      console.error('❌ 文案填写失败:', error);
    }

    await this.page.waitForTimeout(1000);


    // 3. 设置定时发布（如果有）
    if (task.scheduledTime) {
      console.log('📝 设置定时发布...');
      try {
        const scheduleBtn = this.page.locator('span.el-radio__label:has-text("定时发布")').first();
        if (await scheduleBtn.isVisible()) {
          await scheduleBtn.click();
          await this.page.waitForTimeout(1000);
          
          const timeStr = this.formatDateTime(task.scheduledTime);
          const timeInput = await this.page.$('input[placeholder="选择日期和时间"]');
          if (timeInput) {
            await timeInput.click();
            await this.page.keyboard.press('Control+A');
            await this.page.keyboard.type(timeStr, { delay: 30 });
            await this.page.keyboard.press('Enter');
            console.log(`✅ 定时发布: ${timeStr}`);
          }
        }
      } catch (error) {
        console.error('❌ 定时发布设置失败:', error);
      }
    }

    await this.page.waitForTimeout(1000);

    // 4. 点击发布按钮
    try {
      const publishButton = this.page.locator('button:has-text("发布")').first();
      if (await publishButton.isVisible()) {
        await publishButton.click();
        console.log('✅ 发布按钮已点击');
        await this.page.waitForTimeout(3000);
        
        // 发布完成后返回发布页面继续下一条
        console.log('🔄 返回发布页面...');
        await this.page.waitForTimeout(2000);
        await this.page.goto(PUBLISH_URL, { waitUntil: 'networkidle' });
        console.log('✅ 已返回发布页面');
        
        return { success: true };
      } else {
        throw new Error('找不到发布按钮');
      }
    } catch (error) {
      console.error('❌ 发布失败:', error);
      throw error;
    }
  }

  async publishBatch(tasks: PublishTask[], interval: number = 5000) {
    try {
      await this.launch();
      await this.openPublishPage();

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        console.log(`\n📤 [${i + 1}/${tasks.length}] 正在发布...`);
        
        try {
          await this.publishContent(task);
          console.log(`✅ 发布成功: ${task.title}`);
        } catch (error) {
          console.error(`❌ 发布失败: ${task.title}`, error);
        }

        if (i < tasks.length - 1) {
          console.log(`⏳ 等待 ${interval / 1000} 秒...`);
          await this.page?.waitForTimeout(interval);
        }
      }

      console.log('\n🎉 所有内容发布完成');
    } finally {
      await this.close();
    }
  }
}

export const playwrightPublisher = new PlaywrightPublisher();
