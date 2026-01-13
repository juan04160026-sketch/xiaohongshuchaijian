import { net } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PublishTask, FeishuConfig } from '../../types';

export class FeishuReader {
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

  // 使用 Electron net 模块发送请求（自动使用系统代理）
  private makeRequest(url: string, options: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = net.request({
        method: options.method || 'GET',
        url: url,
      });

      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          request.setHeader(key, value as string);
        });
      }

      const chunks: Buffer[] = [];

      request.on('response', (response: any) => {
        response.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        response.on('end', () => {
          const data = Buffer.concat(chunks);
          if (options.responseType === 'arraybuffer') {
            resolve({ data, status: response.statusCode });
          } else {
            try {
              resolve({ data: JSON.parse(data.toString()), status: response.statusCode });
            } catch {
              resolve({ data: data.toString(), status: response.statusCode });
            }
          }
        });
      });

      request.on('error', (error: Error) => {
        reject(error);
      });

      if (options.body) {
        request.setHeader('Content-Type', 'application/json');
        request.write(JSON.stringify(options.body));
      }

      request.end();
    });
  }

  async connect(config: FeishuConfig): Promise<void> {
    this.config = config;
    await this.refreshAccessToken();
    console.log('✅ 飞书连接成功');
  }

  async validateConnection(): Promise<boolean> {
    if (!this.accessToken) {
      return false;
    }
    try {
      await this.makeRequest('https://open.feishu.cn/open-apis/drive/v1/files', {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      return true;
    } catch {
      return false;
    }
  }


  // 获取待发布的记录
  async fetchPendingRecords(): Promise<PublishTask[]> {
    if (!this.config) {
      throw new Error('飞书未连接');
    }

    try {
      // 获取表格列表
      const tablesRes = await this.makeRequest(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.config.tableId}/tables`,
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
      const recordsRes = await this.makeRequest(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.config.tableId}/tables/${tableId}/records`,
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

  // 获取所有状态为"待生成"的记录（用于 AI 生成）
  async fetchRecordsForGeneration(): Promise<Array<{id: string, topic: string}>> {
    if (!this.config) {
      throw new Error('飞书未连接');
    }

    try {
      // 获取表格列表
      const tablesRes = await this.makeRequest(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.config.tableId}/tables`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );
      
      const tables = tablesRes.data.data?.items || [];
      if (tables.length === 0) {
        console.warn('未找到表格');
        return [];
      }

      const tableId = tables[0].table_id;
      console.log(`📋 读取表格用于AI生成: ${tableId}`);

      // 获取记录
      const recordsRes = await this.makeRequest(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${this.config.tableId}/tables/${tableId}/records`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );

      const records = recordsRes.data.data?.items || [];
      console.log(`📖 共 ${records.length} 条记录`);

      const result: Array<{id: string, topic: string}> = [];
      
      for (const record of records) {
        const fields = record.fields || {};
        const topic = this.getTextValue(fields['主题']);
        const status = this.getTextValue(fields['状态']);
        
        // 只处理状态为"待生成"且有主题的记录
        if (topic && topic.trim() && status === '待生成') {
          result.push({
            id: record.record_id,
            topic: topic.trim()
          });
        }
      }

      console.log(`✅ 找到 ${result.length} 条待生成的记录`);
      return result;
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
        tags: this.getTextValue(fields['标签']) || '',  // 读取标签字段
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
        
        const response = await this.makeRequest(
          `https://open.feishu.cn/open-apis/drive/v1/medias/${attachment.file_token}/download`,
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
    if (!this.config) {
      throw new Error('飞书未连接');
    }

    const response = await this.makeRequest(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      {
        method: 'POST',
        body: {
          app_id: this.config.appId,
          app_secret: this.config.appSecret,
        },
      }
    );

    this.accessToken = response.data.tenant_access_token;
  }

  // 兼容旧方法
  async fetchRecords(): Promise<PublishTask[]> {
    return this.fetchPendingRecords();
  }

  async fetchRecordById(_recordId: string): Promise<PublishTask> {
    throw new Error('Not implemented');
  }

  // 更新记录字段
  async updateRecord(
    tableId: string,
    dataTableId: string | undefined,
    recordId: string,
    fields: Record<string, any>
  ): Promise<boolean> {
    if (!this.accessToken) {
      await this.refreshAccessToken();
    }

    try {
      // 如果没有指定 dataTableId，获取第一个表
      let targetTableId = dataTableId;
      if (!targetTableId) {
        const tablesRes = await this.makeRequest(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${tableId}/tables`,
          { headers: { Authorization: `Bearer ${this.accessToken}` } }
        );
        const tables = tablesRes.data.data?.items || [];
        if (tables.length === 0) {
          throw new Error('未找到表格');
        }
        targetTableId = tables[0].table_id;
      }

      // 更新记录
      await this.makeRequest(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${tableId}/tables/${targetTableId}/records/${recordId}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${this.accessToken}` },
          body: { fields },
        }
      );

      console.log(`✅ 更新记录成功: ${recordId}`);
      return true;
    } catch (error) {
      console.error('更新记录失败:', error);
      return false;
    }
  }

  // 清空已生成的内容（将状态改回空，清空标题、文案、封面）
  async clearGeneratedContent(
    tableId: string,
    dataTableId?: string
  ): Promise<{ success: boolean; count: number; error?: string }> {
    if (!this.accessToken) {
      await this.refreshAccessToken();
    }

    try {
      // 如果没有指定 dataTableId，获取第一个表
      let targetTableId = dataTableId;
      if (!targetTableId) {
        const tablesRes = await this.makeRequest(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${tableId}/tables`,
          { headers: { Authorization: `Bearer ${this.accessToken}` } }
        );
        const tables = tablesRes.data.data?.items || [];
        if (tables.length === 0) {
          throw new Error('未找到表格');
        }
        targetTableId = tables[0].table_id;
      }

      // 获取所有状态为"已生成"的记录
      const recordsRes = await this.makeRequest(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${tableId}/tables/${targetTableId}/records`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );

      const records = recordsRes.data.data?.items || [];
      const generatedRecords = records.filter((record: any) => {
        const status = this.getTextValue(record.fields?.['状态']);
        return status === '已生成';
      });

      console.log(`📋 找到 ${generatedRecords.length} 条已生成的记录`);

      if (generatedRecords.length === 0) {
        return { success: true, count: 0 };
      }

      // 逐个清空
      let successCount = 0;
      for (const record of generatedRecords) {
        try {
          await this.makeRequest(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${tableId}/tables/${targetTableId}/records/${record.record_id}`,
            {
              method: 'PUT',
              headers: { Authorization: `Bearer ${this.accessToken}` },
              body: {
                fields: {
                  '小红书标题': '',
                  '小红书文案': '',
                  '小红书封面': [],
                  '状态': '',
                }
              },
            }
          );
          successCount++;
          console.log(`✅ 清空记录: ${record.record_id}`);
        } catch (error) {
          console.error(`❌ 清空记录失败: ${record.record_id}`, error);
        }
      }

      console.log(`✅ 清空完成: ${successCount}/${generatedRecords.length}`);
      return { success: true, count: successCount };
    } catch (error: any) {
      console.error('清空内容失败:', error);
      return { success: false, count: 0, error: error.message };
    }
  }

  // 上传图片到飞书并返回 file_token
  async uploadImage(imagePath: string): Promise<string | null> {
    if (!this.accessToken) {
      await this.refreshAccessToken();
    }

    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const fileName = path.basename(imagePath);
      const fileSize = imageBuffer.length;
      
      // 根据文件扩展名确定 MIME 类型
      const ext = path.extname(imagePath).toLowerCase();
      const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 
                      ext === '.png' ? 'image/png' : 
                      ext === '.gif' ? 'image/gif' : 
                      'image/jpeg'; // 默认

      // 创建 FormData
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      const formData: Buffer[] = [];

      // 添加 file_name 字段
      formData.push(Buffer.from(`--${boundary}\r\n`));
      formData.push(Buffer.from('Content-Disposition: form-data; name="file_name"\r\n\r\n'));
      formData.push(Buffer.from(`${fileName}\r\n`));

      // 添加 parent_type 字段
      formData.push(Buffer.from(`--${boundary}\r\n`));
      formData.push(Buffer.from('Content-Disposition: form-data; name="parent_type"\r\n\r\n'));
      formData.push(Buffer.from('bitable_image\r\n'));

      // 添加 parent_node 字段（使用 tableId）
      formData.push(Buffer.from(`--${boundary}\r\n`));
      formData.push(Buffer.from('Content-Disposition: form-data; name="parent_node"\r\n\r\n'));
      formData.push(Buffer.from(`${this.config?.tableId || ''}\r\n`));

      // 添加 size 字段
      formData.push(Buffer.from(`--${boundary}\r\n`));
      formData.push(Buffer.from('Content-Disposition: form-data; name="size"\r\n\r\n'));
      formData.push(Buffer.from(`${fileSize}\r\n`));

      // 添加文件字段
      formData.push(Buffer.from(`--${boundary}\r\n`));
      formData.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`));
      formData.push(Buffer.from(`Content-Type: ${mimeType}\r\n\r\n`));
      formData.push(imageBuffer);
      formData.push(Buffer.from('\r\n'));

      // 结束边界
      formData.push(Buffer.from(`--${boundary}--\r\n`));

      const body = Buffer.concat(formData);

      // 使用 net 模块上传
      return new Promise((resolve, reject) => {
        const request = net.request({
          method: 'POST',
          url: 'https://open.feishu.cn/open-apis/drive/v1/medias/upload_all',
        });

        request.setHeader('Authorization', `Bearer ${this.accessToken}`);
        request.setHeader('Content-Type', `multipart/form-data; boundary=${boundary}`);

        const chunks: Buffer[] = [];

        request.on('response', (response: any) => {
          response.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
          });
          response.on('end', () => {
            try {
              const data = JSON.parse(Buffer.concat(chunks).toString());
              if (data.code === 0 && data.data?.file_token) {
                console.log(`✅ 图片上传成功: ${data.data.file_token}`);
                resolve(data.data.file_token);
              } else {
                console.error('图片上传失败:', data);
                resolve(null);
              }
            } catch (error) {
              console.error('解析上传响应失败:', error);
              resolve(null);
            }
          });
        });

        request.on('error', (error: Error) => {
          console.error('图片上传请求失败:', error);
          reject(error);
        });

        request.write(body);
        request.end();
      });
    } catch (error) {
      console.error('上传图片失败:', error);
      return null;
    }
  }
}
