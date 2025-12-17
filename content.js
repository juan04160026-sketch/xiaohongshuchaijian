// 内容脚本 - 在小红书页面运行

// 监听来自后台的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'publishContent') {
    publishContent(request.task)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 异步响应
  }
});

// 发布内容
async function publishContent(task) {
  try {
    // 等待编辑器加载
    await waitForElement('[contenteditable="true"]', 5000);

    // 填写标题
    const titleInput = document.querySelector('input[placeholder*="标题"], input[placeholder*="title"]');
    if (titleInput) {
      titleInput.value = task.title;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      titleInput.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(500);
    }

    // 填写文案
    const contentEditor = document.querySelector('[contenteditable="true"]');
    if (contentEditor) {
      contentEditor.textContent = task.content;
      contentEditor.dispatchEvent(new Event('input', { bubbles: true }));
      contentEditor.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(500);
    }

    // 上传图片
    if (task.coverImage) {
      try {
        await uploadImage(task.coverImage);
        await sleep(2000);
      } catch (error) {
        console.warn('图片上传失败:', error);
      }
    }

    // 添加标签
    if (task.topic) {
      try {
        const tagInput = document.querySelector('input[placeholder*="标签"], input[placeholder*="tag"]');
        if (tagInput) {
          tagInput.value = `#${task.topic}`;
          tagInput.dispatchEvent(new Event('input', { bubbles: true }));
          await sleep(500);
          
          // 查找添加按钮
          const addBtn = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent.includes('添加') || btn.textContent.includes('Add')
          );
          if (addBtn) {
            addBtn.click();
            await sleep(500);
          }
        }
      } catch (error) {
        console.warn('添加标签失败:', error);
      }
    }

    // 等待发布按钮可用
    await sleep(1000);

    // 点击发布按钮
    const publishBtn = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent.includes('发布') || btn.textContent.includes('Publish')
    );
    
    if (!publishBtn) {
      throw new Error('找不到发布按钮');
    }

    publishBtn.click();
    
    // 等待发布完成（检查成功提示或 URL 变化）
    await waitForPublishComplete(10000);
    
    return {
      success: true,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`发布失败: ${error.message}`);
  }
}

// 等待发布完成
async function waitForPublishComplete(timeout = 10000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    // 检查成功提示
    const successMsg = document.querySelector('[class*="success"], [class*="Success"]');
    if (successMsg && successMsg.textContent.includes('成功')) {
      return true;
    }

    // 检查 URL 是否变化（发布后会跳转）
    if (window.location.href.includes('/explore/')) {
      return true;
    }

    await sleep(500);
  }

  throw new Error('发布超时');
}

// 上传图片
async function uploadImage(imageUrl) {
  try {
    // 下载图片
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`下载图片失败: ${response.status}`);
    }

    const blob = await response.blob();
    const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });

    // 找到文件输入框
    const fileInput = document.querySelector('input[type="file"]');
    if (!fileInput) {
      throw new Error('找不到文件输入框');
    }

    // 创建 DataTransfer 对象
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    // 触发 change 事件
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    fileInput.dispatchEvent(new Event('input', { bubbles: true }));

    // 等待图片上传完成
    await sleep(2000);
  } catch (error) {
    throw new Error(`图片上传失败: ${error.message}`);
  }
}

// 辅助函数
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      subtreeModifications: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`元素 ${selector} 未找到`));
    }, timeout);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
