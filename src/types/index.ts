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
  feishuTableId: string;
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

// 比特浏览器配置
export interface BitBrowserConfig {
  apiUrl: string;           // API 地址，默认 http://127.0.0.1:54345
  enabled: boolean;         // 是否启用比特浏览器
  publishMode: 'serial' | 'parallel';  // 发布模式：串行/并行
  maxConcurrent: number;    // 并行发布时的最大并发数
}

// Config
export interface Config {
  feishu: FeishuConfig;
  xhsAccounts: XhsAccount[];
  publishInterval: number;
  expiredTaskBehavior: 'publish' | 'skip';
  imageDir?: string;  // 本地图片目录路径
  bitBrowser?: BitBrowserConfig;  // 比特浏览器配置
  windowTableMappings?: WindowTableMapping[];  // 窗口与飞书表格的映射
}
