/**
 * 完整流程测试：飞书数据 → 小红书发布
 * 用法: node test-playwright.js
 */

const { chromium } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

const userDataDir = path.join(os.homedir(), '.xhs-publisher', 'chrome-data');

// 小红书发布页面
const PUBLISH_URL = 'https://creator.xiaohongshu.com/publish/publish?source=official';

// CSS 选择器
const SELECTORS = {
  // 图文标签（需要先点击切换）
  imageTextTab: '#web > div > div > div > div.header > div.header-tabs > div:nth-child(3)',
  // 图片上传 input
  uploadInput: '#web > div > div > div > div.upload-content > div.upload-wrapper > div > input',
  // 标题输入框
  title: '#web > div > div > div > div > div.body > div.content > div.plugin.title-container > div > div > div.input > div.d-input-wrapper.d-inline-block.c-input_inner > div > input',
  // 正文编辑器
  content: '#web > div > div > div > div > div.body > div.content > div.plugin.editor-container > div > div > div.editor-container > div.editor-content > div > div',
  // 话题弹出选项
  topicOption: '#creator-editor-topic-container > div.item.is-selected > span.name',
  // 话题容器（用于检测弹出）
  topicContainer: '#creator-editor-topic-container',
  // 发布按钮
  publishBtn: '#web > div > div > div > div > div.submit > div > button.d-button.d-button-large.--size-icon-large.--size-text-h6.d-button-with-content.--color-static.bold.--color-bg-fill.--color-text-paragraph.custom-button.red.publishBtn > div',
  // 添加商品按钮
  addProductBtn: '#web > div > div > div > div > div.body > div.content > div.media-commodity > div > div > div > div > div > div > div.multi-good-select-empty-btn > button > div > span',
  // 商品搜索输入框（弹窗内）
  productSearchInput: 'body > div.d-modal-mask > div > div.d-modal-content > div > div.d-grid > div:nth-child(2) > div > div > div > input',
  // 商品列表第一个勾选框
  productFirstCheckbox: 'body > div.d-modal-mask > div > div.d-modal-content > div > div.goods-list-container > div.goods-list-normal > div:nth-child(1) > div.good-card-container > div.d-grid.d-checkbox.d-checkbox-main.d-clickable.good-selected > span > span',
  // 商品弹窗保存按钮
  productSaveBtn: 'body > div.d-modal-mask > div > div.d-modal-footer > div > button > div',
  // 定时发布按钮（用文字定位）
  scheduleRadio: 'label.el-radio span.el-radio__label',
};

// ============ 配置区域 ============
// 配置文件路径（Chrome 插件保存的配置）
const CONFIG_FILE = path.join(os.homedir(), '.xhs-publisher', 'config.json');

// 读取配置
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.log('读取配置文件失败: ' + e.message);
  }
  return {};
}

// 保存配置（供外部调用）
function saveConfig(config) {
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    console.log('配置已保存: ' + CONFIG_FILE);
  } catch (e) {
    console.log('保存配置失败: ' + e.message);
  }
}

// 加载配置
const savedConfig = loadConfig();

// 本地图片目录（优先使用配置文件中的路径）
const IMAGE_DIR = savedConfig.imageDir || 'E:\\小红书项目\\图片';

console.log('========================================');
console.log('配置信息:');
console.log('  图片目录: ' + IMAGE_DIR);
console.log('  配置文件: ' + CONFIG_FILE);
console.log('========================================\n');

// 模拟飞书数据（实际使用时从飞书 API 获取）
const testData = {
  title: '测试笔记标题 - ' + new Date().toLocaleTimeString(),
  content: '这是从飞书导入的测试内容\n\n第二段内容',
  // 话题标签
  topics: ['测试', '自动化'],
  // 商品ID（图片文件名与此ID匹配，如 123456.png）
  productId: '123456',
  // 定时发布时间（可选，格式如 "2024-12-20 10:00"，留空则立即发布）
  scheduleTime: '',
  // 图片路径（自动根据商品ID匹配）
  images: [],
};

// 导出配置函数供其他模块使用
module.exports = { loadConfig, saveConfig, IMAGE_DIR };

// 根据商品ID查找匹配的图片
function findImagesByProductId(productId, imageDir) {
  if (!productId || !fs.existsSync(imageDir)) {
    console.log('商品ID为空或图片目录不存在');
    return [];
  }
  
  const files = fs.readdirSync(imageDir);
  const matchedImages = [];
  
  // 支持的图片格式
  const extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
  
  for (const ext of extensions) {
    // 精确匹配：商品ID.扩展名
    const exactMatch = productId + ext;
    if (files.includes(exactMatch)) {
      matchedImages.push(path.join(imageDir, exactMatch));
      console.log('找到匹配图片: ' + exactMatch);
    }
    
    // 也支持：商品ID_1.png, 商品ID_2.png 等多图
    const pattern = new RegExp('^' + productId + '[_-]?\\d*' + ext.replace('.', '\\.') + '$', 'i');
    for (const file of files) {
      if (pattern.test(file) && !matchedImages.includes(path.join(imageDir, file))) {
        matchedImages.push(path.join(imageDir, file));
        console.log('找到匹配图片: ' + file);
      }
    }
  }
  
  return matchedImages;
}

// 根据商品ID加载图片
testData.images = findImagesByProductId(testData.productId, IMAGE_DIR);
console.log('商品ID: ' + testData.productId);
console.log('图片目录: ' + IMAGE_DIR);
console.log('找到匹配图片: ' + testData.images.length + ' 张');

async function publishNote() {
  console.log('启动 Playwright...\n');

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    viewport: { width: 1280, height: 900 },
    locale: 'zh-CN',
  });

  const page = await context.newPage();

  try {
    // 1. 打开小红书发布页面
    console.log('1. 打开小红书发布页面...');
    await page.goto(PUBLISH_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);
    console.log('页面已加载\n');

    // 检查当前 URL
    const currentUrl = page.url();
    console.log('当前 URL: ' + currentUrl);

    // 2. 点击"上传图文"标签
    console.log('\n2. 点击"上传图文"标签...');
    try {
      await page.waitForSelector(SELECTORS.imageTextTab, { timeout: 10000 });
      await page.click(SELECTORS.imageTextTab);
      console.log('已切换到图文模式');
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('切换图文标签失败: ' + e.message);
    }

    // 4. 上传图片
    console.log('\n4. 上传图片...');
    try {
      await page.waitForSelector(SELECTORS.uploadInput, { timeout: 10000 });
      const fileInput = await page.$(SELECTORS.uploadInput);
      
      if (fileInput && testData.images.length > 0) {
        // 自动上传图片
        await fileInput.setInputFiles(testData.images);
        console.log('图片上传完成: ' + testData.images.length + ' 张');
      } else {
        console.log('找到上传元素，但无测试图片');
        console.log('请手动上传图片，等待 20 秒...');
        await page.waitForTimeout(20000);
      }
    } catch (e) {
      console.log('上传元素查找失败: ' + e.message);
      console.log('请手动上传图片，等待 20 秒...');
      await page.waitForTimeout(20000);
    }

    // 5. 等待进入编辑页面（等待标题输入框出现）
    console.log('\n5. 等待进入编辑页面...');
    console.log('等待页面跳转，最多 30 秒...');
    try {
      await page.waitForSelector(SELECTORS.title, { timeout: 30000 });
      console.log('编辑页面已加载');
    } catch (e) {
      console.log('等待编辑页面超时，继续尝试...');
    }
    await page.waitForTimeout(2000);

    // 6. 输入标题
    console.log('\n6. 输入标题...');
    try {
      const titleInput = await page.$(SELECTORS.title);
      if (titleInput) {
        await titleInput.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Delete');
        await titleInput.type(testData.title, { delay: 30 });
        console.log('标题: ' + testData.title);
      } else {
        console.log('未找到标题输入框');
      }
    } catch (e) {
      console.log('标题输入失败: ' + e.message);
    }

    await page.waitForTimeout(1000);

    // 7. 输入正文
    console.log('\n7. 输入正文...');
    try {
      await page.waitForSelector(SELECTORS.content, { timeout: 10000 });
      const contentEditor = await page.$(SELECTORS.content);
      if (contentEditor) {
        await contentEditor.click();
        await page.waitForTimeout(500);
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Delete');
        await page.keyboard.type(testData.content, { delay: 20 });
        console.log('正文输入完成');
      }
    } catch (e) {
      console.log('正文输入失败: ' + e.message);
    }

    // 8. 添加话题标签
    console.log('\n8. 添加话题标签...');
    for (const topic of testData.topics) {
      try {
        // 在正文编辑器中输入 #话题
        const contentEditor = await page.$(SELECTORS.content);
        if (contentEditor) {
          await contentEditor.click();
          // 移动到末尾
          await page.keyboard.press('End');
          await page.waitForTimeout(300);
          
          // 输入 #话题名
          await page.keyboard.type(' #' + topic, { delay: 50 });
          console.log('输入话题: #' + topic);
          
          // 等待话题弹出框出现
          await page.waitForTimeout(1000);
          
          // 尝试点击弹出的话题选项
          try {
            await page.waitForSelector(SELECTORS.topicContainer, { timeout: 3000 });
            const topicOption = await page.$(SELECTORS.topicOption);
            if (topicOption) {
              await topicOption.click();
              console.log('已选择话题: #' + topic);
            } else {
              // 尝试点击第一个话题选项
              const firstOption = await page.$('#creator-editor-topic-container > div.item');
              if (firstOption) {
                await firstOption.click();
                console.log('已选择第一个话题选项');
              }
            }
          } catch (e) {
            console.log('话题弹出框未出现，可能话题不存在: ' + topic);
          }
          
          await page.waitForTimeout(500);
        }
      } catch (e) {
        console.log('话题添加失败: ' + e.message);
      }
    }

    // 9. 添加商品（可选）
    console.log('\n9. 添加商品...');
    if (testData.productId) {
      try {
        await page.waitForSelector(SELECTORS.addProductBtn, { timeout: 5000 });
        const addProductBtn = await page.$(SELECTORS.addProductBtn);
        if (addProductBtn) {
          console.log('点击添加商品按钮...');
          await addProductBtn.click();
          await page.waitForTimeout(1500);
          
          // 等待弹窗出现，输入商品ID
          try {
            await page.waitForSelector(SELECTORS.productSearchInput, { timeout: 5000 });
            const searchInput = await page.$(SELECTORS.productSearchInput);
            if (searchInput) {
              await searchInput.click();
              await searchInput.type(testData.productId, { delay: 30 });
              console.log('已输入商品ID: ' + testData.productId);
              
              // 按回车搜索
              await page.keyboard.press('Enter');
              console.log('已搜索商品');
              await page.waitForTimeout(2000);
              
              // 勾选第一个商品
              try {
                await page.waitForSelector(SELECTORS.productFirstCheckbox, { timeout: 5000 });
                const checkbox = await page.$(SELECTORS.productFirstCheckbox);
                if (checkbox) {
                  await checkbox.click();
                  console.log('已勾选第一个商品');
                  await page.waitForTimeout(1000);
                  
                  // 点击保存按钮
                  try {
                    const saveBtn = await page.$(SELECTORS.productSaveBtn);
                    if (saveBtn) {
                      await saveBtn.click();
                      console.log('已点击保存按钮，商品添加完成');
                      await page.waitForTimeout(1500);
                    }
                  } catch (e) {
                    console.log('保存按钮点击失败: ' + e.message);
                  }
                }
              } catch (e) {
                console.log('商品勾选失败: ' + e.message);
              }
            }
          } catch (e) {
            console.log('商品搜索框未找到: ' + e.message);
          }
        }
      } catch (e) {
        console.log('添加商品按钮未找到: ' + e.message);
      }
    } else {
      console.log('未设置商品ID，跳过添加商品');
    }

    // 10. 定时发布（可选）
    console.log('\n10. 定时发布设置...');
    if (testData.scheduleTime) {
      try {
        // 查找包含"定时发布"文字的 radio 按钮
        const scheduleBtn = page.locator('span.el-radio__label:has-text("定时发布")').first();
        if (await scheduleBtn.isVisible()) {
          await scheduleBtn.click();
          console.log('已点击定时发布按钮');
          await page.waitForTimeout(1000);
          
          // 查找时间输入框并输入时间
          // 使用 placeholder="选择日期和时间" 来定位
          try {
            const timeInput = await page.$('input[placeholder="选择日期和时间"]');
            
            if (timeInput) {
              await timeInput.click();
              await page.waitForTimeout(500);
              // 清空并输入新时间
              await page.keyboard.press('Control+A');
              await page.keyboard.type(testData.scheduleTime, { delay: 30 });
              console.log('已设置定时时间: ' + testData.scheduleTime);
              // 按 Enter 或点击其他地方确认
              await page.keyboard.press('Enter');
              await page.waitForTimeout(500);
            } else {
              console.log('未找到时间输入框，请手动输入时间');
            }
          } catch (e) {
            console.log('时间输入失败: ' + e.message);
          }
        } else {
          console.log('未找到定时发布按钮');
        }
      } catch (e) {
        console.log('定时发布设置失败: ' + e.message);
      }
    } else {
      console.log('未设置定时时间，将立即发布');
    }

    // 截图
    await page.screenshot({ path: 'test-result.png' });
    console.log('\n截图已保存: test-result.png');

    // 11. 点击发布按钮（测试时注释掉，避免真的发布）
    console.log('\n11. 发布按钮...');
    try {
      await page.waitForSelector(SELECTORS.publishBtn, { timeout: 5000 });
      const publishBtn = await page.$(SELECTORS.publishBtn);
      if (publishBtn) {
        console.log('找到发布按钮');
        // 取消下面的注释可以自动点击发布
        // await publishBtn.click();
        // console.log('已点击发布按钮');
        console.log('（测试模式：未点击发布按钮）');
      }
    } catch (e) {
      console.log('发布按钮查找失败: ' + e.message);
    }

    console.log('\n测试完成！浏览器保持打开 30 秒...');
    console.log('你可以手动检查结果，或手动点击发布按钮');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('出错: ' + error.message);
    await page.screenshot({ path: 'error.png' });
  } finally {
    await context.close();
    console.log('浏览器已关闭');
  }
}

publishNote().catch(console.error);
