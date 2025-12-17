import { FeishuReader } from './FeishuReader';
import { PlaywrightPublisher } from './PlaywrightPublisher';
import { PublishTask, FeishuConfig } from '../../types';

/**
 * 飞书 → 小红书 完整发布流程
 * 
 * 流程：
 * 1. 从飞书读取数据（小红书标题、文案、封面等）
 * 2. 使用 Playwright 自动化填写小红书发布表单
 * 3. 点击发布按钮
 * 4. 返回发布结果
 */
export class FeishuToXhsPublisher {
  private feishuReader: FeishuReader;
  private playwrightPublisher: PlaywrightPublisher;

  constructor() {
    this.feishuReader = new FeishuReader();
    this.playwrightPublisher = new PlaywrightPublisher();
  }

  /**
   * 完整发布流程：从飞书读取 → 小红书发布
   */
  async publishFromFeishu(
    feishuConfig: FeishuConfig,
    options: {
      interval?: number; // 发布间隔（毫秒）
      headless?: boolean; // 是否隐藏浏览器窗口
      slowMo?: number; // 减速执行（毫秒）
    } = {}
  ) {
    const { interval = 30000, headless = false, slowMo = 0 } = options;

    try {
      console.log('🚀 开始从飞书读取数据...\n');

      // 步骤 1: 连接飞书
      console.log('📚 连接飞书...');
      await this.feishuReader.connect(feishuConfig);
      console.log('✅ 飞书连接成功\n');

      // 步骤 2: 读取待发布的内容
      console.log('📖 读取待发布内容...');
      const tasks = await this.feishuReader.fetchRecords();
      console.log(`✅ 读取到 ${tasks.length} 条内容\n`);

      if (tasks.length === 0) {
        console.warn('⚠️ 没有待发布的内容');
        return { success: false, message: '没有待发布的内容' };
      }

      // 步骤 3: 启动 Playwright
      console.log('🎬 启动 Playwright...');
      await this.playwrightPublisher.launch({
        headless,
        slowMo,
      });
      console.log('✅ Playwright 已启动\n');

      // 步骤 4: 逐个发布内容
      const results = {
        success: 0,
        failed: 0,
        total: tasks.length,
        details: [] as any[],
      };

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        console.log(`\n📤 [${i + 1}/${tasks.length}] 发布: ${task.title}`);
        console.log(`   来源: 飞书表格 (ID: ${task.id})`);

        try {
          // 打开发布页面
          if (i === 0) {
            console.log('📱 打开小红书发布页面...');
            await this.playwrightPublisher.openPublishPage();
            console.log('✅ 页面已打开\n');
          }

          // 发布内容
          console.log('✍️ 填写表单...');
          await this.playwrightPublisher.publishContent(task);
          console.log('✅ 发布成功\n');

          results.success++;
          results.details.push({
            title: task.title,
            status: 'success',
            feishuId: task.id,
          });

          // 等待间隔
          if (i < tasks.length - 1) {
            console.log(`⏳ 等待 ${interval / 1000} 秒后发布下一条...\n`);
            await this.sleep(interval);
          }
        } catch (error) {
          console.error(`❌ 发布失败: ${(error as Error).message}\n`);
          results.failed++;
          results.details.push({
            title: task.title,
            status: 'failed',
            feishuId: task.id,
            error: (error as Error).message,
          });
        }
      }

      // 步骤 5: 关闭 Playwright
      console.log('\n🔌 关闭 Playwright...');
      await this.playwrightPublisher.close();
      console.log('✅ Playwright 已关闭\n');

      // 步骤 6: 显示结果
      console.log('📊 发布结果统计:');
      console.log(`   成功: ${results.success}`);
      console.log(`   失败: ${results.failed}`);
      console.log(`   总计: ${results.total}\n`);

      return {
        success: results.failed === 0,
        results,
      };
    } catch (error) {
      console.error('❌ 发布流程出错:', error);
      await this.playwrightPublisher.close();
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 发布单个内容
   */
  async publishSingleTask(
    feishuConfig: FeishuConfig,
    recordId: string,
    options: {
      headless?: boolean;
      slowMo?: number;
    } = {}
  ) {
    const { headless = false, slowMo = 0 } = options;

    try {
      console.log(`🚀 发布单个内容 (ID: ${recordId})\n`);

      // 连接飞书
      console.log('📚 连接飞书...');
      await this.feishuReader.connect(feishuConfig);
      console.log('✅ 飞书连接成功\n');

      // 读取单个记录
      console.log('📖 读取内容...');
      const task = await this.feishuReader.fetchRecordById(recordId);
      console.log(`✅ 读取成功: ${task.title}\n`);

      // 启动 Playwright
      console.log('🎬 启动 Playwright...');
      await this.playwrightPublisher.launch({
        headless,
        slowMo,
      });
      console.log('✅ Playwright 已启动\n');

      // 打开页面
      console.log('📱 打开小红书发布页面...');
      await this.playwrightPublisher.openPublishPage();
      console.log('✅ 页面已打开\n');

      // 发布
      console.log('✍️ 填写表单...');
      await this.playwrightPublisher.publishContent(task);
      console.log('✅ 发布成功\n');

      // 关闭
      await this.playwrightPublisher.close();

      return {
        success: true,
        task,
      };
    } catch (error) {
      console.error('❌ 发布失败:', error);
      await this.playwrightPublisher.close();
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 测试飞书连接
   */
  async testFeishuConnection(feishuConfig: FeishuConfig): Promise<boolean> {
    try {
      console.log('🧪 测试飞书连接...');
      await this.feishuReader.connect(feishuConfig);
      const isValid = await this.feishuReader.validateConnection();
      
      if (isValid) {
        console.log('✅ 飞书连接成功');
      } else {
        console.error('❌ 飞书连接失败');
      }
      
      return isValid;
    } catch (error) {
      console.error('❌ 测试失败:', error);
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 导出单例
export const feishuToXhsPublisher = new FeishuToXhsPublisher();
