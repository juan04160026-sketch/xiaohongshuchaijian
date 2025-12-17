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

// Config
export interface Config {
  feishu: FeishuConfig;
  xhsAccounts: XhsAccount[];
  publishInterval: number;
  expiredTaskBehavior: 'publish' | 'skip';
  imageDir?: string;  // 本地图片目录路径
}
