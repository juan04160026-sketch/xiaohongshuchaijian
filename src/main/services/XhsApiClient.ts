import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { PublishTask, XhsAccount, PublishResult } from '../../types';

export class XhsApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private account: XhsAccount | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://edith.xiaohongshu.com',
      timeout: 30000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
  }

  async login(account: XhsAccount): Promise<boolean> {
    try {
      this.account = account;

      // 登录请求
      const loginResponse = await this.client.post('/user/login', {
        email: account.username,
        password: account.password,
      });

      if (loginResponse.data.success) {
        this.accessToken = loginResponse.data.data.access_token;
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }

  async publish(task: PublishTask): Promise<PublishResult> {
    if (!this.accessToken) {
      throw new Error('Not logged in');
    }

    const startTime = Date.now();

    try {
      // 上传图片
      let imageUrl = task.coverImage;
      if (task.coverImage && task.coverImage.startsWith('http')) {
        imageUrl = await this.uploadImage(task.coverImage);
      }

      // 创建笔记
      const noteData = {
        title: task.title,
        desc: task.content,
        type: 'normal',
        interact_info: {
          liked: false,
          collected: false,
          commented: false,
        },
        image_list: [
          {
            url: imageUrl,
            height: 1080,
            width: 1080,
          },
        ],
        tag_list: task.topic ? [{ name: task.topic }] : [],
      };

      const publishResponse = await this.client.post('/note/create', noteData, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (publishResponse.data.success) {
        const noteId = publishResponse.data.data.note_id;
        const contentUrl = `https://www.xiaohongshu.com/explore/${noteId}`;

        return {
          taskId: task.id,
          success: true,
          contentId: noteId,
          contentUrl,
          publishedTime: new Date(),
          duration: Date.now() - startTime,
        };
      }

      throw new Error('Failed to create note');
    } catch (error) {
      throw new Error(`Publish failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async uploadImage(imageUrl: string): Promise<string> {
    try {
      // 下载图片
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const tempDir = path.join(process.env.APPDATA || '.', 'xiaohongshu-auto-publish', 'temp');

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const imagePath = path.join(tempDir, `image_${Date.now()}.jpg`);
      fs.writeFileSync(imagePath, response.data);

      // 上传到小红书
      const formData = new FormData();
      formData.append('file', fs.createReadStream(imagePath));

      const uploadResponse = await this.client.post('/upload/image', formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      // 清理临时文件
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      if (uploadResponse.data.success) {
        return uploadResponse.data.data.url;
      }

      throw new Error('Failed to upload image');
    } catch (error) {
      throw new Error(`Image upload failed: ${error}`);
    }
  }

  async checkLogin(): Promise<boolean> {
    if (!this.accessToken) {
      return false;
    }

    try {
      const response = await this.client.get('/user/profile', {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      return response.data.success;
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    this.accessToken = null;
    this.account = null;
  }
}
