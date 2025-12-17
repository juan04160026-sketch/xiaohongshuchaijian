// 侧边栏面板控制脚本

// 当扩展图标被点击时，打开侧边栏
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// 在所有页面上都可以打开侧边栏
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openSidePanel') {
    chrome.sidePanel.open({ tabId: sender.tab.id });
    sendResponse({ success: true });
  }
});

console.log('✅ 侧边栏面板已初始化');
