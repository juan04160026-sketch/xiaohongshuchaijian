import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PublishTask, FeishuConfig } from '../../types';

export class FeishuReader {
  private client: AxiosInstance | null = null;
  private config: FeishuConfig | null = null;
  private accessToken: string | null = null;
  private imageDir: string;

  constructor() {
    // 图片下载目录
    this.imageDir = path.join(os.homedir(), '.xhs-publisher', 'images');
    if (!fs.existsSync(this.imageDir)) {
      fs.mkdirSync(this.imageDir, { recursive: true });
    }
  }

  async connect(config: FeishuConfig): Promise<void> {
    this.config = config;
    this.client = axios.create({
      baseURL: 'https://open.feishu.cn/open-apis',
      timeout: 30000,
    });
    await this.refreshAccessToken();
    console.log('✅ 飞书连接成功');
  }

  async validateConnection(): Promise<boolean> {
    if (!this.client || !this.accessToken) {
      return false;
    }
    try {
      await this.client.get('/drive/v1/files', {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      return true;
    } catch {
      return false;
    }
  }

  // 获取待发布的记录
  async fetchPendingRecords(): Promise<PublishTask[]> {
    if (!this.client || !this.config) {
      throw new Error('飞书未连接');
    }

    try {
      // 获取表格列表
      const tablesRes = await this.client.get(
        `/bitable/v1/apps/${this.config.tableId}/tables`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );
      
      const tables = tablesRes.data.data?.items || [];
      if (tables.length === 0) {
        console.warn('未找到表格');
        return [];
      }

      const tableId = tables[0].table_id;
      console.log(`📋 读取表格: ${tableId}`);


      // 获取记录
      const recordsRes = await this.client.get(
        `/bitable/v1/apps/${this.config.tableId}/tables/${tableId}/records`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );

      const records = recordsRes.data.data?.items || [];
      console.log(`📖 共 ${records.length} 条记录`);

      const tasks: PublishTask[] = [];
      
      for (const record of records) {
        const task = await this.parseRecord(record);
        if (task) {
          tasks.push(task);
        }
      }

      console.log(`✅ 待发布: ${tasks.length} 条`);
      return tasks;
    } catch (error) {
      console.error('读取记录失败:', error);
      throw error;
    }
  }

  // 解析单条记录
  private async parseRecord(record: any): Promise<PublishTask | null> {
    try {
      const fields = record.fields || {};
      
      // 只处理状态为"待发布"的记录
      const status = this.getTextValue(fields['状态']);
      if (status !== '待发布') {
        return null;
      }

      const title = this.getTextValue(fields['小红书标题']);
      const content = this.getTextValue(fields['小红书文案']);
      
      if (!title || !content) {
        console.warn(`记录 ${record.record_id} 缺少标题或文案，跳过`);
        return null;
      }

      // 下载图片
      const images = await this.downloadAttachments(fields['小红书封面'], record.record_id);

      return {
        id: record.record_id,
        title,
        content,
        coverImage: images.length > 0 ? images[0] : '',
        images,
        topic: this.getTextValue(fields['主题']) || '',
        status: 'pending',
        scheduledTime: fields['定时时间'] ? new Date(fields['定时时间']) : new Date(),
        createdTime: fields['生成时间'] ? new Date(fields['生成时间']) : new Date(),
        targetAccount: this.getTextValue(fields['目标账号']) || 'default',
        productId: this.getTextValue(fields['商品ID']),
        minPages: fields['最少页数'],
        maxPages: fields['最多页数'],
        parentRecordId: this.getTextValue(fields['父记录']),
      };
    } catch (error) {
      console.error('解析记录出错:', error);
      return null;
    }
  }

  // 获取文本值
  private getTextValue(field: any): string {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (Array.isArray(field) && field.length > 0) {
      if (typeof field[0] === 'object' && field[0].text) {
        return field[0].text;
      }
      return String(field[0]);
    }
    if (typeof field === 'object' && field.text) {
      return field.text;
    }
    return String(field);
  }

  // 下载附件
  private async downloadAttachments(attachments: any, recordId: string): Promise<string[]> {
    if (!attachments || !Array.isArray(attachments)) return [];
    
    const downloadedPaths: string[] = [];
    
    for (let i = 0; i < attachments.length; i++) {
      const attachment = attachments[i];
      if (!attachment.file_token) continue;
      
      try {
        const filePath = path.join(this.imageDir, `${recordId}_${i}.png`);
        
        const response = await this.client!.get(
          `/drive/v1/medias/${attachment.file_token}/download`,
          {
            headers: { Authorization: `Bearer ${this.accessToken}` },
            responseType: 'arraybuffer',
          }
        );
        
        fs.writeFileSync(filePath, response.data);
        downloadedPaths.push(filePath);
        console.log(`📥 下载图片: ${filePath}`);
      } catch (error) {
        console.error(`下载附件失败:`, error);
      }
    }
    
    return downloadedPaths;
  }

  // 刷新访问令牌
  private async refreshAccessToken(): Promise<void> {
    if (!this.client || !this.config) {
      throw new Error('飞书未连接');
    }

    const response = await this.client.post('/auth/v3/tenant_access_token/internal', {
      app_id: this.config.appId,
      app_secret: this.config.appSecret,
    });

    this.accessToken = response.data.tenant_access_token;
  }

  // 兼容旧方法
  async fetchRecords(): Promise<PublishTask[]> {
    return this.fetchPendingRecords();
  }

  async fetchRecordById(recordId: string): Promise<PublishTask> {
    throw new Error('Not implemented');
  }
}
