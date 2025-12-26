// Task Status
export type TaskStatus = 'pending' | 'processing' | 'published' | 'failed' | 'expired';

// Publish Task
export interface PublishTask {
  id: string;
  title: string;
  content: string;
  coverImage: string;
  images?: string[];
  topic: string;
  tags?: string;  // 话题标签字段，如 "#小红书 #穿搭"
  status: TaskStatus;
  scheduledTime: Date;
  createdTime: Date;
  targetAccount: string;
  productId?: string;
  minPages?: number;
  maxPages?: number;
  parentRecordId?: string;
  publishedTime?: Date;
  publishedUrl?: string;
  errorMessage?: string;
  // 比特浏览器多账号支持
  windowId?: string;      // 比特浏览器窗口 ID
  windowName?: string;    // 窗口名称（用于显示）
}

// 比特浏览器窗口配置
export interface BitBrowserWindow {
  id: string;
  name: string;
  remark?: string;
  groupId?: string;
  groupName?: string;
  feishuTableId?: string;  // 关联的飞书表格ID
}

// 窗口与飞书表格的映射配置
export interface WindowTableMapping {
  windowId: string;
  windowName: string;
  feishuTableId: string;      // 飞书多维表格 Base ID (app_token)
  feishuDataTableId?: string; // 飞书数据表 Table ID (tbl开头)，可选，不填则使用第一个表
  feishuTableName?: string;
}

// 窗口发布状态
export interface WindowPublishState {
  windowId: string;
  windowName: string;
  feishuTableId: string;
  feishuTableName?: string;
  tasks: PublishTask[];
  status: 'idle' | 'loading' | 'publishing' | 'paused' | 'completed' | 'error';
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  errorMessage?: string;
}

// XHS Account
export interface XhsAccount {
  id: string;
  username: string;
  password: string;
  cookies?: string;
  isValid: boolean;
  lastValidated: Date;
  createdTime: Date;
}

// Feishu Config
export interface FeishuConfig {
  appId: string;
  appSecret: string;
  tableId: string;
}

// Publish Result
export interface PublishResult {
  taskId: string;
  success: boolean;
  contentId?: string;
  contentUrl?: string;
  publishedTime: Date;
  duration: number;
  errorMessage?: string;
}

// Log
export interface Log {
  id: string;
  timestamp: Date;
  taskId: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  metadata?: any;
}

// Log Filter
export interface LogFilter {
  taskId?: string;
  level?: 'info' | 'warn' | 'error';
  startTime?: Date;
  endTime?: Date;
}

// Validation Result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// 浏览器类型
export type BrowserType = 'chrome' | 'bitbrowser';

// 图片来源类型
export type ImageSourceType = 'local' | 'feishu' | 'text2image';

// 比特浏览器配置
export interface BitBrowserConfig {
  apiUrl: string;           // API 地址，默认 http://127.0.0.1:54345
  enabled: boolean;         // 是否启用比特浏览器
  publishMode: 'serial' | 'parallel';  // 发布模式：串行/并行
  maxConcurrent: number;    // 并行发布时的最大并发数
}

// 谷歌浏览器配置
export interface ChromeConfig {
  executablePath?: string;  // Chrome 可执行文件路径（可选，自动检测）
  userDataDir?: string;     // 用户数据目录（用于保持登录状态）
  headless?: boolean;       // 是否无头模式
}

// Config
export interface Config {
  feishu: FeishuConfig;
  xhsAccounts: XhsAccount[];
  publishInterval: number;
  expiredTaskBehavior: 'publish' | 'skip';
  imageDir?: string;  // 本地图片目录路径
  browserType?: BrowserType;  // 浏览器类型：chrome 或 bitbrowser
  imageSource?: ImageSourceType;  // 图片来源：local 本地合成 或 feishu 飞书图片
  bitBrowser?: BitBrowserConfig;  // 比特浏览器配置
  chrome?: ChromeConfig;  // 谷歌浏览器配置
  windowTableMappings?: WindowTableMapping[];  // 窗口与飞书表格的映射
}
