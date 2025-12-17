import Store from 'electron-store';
import crypto from 'crypto';
import { Config, FeishuConfig, XhsAccount } from '../../types';

export class ConfigManager {
  private store: Store<Config>;
  private encryptionKey: string;

  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    this.store = new Store<Config>({
      name: 'config',
      defaults: {
        feishu: {
          appId: '',
          appSecret: '',
          tableId: '',
        },
        xhsAccounts: [],
        publishInterval: 30,
        expiredTaskBehavior: 'publish',
      },
    });
  }

  // Feishu Config
  setFeishuConfig(appId: string, appSecret: string, tableId: string): void {
    this.store.set('feishu', { appId, appSecret, tableId });
  }

  getFeishuConfig(): FeishuConfig {
    return this.store.get('feishu');
  }

  validateFeishuConfig(): boolean {
    const config = this.getFeishuConfig();
    return !!(config.appId && config.appSecret && config.tableId);
  }

  // XHS Account Management
  addXhsAccount(account: XhsAccount): void {
    const accounts = this.store.get('xhsAccounts') || [];
    const encryptedAccount = this.encryptAccount(account);
    accounts.push(encryptedAccount);
    this.store.set('xhsAccounts', accounts);
  }

  removeXhsAccount(accountId: string): void {
    const accounts = this.store.get('xhsAccounts') || [];
    const filtered = accounts.filter((acc) => acc.id !== accountId);
    this.store.set('xhsAccounts', filtered);
  }

  getXhsAccounts(): XhsAccount[] {
    const accounts = this.store.get('xhsAccounts') || [];
    return accounts.map((acc) => this.decryptAccount(acc));
  }

  getXhsAccount(accountId: string): XhsAccount | null {
    const accounts = this.getXhsAccounts();
    return accounts.find((acc) => acc.id === accountId) || null;
  }

  // Publish Settings
  setPublishInterval(seconds: number): void {
    this.store.set('publishInterval', seconds);
  }

  getPublishInterval(): number {
    return this.store.get('publishInterval') || 30;
  }

  setExpiredTaskBehavior(behavior: 'publish' | 'skip'): void {
    this.store.set('expiredTaskBehavior', behavior);
  }

  getExpiredTaskBehavior(): 'publish' | 'skip' {
    return this.store.get('expiredTaskBehavior') || 'publish';
  }

  // Config Persistence
  saveConfig(): Promise<void> {
    return Promise.resolve();
  }

  loadConfig(): Promise<void> {
    return Promise.resolve();
  }

  getConfig(): Config {
    return {
      feishu: this.getFeishuConfig(),
      xhsAccounts: this.getXhsAccounts(),
      publishInterval: this.getPublishInterval(),
      expiredTaskBehavior: this.getExpiredTaskBehavior(),
    };
  }

  setConfig(config: Partial<Config>): void {
    if (config.feishu) {
      this.setFeishuConfig(config.feishu.appId, config.feishu.appSecret, config.feishu.tableId);
    }
    if (config.publishInterval !== undefined) {
      this.setPublishInterval(config.publishInterval);
    }
    if (config.expiredTaskBehavior) {
      this.setExpiredTaskBehavior(config.expiredTaskBehavior);
    }
  }

  // Encryption/Decryption
  private encryptAccount(account: XhsAccount): XhsAccount {
    const encrypted = { ...account };
    if (account.password) {
      encrypted.password = this.encrypt(account.password);
    }
    if (account.cookies) {
      encrypted.cookies = this.encrypt(account.cookies);
    }
    return encrypted;
  }

  private decryptAccount(account: XhsAccount): XhsAccount {
    const decrypted = { ...account };
    if (account.password) {
      decrypted.password = this.decrypt(account.password);
    }
    if (account.cookies) {
      decrypted.cookies = this.decrypt(account.cookies);
    }
    return decrypted;
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.padEnd(32)), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(text: string): string {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.padEnd(32)), iv);
    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
