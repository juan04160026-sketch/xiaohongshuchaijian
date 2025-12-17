import { app, Tray, Menu, BrowserWindow } from 'electron';
import path from 'path';

export class TrayManager {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow | null = null;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  createTray(): void {
    // Create tray icon
    const iconPath = path.join(__dirname, '../../assets/icon.png');
    this.tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.show();
            this.mainWindow.focus();
          }
        },
      },
      {
        label: '隐藏',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.hide();
          }
        },
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip('小红书自动发布插件');

    // Double click to show window
    this.tray.on('double-click', () => {
      if (this.mainWindow) {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });
  }

  updateTrayStatus(status: 'idle' | 'running' | 'paused'): void {
    if (!this.tray) return;

    const statusMap: Record<string, string> = {
      idle: '待命',
      running: '运行中',
      paused: '已暂停',
    };

    this.tray.setToolTip(`小红书自动发布插件 - ${statusMap[status]}`);
  }

  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
