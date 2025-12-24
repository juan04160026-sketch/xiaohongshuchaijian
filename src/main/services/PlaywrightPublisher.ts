import { chromium, Page, BrowserContext } from 'playwright';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { PublishTask, PublishResult } from '../../types';

// 发布页面 URL（直接打开图文上传页面）
const PUBLISH_URL = 'https://creator.xiaohongshu.com/publish/publish?source=official&from=tab_switch&target=image';

// CSS 选择器
const SELECTORS = {
  uploadInput: 'input[type="file"]',
  title: '#web > div > div > div > div > div.body > div.content > div.plugin.title-container > div > div > div.input > div.d-input-wrapper.d-inline-block.c-input_inner > div > input',
  content: '#web > div > div > div > div > div.body > div.content > div.plugin.editor-container > div > div > div.editor-container > div.editor-content > div > div',
  publishBtn: 'button.publishBtn',
  topicItem: '#creator-editor-topic-container > div.item',
};

export class PlaywrightPublisher {
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private userDataDir: string;
  private imageDir: string = '';

  constructor() {
    this.userDataDir = path.join(os.homedir(), '.xhs-publisher', 'chrome-data');
  }

  setImageDir(dir: string): void {
    this.imageDir = dir;
  }

  async launch(options: { headless?: boolean; slowMo?: number } = {}): Promise<void> {
    const { headless = false, slowMo = 0 } = options;

    if (!fs.existsSync(this.userDataDir)) {
      fs.mkdirSync(this.userDataDir, { recursive: true });
    }

    this.context = await chromium.launchPersistentContext(this.userDataDir, {
      headless,
      slowMo,
      channel: 'chrome',
      viewport: { width: 1280, height: 900 },
      locale: 'zh-CN',
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--no-sandbox',
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    });

    console.log('✅ 浏览器已启动（反检测模式）');
  }


  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
      this.page = null;
      console.log('✅ 浏览器已关闭');
    }
  }

  // 根据商品ID查找匹配的图片
  findImagesByProductId(productId: string): string[] {
    if (!productId || !this.imageDir || !fs.existsSync(this.imageDir)) {
      console.log('⚠️ 商品ID为空或图片目录不存在: ' + this.imageDir);
      return [];
    }

    const files = fs.readdirSync(this.imageDir);
    const matchedImages: string[] = [];
    const extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.PNG', '.JPG', '.JPEG'];

    // 首先查找精确匹配的文件
    for (const ext of extensions) {
      const exactMatch = productId + ext;
      if (files.includes(exactMatch)) {
        const fullPath = path.join(this.imageDir, exactMatch);
        console.log('   ✅ 精确匹配图片: ' + fullPath);
        matchedImages.push(fullPath);
      }
    }

    // 如果找到精确匹配，直接返回
    if (matchedImages.length > 0) {
      return matchedImages;
    }

    // 没有精确匹配时，查找模式匹配
    for (const ext of extensions) {
      const escapedId = productId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp('^' + escapedId + '[_-]\\d+\\' + ext + '$', 'i');
      for (const file of files) {
        if (pattern.test(file) && !matchedImages.some(img => img.endsWith(file))) {
          const fullPath = path.join(this.imageDir, file);
          console.log('   ✅ 模式匹配图片: ' + fullPath);
          matchedImages.push(fullPath);
        }
      }
    }

    return matchedImages;
  }

  async openPublishPage(): Promise<void> {
    if (!this.context) {
      throw new Error('浏览器未启动');
    }
    this.page = await this.context.newPage();
    
    let retries = 3;
    while (retries > 0) {
      try {
        await this.page.goto(PUBLISH_URL, { waitUntil: 'networkidle', timeout: 60000 });
        break;
      } catch (e) {
        retries--;
        console.log(`⚠️ 页面加载失败，重试中... (${3 - retries}/3)`);
        if (retries === 0) throw new Error('页面加载失败，请检查网络');
        await this.page.waitForTimeout(3000);
      }
    }
    
    await this.page.waitForTimeout(2000);
    console.log('✅ 发布页面已加载');
  }


  async publishContent(task: PublishTask): Promise<PublishResult> {
    if (!this.page) {
      throw new Error('页面未打开');
    }

    const startTime = Date.now();
    console.log(`\n📤 发布: "${task.title}"`);
    console.log(`   商品ID: ${task.productId || '无'}`);

    // 查找匹配的图片
    let images: string[] = [];
    if (task.images && task.images.length > 0) {
      images = task.images;
    } else if (task.productId) {
      images = this.findImagesByProductId(task.productId);
    }
    console.log(`   找到图片: ${images.length} 张`);

    if (images.length === 0) {
      throw new Error('没有找到匹配的图片文件');
    }

    // 打开发布页面
    await this.page.goto(PUBLISH_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await this.page.waitForTimeout(2000);

    // 上传图片
    console.log('   上传图片...');
    await this.page.waitForTimeout(3000);

    const fileInput = await this.page.$('input[type="file"]');
    if (fileInput) {
      for (const img of images) {
        if (!fs.existsSync(img)) {
          throw new Error('图片文件不存在: ' + img);
        }
        console.log('   文件存在: ' + img);
      }

      await fileInput.setInputFiles(images);
      console.log('   ✅ 图片已选择，等待上传...');
      await this.page.waitForTimeout(8000);
      console.log('   ✅ 图片上传完成');
    } else {
      throw new Error('找不到图片上传元素');
    }

    // 等待页面跳转到编辑页面
    console.log('   等待页面跳转...');
    await this.page.waitForTimeout(3000);

    // 等待标题输入框出现
    try {
      await this.page.waitForSelector(SELECTORS.title, { timeout: 60000 });
      console.log('   ✅ 编辑页面已加载');
    } catch (e) {
      console.log('   ⚠️ 等待编辑页面超时，尝试继续...');
    }
    await this.page.waitForTimeout(2000);

    // 输入标题
    console.log('   输入标题...');
    try {
      const titleInput = await this.page.$(SELECTORS.title);
      if (titleInput) {
        await titleInput.click();
        await this.page.keyboard.press('Control+A');
        await this.page.keyboard.press('Delete');

        let title = task.title;
        if (title.length > 20) {
          title = title.substring(0, 20);
          console.log('   ⚠️ 标题超过20字，已截断');
        }

        await titleInput.fill(title);
        console.log(`   ✅ 标题: ${title} (${title.length}字)`);
      }
    } catch (e) {
      console.log('   ⚠️ 标题输入失败: ' + (e as Error).message);
    }

    await this.page.waitForTimeout(1000);

    // 输入正文
    await this.inputContentWithTopics(task.content);

    await this.page.waitForTimeout(2000);

    // 添加商品
    if (task.productId) {
      await this.addProduct(task.productId);
    }

    // 截图保存
    const screenshotPath = `publish-${task.productId || Date.now()}.png`;
    await this.page.screenshot({ path: screenshotPath });
    console.log('   📸 截图: ' + screenshotPath);

    // 点击发布按钮
    console.log('   点击发布...');
    try {
      const publishBtn = await this.page.$('button.publishBtn');
      if (publishBtn) {
        await publishBtn.click();
        console.log('   ✅ 发布按钮已点击');
        await this.page.waitForTimeout(5000);
      }
    } catch (e) {
      console.log('   ⚠️ 发布按钮点击失败: ' + (e as Error).message);
    }

    const duration = Date.now() - startTime;
    return {
      taskId: task.id,
      success: true,
      publishedTime: new Date(),
      duration,
    };
  }


  private async inputContentWithTopics(content: string): Promise<void> {
    if (!this.page) return;

    console.log('   输入正文...');
    try {
      const contentEditor = await this.page.$(SELECTORS.content);
      if (contentEditor) {
        await contentEditor.click();
        await this.page.waitForTimeout(300);
        await this.page.keyboard.press('Control+A');
        await this.page.keyboard.press('Delete');

        const parts = content.split(/(#[^\s#\[]+)/g);

        for (const part of parts) {
          if (!part) continue;

          if (part.startsWith('#') && part.length > 1) {
            const topicName = part;
            console.log('   输入话题: ' + topicName);

            await this.page.keyboard.type(topicName, { delay: 50 });
            await this.page.waitForTimeout(1500);

            try {
              const topicItem = await this.page.$(SELECTORS.topicItem);
              if (topicItem) {
                await topicItem.click();
                console.log('   ✅ 已选择话题: ' + topicName);
              } else {
                console.log('   ⚠️ 话题下拉框未出现: ' + topicName);
              }
            } catch (e) {
              console.log('   ⚠️ 选择话题失败: ' + topicName);
            }

            await this.page.waitForTimeout(500);
            await this.page.keyboard.type(' ', { delay: 50 });
          } else {
            await this.page.keyboard.type(part, { delay: 10 });
          }
        }

        console.log('   ✅ 正文输入完成');
      }
    } catch (e) {
      console.log('   ⚠️ 正文输入失败: ' + (e as Error).message);
    }
  }

  private async addProduct(productId: string): Promise<void> {
    if (!this.page) return;

    console.log('   添加商品...');
    try {
      const addProductBtn = await this.page.$('text=添加商品');
      if (addProductBtn) {
        await addProductBtn.click();
        console.log('   点击添加商品按钮');
        await this.page.waitForTimeout(2000);

        const searchInput = await this.page.$('input[placeholder*="搜索"]');
        if (searchInput) {
          await searchInput.click();
          await searchInput.fill(productId);
          console.log('   输入商品ID: ' + productId);
          await this.page.keyboard.press('Enter');
          await this.page.waitForTimeout(2000);

          const firstProduct = await this.page.$('.goods-list-normal .good-card-container .d-checkbox');
          if (firstProduct) {
            await firstProduct.click();
            console.log('   ✅ 已勾选商品');
            await this.page.waitForTimeout(1000);

            const confirmBtn = await this.page.$('button:has-text("确定"), button:has-text("保存")');
            if (confirmBtn) {
              await confirmBtn.click();
              console.log('   ✅ 商品添加完成');
              await this.page.waitForTimeout(1500);
            }
          } else {
            console.log('   ⚠️ 未找到商品');
          }
        } else {
          console.log('   ⚠️ 未找到搜索框');
        }
      } else {
        console.log('   ⚠️ 未找到添加商品按钮');
      }
    } catch (e) {
      console.log('   ⚠️ 添加商品失败: ' + (e as Error).message);
    }
  }


  async publishBatch(tasks: PublishTask[], interval: number = 30000): Promise<PublishResult[]> {
    const results: PublishResult[] = [];

    try {
      await this.launch();
      await this.openPublishPage();

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        console.log(`\n========== [${i + 1}/${tasks.length}] ==========`);

        try {
          const result = await this.publishContent(task);
          results.push(result);
          console.log(`   ✅ 发布成功`);
        } catch (error) {
          console.error(`   ❌ 发布失败: ${(error as Error).message}`);
          results.push({
            taskId: task.id,
            success: false,
            publishedTime: new Date(),
            duration: 0,
            errorMessage: (error as Error).message,
          });
        }

        if (i < tasks.length - 1) {
          console.log(`\n⏳ 等待 ${interval / 1000} 秒后发布下一条...`);
          await this.page?.waitForTimeout(interval);
        }
      }

      console.log('\n🎉 所有内容发布完成');
    } finally {
      console.log('\n浏览器保持打开 30 秒，你可以手动检查结果...');
      await this.page?.waitForTimeout(30000);
      await this.close();
    }

    return results;
  }
}

export const playwrightPublisher = new PlaywrightPublisher();
