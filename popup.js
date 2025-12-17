// 标签切换
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    
    // 移除所有活跃状态
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    // 添加活跃状态
    btn.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    // 保存当前标签选择
    chrome.storage.local.set({ activeTab: tabName });
  });
});

// 恢复上次选择的标签
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['activeTab'], (result) => {
    if (result.activeTab) {
      const btn = document.querySelector(`[data-tab="${result.activeTab}"]`);
      if (btn) {
        btn.click();
      }
    }
  });
});

// 保存配置
document.getElementById('saveConfig').addEventListener('click', () => {
  const config = {
    feishuAppId: document.getElementById('feishuAppId').value.trim(),
    feishuAppSecret: document.getElementById('feishuAppSecret').value.trim(),
    feishuTableId: document.getElementById('feishuTableId').value.trim(),
    imageDir: document.getElementById('imageDir').value.trim(),
  };

  if (!config.feishuAppId || !config.feishuAppSecret || !config.feishuTableId) {
    showMessage('configMessage', '请填写飞书配置项', 'error');
    return;
  }

  chrome.storage.sync.set(config, () => {
    showMessage('configMessage', '配置保存成功', 'success');
  });
});

// 测试连接
document.getElementById('testConfig').addEventListener('click', async () => {
  const config = {
    feishuAppId: document.getElementById('feishuAppId').value.trim(),
    feishuAppSecret: document.getElementById('feishuAppSecret').value.trim(),
    feishuTableId: document.getElementById('feishuTableId').value.trim(),
  };

  if (!config.feishuAppId || !config.feishuAppSecret || !config.feishuTableId) {
    showMessage('configMessage', '❌ 请先填写所有配置项', 'error');
    return;
  }

  // 验证 Base ID 或 Table ID 格式
  if (!config.feishuTableId.match(/^[a-zA-Z0-9]{20,}$/)) {
    showMessage('configMessage', '❌ Base ID 格式错误，应该是 20+ 个字母和数字（如：GGh2bW3Q2aHpi1shiVqcAlhmnMd）', 'error');
    return;
  }

  const testBtn = document.getElementById('testConfig');
  testBtn.disabled = true;
  testBtn.textContent = '测试中...';

  try {
    showMessage('configMessage', '🔄 正在测试连接...', 'info');

    // 测试 Token 获取
    console.log('%c📝 测试 1: 获取 Token...', 'font-weight: bold; color: #1890ff;');
    console.log('App ID:', config.feishuAppId);
    console.log('App Secret:', config.feishuAppSecret.substring(0, 5) + '***');
    
    const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: config.feishuAppId,
        app_secret: config.feishuAppSecret,
      })
    });

    console.log('Token 响应状态:', tokenResponse.status);
    
    if (!tokenResponse.ok) {
      throw new Error(`HTTP ${tokenResponse.status}: 网络请求失败，请检查网络连接或飞书服务是否可用`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token 响应数据:', tokenData);
    
    if (tokenData.code !== 0) {
      const errorMsg = getFeishuErrorMessage(tokenData.code, tokenData.msg);
      throw new Error(`Token 获取失败 (${tokenData.code}): ${errorMsg}`);
    }

    console.log('%c✅ Token 获取成功', 'color: #52c41a; font-weight: bold;');
    showMessage('configMessage', '✅ Token 获取成功', 'success');
    const accessToken = tokenData.tenant_access_token;

    // 测试表格列表读取
    console.log('%c📝 测试 2: 读取表格列表...', 'font-weight: bold; color: #1890ff;');
    console.log('Base ID:', config.feishuTableId);
    
    const tableResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.feishuTableId}/tables`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    console.log('表格响应状态:', tableResponse.status);
    
    if (!tableResponse.ok) {
      throw new Error(`HTTP ${tableResponse.status}: 网络请求失败`);
    }

    const tableData = await tableResponse.json();
    console.log('表格响应数据:', tableData);
    
    if (tableData.code !== 0) {
      const errorMsg = getFeishuErrorMessage(tableData.code, tableData.msg);
      throw new Error(`表格读取失败 (${tableData.code}): ${errorMsg}`);
    }

    console.log('%c✅ 表格列表读取成功', 'color: #52c41a; font-weight: bold;');
    const tableCount = tableData.data?.items?.length || 0;
    console.log('找到', tableCount, '个表格');
    
    if (tableCount === 0) {
      showMessage('configMessage', '⚠️ 连接成功，但表格中没有数据表', 'warn');
      return;
    }

    // 测试记录读取
    console.log('%c📝 测试 3: 读取表格记录...', 'font-weight: bold; color: #1890ff;');
    const firstTableId = tableData.data.items[0].table_id;
    console.log('表格 ID:', firstTableId);
    
    const recordsResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.feishuTableId}/tables/${firstTableId}/records`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    console.log('记录响应状态:', recordsResponse.status);
    
    if (!recordsResponse.ok) {
      throw new Error(`HTTP ${recordsResponse.status}: 网络请求失败`);
    }

    const recordsData = await recordsResponse.json();
    console.log('记录响应数据:', recordsData);
    
    if (recordsData.code !== 0) {
      const errorMsg = getFeishuErrorMessage(recordsData.code, recordsData.msg);
      throw new Error(`记录读取失败 (${recordsData.code}): ${errorMsg}`);
    }

    console.log('%c✅ 记录读取成功', 'color: #52c41a; font-weight: bold;');
    const recordCount = recordsData.data?.items?.length || 0;
    console.log('找到', recordCount, '条记录');

    if (recordCount > 0) {
      console.log('%c📋 第一条记录的字段：', 'font-weight: bold;');
      const firstRecord = recordsData.data.items[0];
      Object.entries(firstRecord.fields).forEach(([key, value]) => {
        console.log(`  • ${key}: ${JSON.stringify(value).substring(0, 100)}`);
      });
    }

    showMessage('configMessage', `✅ 连接成功！找到 ${tableCount} 个表格，${recordCount} 条记录`, 'success');

  } catch (error) {
    console.error('%c❌ 测试失败:', 'color: #f5222d; font-weight: bold;', error);
    console.error('完整错误信息:', error.stack);
    showMessage('configMessage', `❌ 测试失败: ${error.message}`, 'error');
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = '测试连接';
  }
});

// 飞书错误代码解释
function getFeishuErrorMessage(code, msg) {
  const errorMap = {
    '0': '成功',
    '1': '请求参数错误 - 检查 App ID 和 App Secret 是否正确',
    '2': '权限不足 - 应用没有必要的权限',
    '4': '应用不存在 - 检查 App ID 是否正确',
    '5': '应用已禁用 - 请在飞书开放平台启用应用',
    '6': '应用未发布 - 请在飞书开放平台发布应用',
    '13': '应用权限不足 - 需要添加 bitable:app:readonly 权限',
    '91402': 'Base ID 不存在或格式错误 - 请检查 Base ID 是否正确',
    '99991001': '应用权限不足 - 请在飞书开放平台添加必要权限',
    '99991002': '应用未发布 - 请在飞书开放平台发布应用',
    '99991003': '应用已禁用 - 请检查应用状态',
    '99991004': '应用不存在 - 请检查 App ID 是否正确',
    '99991005': 'Token 已过期 - 请重新测试连接',
    '99991006': '请求过于频繁 - 请稍后再试',
  };
  
  return errorMap[code] || msg || '未知错误';
}

// 加载配置
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['feishuAppId', 'feishuAppSecret', 'feishuTableId', 'imageDir'], (result) => {
    if (result.feishuAppId) {
      document.getElementById('feishuAppId').value = result.feishuAppId;
    }
    if (result.feishuAppSecret) {
      document.getElementById('feishuAppSecret').value = result.feishuAppSecret;
    }
    if (result.feishuTableId) {
      document.getElementById('feishuTableId').value = result.feishuTableId;
    }
    if (result.imageDir) {
      document.getElementById('imageDir').value = result.imageDir;
    }
  });
});

// 开始发布
document.getElementById('startPublish').addEventListener('click', () => {
  const startBtn = document.getElementById('startPublish');
  startBtn.disabled = true;
  startBtn.textContent = '发布中...';

  chrome.runtime.sendMessage({ action: 'startPublish' }, (response) => {
    if (response && response.success) {
      showMessage('publishMessage', '开始发布', 'success');
      document.getElementById('pausePublish').disabled = false;
      document.getElementById('stopPublish').disabled = false;
    } else {
      showMessage('publishMessage', response?.error || '发布失败', 'error');
      startBtn.disabled = false;
      startBtn.textContent = '开始发布';
    }
  });
});

// 暂停发布
document.getElementById('pausePublish').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'pausePublish' }, (response) => {
    if (response && response.success) {
      showMessage('publishMessage', '已暂停', 'success');
      document.getElementById('pausePublish').disabled = true;
      document.getElementById('startPublish').disabled = false;
      document.getElementById('startPublish').textContent = '继续发布';
    }
  });
});

// 停止发布
document.getElementById('stopPublish').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'stopPublish' }, (response) => {
    if (response && response.success) {
      showMessage('publishMessage', '已停止', 'success');
      document.getElementById('startPublish').disabled = false;
      document.getElementById('startPublish').textContent = '开始发布';
      document.getElementById('pausePublish').disabled = true;
      document.getElementById('stopPublish').disabled = true;
    }
  });
});

// 清空日志
document.getElementById('clearLogs').addEventListener('click', () => {
  if (confirm('确定要清空所有日志吗？')) {
    chrome.storage.local.set({ logs: [] }, () => {
      document.getElementById('logsList').innerHTML = '';
      showMessage('publishMessage', '日志已清空', 'success');
    });
  }
});

// 搜索日志
document.getElementById('logSearch').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const logItems = document.querySelectorAll('.log-item');
  
  logItems.forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(query) ? 'flex' : 'none';
  });
});

// 更新统计信息
function updateStats() {
  chrome.storage.local.get(['stats'], (result) => {
    const stats = result.stats || { pending: 0, published: 0, failed: 0 };
    document.getElementById('pendingCount').textContent = stats.pending;
    document.getElementById('publishedCount').textContent = stats.published;
    document.getElementById('failedCount').textContent = stats.failed;
    
    const total = stats.pending + stats.published + stats.failed;
    const percentage = total > 0 ? Math.round((stats.published / total) * 100) : 0;
    document.getElementById('progressFill').style.width = percentage + '%';
    document.getElementById('progressText').textContent = percentage + '%';
  });
}

// 加载日志
function loadLogs() {
  chrome.storage.local.get(['logs'], (result) => {
    const logs = result.logs || [];
    const logsList = document.getElementById('logsList');
    logsList.innerHTML = '';
    
    if (logs.length === 0) {
      const emptyItem = document.createElement('div');
      emptyItem.className = 'log-item log-level-info';
      emptyItem.innerHTML = `
        <span class="log-message" style="color: #999;">暂无日志，点击"开始发布"开始</span>
      `;
      logsList.appendChild(emptyItem);
      return;
    }
    
    logs.slice(-50).reverse().forEach(log => {
      const item = document.createElement('div');
      item.className = `log-item log-level-${log.level}`;
      const time = log.time || new Date(log.timestamp).toLocaleTimeString('zh-CN');
      item.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-message">${escapeHtml(log.message)}</span>
      `;
      logsList.appendChild(item);
    });
    
    // 自动滚动到底部
    logsList.scrollTop = logsList.scrollHeight;
  });
}

// 显示消息
function showMessage(elementId, message, type) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = `message ${type}`;
  
  setTimeout(() => {
    element.className = 'message';
  }, 3000);
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 定时更新
setInterval(updateStats, 1000);
setInterval(loadLogs, 2000);

// 初始加载
updateStats();
loadLogs();
