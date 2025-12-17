// 后台服务 Worker - Chrome Extension MV3
let isPublishing = false;
let isPaused = false;
let stats = { pending: 0, published: 0, failed: 0 };
let logs = [];
let publishQueue = [];
let startTime = null;
let currentTaskIndex = 0;

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startPublish') {
    startPublish().then(() => sendResponse({ success: true })).catch(err => 
      sendResponse({ success: false, error: err.message })
    );
    return true; // 异步响应
  } else if (request.action === 'pausePublish') {
    isPaused = true;
    sendResponse({ success: true });
  } else if (request.action === 'stopPublish') {
    isPublishing = false;
    isPaused = false;
    sendResponse({ success: true });
  }
});

// 开始发布
async function startPublish() {
  if (isPublishing) return;
  
  isPublishing = true;
  isPaused = false;
  startTime = Date.now();
  currentTaskIndex = 0;
  
  try {
    // 获取配置
    const config = await chrome.storage.sync.get(['feishuAppId', 'feishuAppSecret', 'feishuTableId']);

    if (!config.feishuAppId || !config.feishuAppSecret || !config.feishuTableId) {
      addLog('error', '❌ 未配置飞书 API 凭证，请先在配置标签中填写');
      isPublishing = false;
      return;
    }

    addLog('info', '🚀 开始从飞书读取数据...');

    // 从飞书读取数据
    const tasks = await fetchFromFeishu(config);
    publishQueue = tasks;
    stats.pending = tasks.length;
    stats.published = 0;
    stats.failed = 0;
    updateStats();

    if (tasks.length === 0) {
      addLog('warn', '⚠️ 没有找到待发布的内容（状态应为 "pending" 或 "待发布"）');
      isPublishing = false;
      return;
    }

    addLog('success', `✅ 读取到 ${tasks.length} 条待发布内容`);
    addLog('info', `📋 内容列表: ${tasks.map(t => `"${t.title}"`).join(', ')}`);

    // 发布每条内容
    for (let i = 0; i < tasks.length; i++) {
      if (!isPublishing) {
        addLog('warn', '⏹️ 发布已停止');
        break;
      }
      
      // 处理暂停
      let pauseTime = 0;
      while (isPaused) {
        if (pauseTime === 0) {
          addLog('warn', '⏸️ 发布已暂停');
        }
        pauseTime++;
        await sleep(1000);
      }
      if (pauseTime > 0) {
        addLog('info', `▶️ 发布已恢复 (暂停了 ${pauseTime}s)`);
      }

      const task = tasks[i];
      currentTaskIndex = i + 1;
      
      try {
        addLog('info', `📤 [${i + 1}/${tasks.length}] 正在发布: "${task.title}" (耗时: ${getElapsedTime()})`);
        
        // 通过 content script 发布
        await publishViaContentScript(task);
        
        stats.published++;
        stats.pending--;
        addLog('success', `✅ 发布成功: "${task.title}" (进度: ${stats.published}/${tasks.length})`);
      } catch (error) {
        stats.failed++;
        stats.pending--;
        addLog('error', `❌ 发布失败: "${task.title}" - ${error.message}`);
      }

      updateStats();
      
      // 发布间隔 30 秒
      if (i < tasks.length - 1) {
        addLog('info', `⏳ 等待 30 秒后发布下一条...`);
        await sleep(30000);
      }
    }

    const totalTime = getElapsedTime();
    addLog('success', `🎉 发布完成！总耗时: ${totalTime}`);
    addLog('info', `📊 最终统计: 成功=${stats.published}, 失败=${stats.failed}, 总计=${tasks.length}`);
    isPublishing = false;
  } catch (error) {
    addLog('error', `💥 发布过程出错: ${error.message}`);
    isPublishing = false;
  }
}

// 通过 Playwright 发布（使用 IPC 通信）
async function publishViaPlaywright(task) {
  try {
    addLog('info', '🎬 使用 Playwright 发布...');
    
    // 发送消息给主进程（Electron）
    // 如果是在 Chrome Extension 中，则使用原有的方法
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      // Chrome Extension 环境
      addLog('info', '📱 Chrome Extension 环境，使用原有方法');
      await publishViaContentScript(task);
    } else {
      // Electron 环境
      addLog('info', '🖥️ Electron 环境，使用 Playwright');
      // 这里会由 Electron 主进程处理
      throw new Error('请在 Electron 环境中运行');
    }
  } catch (error) {
    throw error;
  }
}

// 通过 content script 发布（备选方案）
async function publishViaContentScript(task) {
  // 获取当前活跃的小红书标签页
  const tabs = await chrome.tabs.query({ 
    url: ['https://www.xiaohongshu.com/*', 'https://creator.xiaohongshu.com/*'],
    active: true
  });

  let targetTab = tabs[0];

  // 如果没有活跃的小红书标签页，打开创建页面
  if (!targetTab) {
    addLog('info', '📱 没有找到活跃的小红书页面，正在打开发布页面...');
    targetTab = await chrome.tabs.create({ 
      url: 'https://creator.xiaohongshu.com/publish/publish?source=official&from=menu&target=image',
      active: true 
    });
    // 等待页面加载（增加等待时间）
    addLog('info', '⏳ 等待页面加载...');
    await sleep(5000);
  } else {
    addLog('info', '📱 在当前小红书页面上发布');
    // 导航到发布页面
    await chrome.tabs.update(targetTab.id, { 
      url: 'https://creator.xiaohongshu.com/publish/publish?source=official&from=menu&target=image' 
    });
    addLog('info', '⏳ 等待页面加载...');
    await sleep(5000);
  }

  try {
    // 使用 MV3 API 执行脚本
    const result = await chrome.scripting.executeScript({
      target: { tabId: targetTab.id },
      function: publishContent,
      args: [task]
    });

    if (!result || !result[0]?.result?.success) {
      throw new Error(result?.[0]?.result?.error || '发布失败');
    }

    // 等待发布完成
    addLog('info', '⏳ 等待发布完成...');
    await sleep(8000);
  } catch (error) {
    throw error;
  }
}

// 在页面中执行的发布函数
function publishContent(task) {
  try {
    console.log('📝 开始填写内容:', task.title);

    // 方法 1: 查找标题输入框
    let titleInput = document.querySelector('input[placeholder*="标题"]') || 
                     document.querySelector('input[placeholder*="title"]') ||
                     document.querySelector('input[placeholder*="请输入标题"]') ||
                     document.querySelector('input[type="text"]');
    
    if (titleInput) {
      titleInput.focus();
      titleInput.value = task.title;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      titleInput.dispatchEvent(new Event('change', { bubbles: true }));
      titleInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
      titleInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
      console.log('✅ 标题已填写:', task.title);
    } else {
      console.warn('⚠️ 未找到标题输入框');
    }

    // 等待一下，让页面响应
    setTimeout(() => {}, 500);

    // 方法 2: 查找文案编辑器
    let contentEditor = document.querySelector('[contenteditable="true"]');
    
    if (contentEditor) {
      contentEditor.focus();
      contentEditor.innerHTML = task.content.replace(/\n/g, '<br>');
      contentEditor.textContent = task.content;
      contentEditor.dispatchEvent(new Event('input', { bubbles: true }));
      contentEditor.dispatchEvent(new Event('change', { bubbles: true }));
      contentEditor.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
      contentEditor.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
      console.log('✅ 文案已填写');
    } else {
      console.warn('⚠️ 未找到文案编辑器');
    }

    // 等待一下，让页面响应
    setTimeout(() => {}, 500);

    // 方法 3: 查找发布按钮
    let publishBtn = null;
    
    // 尝试多种方式查找发布按钮
    const buttons = Array.from(document.querySelectorAll('button'));
    publishBtn = buttons.find(btn => {
      const text = btn.textContent.trim();
      return text === '发布' || 
             text.includes('发布') || 
             text.includes('Publish') ||
             text.includes('发表') ||
             btn.getAttribute('aria-label')?.includes('发布');
    });

    if (!publishBtn) {
      // 尝试查找 class 包含 publish 的按钮
      publishBtn = document.querySelector('[class*="publish"], [class*="Publish"]');
    }

    if (!publishBtn) {
      // 尝试查找 aria-label 包含发布的按钮
      publishBtn = document.querySelector('[aria-label*="发布"], [aria-label*="publish"]');
    }

    if (!publishBtn) {
      console.error('❌ 找不到发布按钮');
      console.log('页面上的所有按钮:', buttons.map(b => b.textContent.trim()));
      return { success: false, error: '找不到发布按钮' };
    }

    console.log('✅ 找到发布按钮:', publishBtn.textContent.trim());
    console.log('准备点击发布按钮...');
    
    // 点击发布按钮
    publishBtn.click();
    
    console.log('✅ 发布按钮已点击');
    return { success: true };
  } catch (error) {
    console.error('❌ 发布失败:', error.message);
    console.error('错误堆栈:', error.stack);
    return { success: false, error: error.message };
  }
}

// 从飞书读取数据
async function fetchFromFeishu(config) {
  try {
    // 第一步：获取 tenant_access_token
    addLog('info', '🔐 正在获取飞书 token...');
    const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: config.feishuAppId,
        app_secret: config.feishuAppSecret,
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`HTTP ${tokenResponse.status}: 获取飞书 token 失败`);
    }

    const tokenData = await tokenResponse.json();
    if (tokenData.code !== 0) {
      throw new Error(`飞书 API 错误 (${tokenData.code}): ${tokenData.msg}`);
    }

    addLog('success', '✅ Token 获取成功');
    const accessToken = tokenData.tenant_access_token;

    // 第二步：读取多维表格数据
    addLog('info', '📚 正在读取表格列表...');
    const tableResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.feishuTableId}/tables`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      }
    );

    if (!tableResponse.ok) {
      throw new Error(`HTTP ${tableResponse.status}: 读取飞书表格失败`);
    }

    const tableData = await tableResponse.json();
    if (tableData.code !== 0) {
      throw new Error(`飞书 API 错误 (${tableData.code}): ${tableData.msg}`);
    }

    // 获取第一个表格的 ID
    const tables = tableData.data?.items || [];
    if (tables.length === 0) {
      throw new Error('Base 中没有找到任何表格');
    }

    const tableId = tables[0].table_id;
    addLog('success', `✅ 找到 ${tables.length} 个表格，使用第一个: "${tables[0].name}"`);

    // 第三步：读取表格记录
    addLog('info', '📖 正在读取表格记录...');
    const recordsResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.feishuTableId}/tables/${tableId}/records`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      }
    );

    if (!recordsResponse.ok) {
      throw new Error(`HTTP ${recordsResponse.status}: 读取表格记录失败`);
    }

    const recordsData = await recordsResponse.json();
    if (recordsData.code !== 0) {
      throw new Error(`飞书 API 错误 (${recordsData.code}): ${recordsData.msg}`);
    }

    const allRecords = recordsData.data?.items || [];
    addLog('info', `📊 总共读取 ${allRecords.length} 条记录`);

    // 转换为任务格式
    const tasks = allRecords.map(item => ({
      id: item.record_id,
      title: item.fields['小红书标题'] || '',
      content: item.fields['小红书文案'] || '',
      coverImage: item.fields['小红书封面'] || '',
      topic: item.fields['主题'] || '',
      status: item.fields['状态'] || 'pending',
      scheduledTime: item.fields['定时时间'] || null,
    })).filter(task => task.status === 'pending' || task.status === '待发布');

    addLog('info', `🔍 筛选出 ${tasks.length} 条待发布内容 (状态为 "pending" 或 "待发布")`);
    
    return tasks;
  } catch (error) {
    throw new Error(`读取飞书数据失败: ${error.message}`);
  }
}

// 辅助函数
function addLog(level, message) {
  const now = new Date();
  const log = {
    timestamp: now.toISOString(),
    level,
    message,
    time: now.toLocaleTimeString('zh-CN')
  };
  
  logs.push(log);
  if (logs.length > 200) {
    logs.shift();
  }

  // 同时输出到浏览器控制台
  const consoleStyle = {
    'info': 'color: #1890ff; font-weight: bold;',
    'success': 'color: #52c41a; font-weight: bold;',
    'warn': 'color: #faad14; font-weight: bold;',
    'error': 'color: #f5222d; font-weight: bold;'
  };
  
  console.log(`%c[${log.time}] ${level.toUpperCase()}: ${message}`, consoleStyle[level] || '');
  
  chrome.storage.local.set({ logs });
}

function updateStats() {
  chrome.storage.local.set({ stats });
  
  // 输出统计信息到控制台
  console.log(`📊 统计: 待发布=${stats.pending}, 已发布=${stats.published}, 失败=${stats.failed}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getElapsedTime() {
  if (!startTime) return '0s';
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  if (elapsed < 60) return `${elapsed}s`;
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return `${minutes}m${seconds}s`;
}

// 初始化
chrome.storage.local.set({ stats, logs });
addLog('info', '✅ 后台服务已启动');
