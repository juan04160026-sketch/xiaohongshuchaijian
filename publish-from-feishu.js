/**
 * 从飞书读取数据，自动匹配本地图片，发布到小红书
 * 用法: node publish-from-feishu.js
 */

const { chromium } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');

// ============ 配置区域 ============
const CONFIG = {
  // 飞书配置
  feishu: {
    appId: 'cli_a9ab3d3b4a389cda',
    appSecret: 'Fs9xhwfNBqYslTGVIKpJAeWhsr6wIxJt',
    baseId: 'GGh2bW3Q2aHpi1shiVqcAlhmnMd',
  },
  // 本地图片目录
  imageDir: 'E:\\小红书项目\\图片',
  // 发布间隔（秒）
  publishInterval: 30,
};

// 配置文件路径
const CONFIG_FILE = path.join(os.homedir(), '.xhs-publisher', 'config.json');
const userDataDir = path.join(os.homedir(), '.xhs-publisher', 'chrome-data');

// 小红书发布页面（直接打开图文上传页面）
const PUBLISH_URL = 'https://creator.xiaohongshu.com/publish/publish?source=official&from=tab_switch&target=image';

// CSS 选择器
const SELECTORS = {
  uploadInput: 'input[type="file"]',
  title: '#web > div > div > div > div > div.body > div.content > div.plugin.title-container > div > div > div.input > div.d-input-wrapper.d-inline-block.c-input_inner > div > input',
  content: '#web > div > div > div > div > div.body > div.content > div.plugin.editor-container > div > div > div.editor-container > div.editor-content > div > div',
  publishBtn: 'button.publishBtn',
};

// 读取配置文件
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const saved = JSON.parse(data);
      // 合并配置
      if (saved.feishuAppId) CONFIG.feishu.appId = saved.feishuAppId;
      if (saved.feishuAppSecret) CONFIG.feishu.appSecret = saved.feishuAppSecret;
      if (saved.feishuTableId) CONFIG.feishu.baseId = saved.feishuTableId;
      if (saved.imageDir) CONFIG.imageDir = saved.imageDir;
      console.log('✅ 已加载配置文件');
    }
  } catch (e) {
    console.log('⚠️ 读取配置文件失败: ' + e.message);
  }
}


// 飞书 Token 缓存
let feishuToken = null;
let feishuTableId = null;

// 从飞书获取 Token
async function getFeishuToken() {
  if (feishuToken) return feishuToken;
  
  const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret,
    })
  });
  
  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`获取飞书 Token 失败: ${data.msg}`);
  }
  feishuToken = data.tenant_access_token;
  return feishuToken;
}

// 更新飞书记录状态
async function updateFeishuStatus(recordId, status) {
  try {
    const token = await getFeishuToken();
    
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.baseId}/tables/${feishuTableId}/records/${recordId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            '状态': status
          }
        })
      }
    );
    
    const data = await response.json();
    if (data.code !== 0) {
      console.log('   ⚠️ 更新飞书状态失败: ' + data.msg);
      return false;
    }
    console.log('   ✅ 飞书状态已更新: ' + status);
    return true;
  } catch (e) {
    console.log('   ⚠️ 更新飞书状态失败: ' + e.message);
    return false;
  }
}

// 从飞书读取待发布数据
async function fetchFromFeishu() {
  console.log('\n📚 从飞书读取数据...');
  
  const token = await getFeishuToken();
  console.log('✅ Token 获取成功');
  
  // 获取表格列表
  const tableRes = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.baseId}/tables`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const tableData = await tableRes.json();
  
  if (tableData.code !== 0) {
    throw new Error(`读取表格失败: ${tableData.msg}`);
  }
  
  feishuTableId = tableData.data.items[0].table_id;
  console.log(`✅ 找到表格: ${tableData.data.items[0].name}`);
  
  // 读取记录
  const recordsRes = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.baseId}/tables/${feishuTableId}/records`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const recordsData = await recordsRes.json();
  
  if (recordsData.code !== 0) {
    throw new Error(`读取记录失败: ${recordsData.msg}`);
  }
  
  const records = recordsData.data.items || [];
  console.log(`✅ 读取到 ${records.length} 条记录`);
  
  // 转换数据格式，筛选待发布
  const tasks = records
    .map(item => {
      const fields = item.fields;
      return {
        id: item.record_id,
        title: getTextValue(fields['小红书标题'] || fields['标题'] || ''),
        content: getTextValue(fields['小红书文案'] || fields['文案'] || fields['内容'] || ''),
        productId: getTextValue(fields['商品ID'] || fields['productId'] || ''),
        status: getTextValue(fields['状态'] || 'pending'),
        topic: getTextValue(fields['话题'] || fields['主题'] || ''),
      };
    })
    .filter(task => {
      // 只筛选"待发布"状态的记录
      return task.status === '待发布';
    });
  
  console.log(`✅ 筛选出 ${tasks.length} 条待发布内容`);
  return tasks;
}

// 获取文本值（处理飞书字段格式）
function getTextValue(field) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (Array.isArray(field)) {
    return field.map(item => item.text || item).join('');
  }
  if (field.text) return field.text;
  return String(field);
}

// 根据商品ID查找匹配的图片
function findImagesByProductId(productId) {
  if (!productId || !fs.existsSync(CONFIG.imageDir)) {
    console.log('⚠️ 商品ID为空或图片目录不存在: ' + CONFIG.imageDir);
    return [];
  }
  
  const files = fs.readdirSync(CONFIG.imageDir);
  const matchedImages = [];
  const extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.PNG', '.JPG', '.JPEG'];
  
  for (const ext of extensions) {
    const exactMatch = productId + ext;
    if (files.includes(exactMatch)) {
      matchedImages.push(path.join(CONFIG.imageDir, exactMatch));
    }
    
    // 支持 商品ID_1.png 格式
    const pattern = new RegExp('^' + productId + '[_-]?\\d*\\' + ext + '$', 'i');
    for (const file of files) {
      if (pattern.test(file) && !matchedImages.some(img => img.endsWith(file))) {
        matchedImages.push(path.join(CONFIG.imageDir, file));
      }
    }
  }
  
  return matchedImages;
}


// 发布单条内容
async function publishOne(page, task) {
  console.log(`\n📤 发布: "${task.title}"`);
  console.log(`   商品ID: ${task.productId}`);
  
  // 查找匹配的图片
  const images = findImagesByProductId(task.productId);
  console.log(`   找到图片: ${images.length} 张`);
  
  if (images.length === 0) {
    throw new Error('没有找到匹配的图片文件');
  }
  
  // 打开发布页面
  await page.goto(PUBLISH_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // 上传图片
  console.log('   上传图片...');
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.setInputFiles(images);
    console.log('   ✅ 图片上传完成');
  } else {
    throw new Error('找不到图片上传元素');
  }
  
  // 等待标题输入框出现（图片上传后自动跳转）
  try {
    await page.waitForSelector(SELECTORS.title, { timeout: 15000 });
    console.log('   ✅ 编辑页面已加载');
  } catch (e) {
    console.log('   ⚠️ 等待编辑页面超时');
  }
  await page.waitForTimeout(1000);
  
  // 输入标题（超过20字自动截断）
  console.log('   输入标题...');
  try {
    const titleInput = await page.$(SELECTORS.title);
    if (titleInput) {
      await titleInput.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Delete');
      
      // 标题超过20字自动截断
      let title = task.title;
      if (title.length > 20) {
        title = title.substring(0, 20);
        console.log('   ⚠️ 标题超过20字，已截断');
      }
      
      await titleInput.fill(title);
      console.log('   ✅ 标题: ' + title + ' (' + title.length + '字)');
    }
  } catch (e) {
    console.log('   ⚠️ 标题输入失败: ' + e.message);
  }
  
  await page.waitForTimeout(1000);
  
  // 输入正文（智能处理话题标签）
  console.log('   输入正文...');
  try {
    const contentEditor = await page.$(SELECTORS.content);
    if (contentEditor) {
      await contentEditor.click();
      await page.waitForTimeout(300);
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Delete');
      
      // 解析正文，分离普通文本和话题标签
      const content = task.content;
      // 匹配 #话题名 格式（中文、英文、数字）
      const parts = content.split(/(#[^\s#\[]+)/g);
      
      for (const part of parts) {
        if (!part) continue;
        
        if (part.startsWith('#') && part.length > 1) {
          // 这是一个话题标签
          const topicName = part; // 包含 # 号
          console.log('   输入话题: ' + topicName);
          
          // 输入话题
          await page.keyboard.type(topicName, { delay: 50 });
          
          // 等待下拉框出现
          await page.waitForTimeout(1500);
          
          // 尝试点击下拉框中的第一个选项
          try {
            const topicItem = await page.$('#creator-editor-topic-container > div.item');
            if (topicItem) {
              await topicItem.click();
              console.log('   ✅ 已选择话题: ' + topicName);
            } else {
              console.log('   ⚠️ 话题下拉框未出现: ' + topicName);
            }
          } catch (e) {
            console.log('   ⚠️ 选择话题失败: ' + topicName);
          }
          
          await page.waitForTimeout(500);
          
          // 输入空格分隔
          await page.keyboard.type(' ', { delay: 50 });
        } else {
          // 普通文本，直接输入
          await page.keyboard.type(part, { delay: 10 });
        }
      }
      
      console.log('   ✅ 正文输入完成');
    }
  } catch (e) {
    console.log('   ⚠️ 正文输入失败: ' + e.message);
  }
  
  await page.waitForTimeout(2000);
  
  // 添加商品
  if (task.productId) {
    console.log('   添加商品...');
    try {
      // 点击添加商品按钮
      const addProductBtn = await page.$('text=添加商品');
      if (addProductBtn) {
        await addProductBtn.click();
        console.log('   点击添加商品按钮');
        await page.waitForTimeout(2000);
        
        // 等待弹窗出现，输入商品ID搜索
        const searchInput = await page.$('input[placeholder*="搜索"]');
        if (searchInput) {
          await searchInput.click();
          await searchInput.fill(task.productId);
          console.log('   输入商品ID: ' + task.productId);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(2000);
          
          // 勾选第一个商品
          const firstProduct = await page.$('.goods-list-normal .good-card-container .d-checkbox');
          if (firstProduct) {
            await firstProduct.click();
            console.log('   ✅ 已勾选商品');
            await page.waitForTimeout(1000);
            
            // 点击确定/保存按钮
            const confirmBtn = await page.$('button:has-text("确定"), button:has-text("保存")');
            if (confirmBtn) {
              await confirmBtn.click();
              console.log('   ✅ 商品添加完成');
              await page.waitForTimeout(1500);
            }
          } else {
            console.log('   ⚠️ 未找到商品');
          }
        } else {
          console.log('   ⚠️ 未找到搜索框');
        }
      } else {
        console.log('   ⚠️ 未找到添加商品按钮');
      }
    } catch (e) {
      console.log('   ⚠️ 添加商品失败: ' + e.message);
    }
  }
  
  // 截图保存
  const screenshotPath = `publish-${task.productId || Date.now()}.png`;
  await page.screenshot({ path: screenshotPath });
  console.log('   📸 截图: ' + screenshotPath);
  
  // 点击发布按钮
  console.log('   点击发布...');
  try {
    const publishBtn = await page.$('button.publishBtn');
    if (publishBtn) {
      // 取消注释下面这行来自动发布
      // await publishBtn.click();
      console.log('   ⚠️ 测试模式：未点击发布按钮');
      console.log('   （取消代码中的注释可启用自动发布）');
    }
  } catch (e) {
    console.log('   ⚠️ 发布按钮点击失败: ' + e.message);
  }
  
  return true;
}

// 主函数
async function main() {
  console.log('========================================');
  console.log('  小红书自动发布 - Playwright 版');
  console.log('========================================\n');
  
  // 加载配置
  loadConfig();
  
  console.log('配置信息:');
  console.log('  飞书 App ID: ' + (CONFIG.feishu.appId ? '已配置' : '❌ 未配置'));
  console.log('  飞书 Base ID: ' + CONFIG.feishu.baseId);
  console.log('  图片目录: ' + CONFIG.imageDir);
  console.log('  发布间隔: ' + CONFIG.publishInterval + ' 秒');
  
  // 检查配置
  if (!CONFIG.feishu.appId || !CONFIG.feishu.appSecret) {
    console.log('\n❌ 请先配置飞书 App ID 和 App Secret');
    console.log('方法1: 运行 node save-config.js --feishuAppId "xxx" --feishuAppSecret "xxx"');
    console.log('方法2: 直接修改本文件顶部的 CONFIG 对象');
    return;
  }
  
  // 从飞书读取数据
  let tasks;
  try {
    tasks = await fetchFromFeishu();
  } catch (e) {
    console.log('\n❌ 读取飞书数据失败: ' + e.message);
    return;
  }
  
  if (tasks.length === 0) {
    console.log('\n⚠️ 没有待发布的内容');
    return;
  }
  
  // 显示待发布列表
  console.log('\n📋 待发布列表:');
  tasks.forEach((task, i) => {
    const images = findImagesByProductId(task.productId);
    console.log(`  ${i + 1}. "${task.title}" (商品ID: ${task.productId}, 图片: ${images.length}张)`);
  });
  
  // 启动浏览器
  console.log('\n🚀 启动浏览器...');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    viewport: { width: 1280, height: 900 },
    locale: 'zh-CN',
  });
  
  const page = await context.newPage();
  
  let published = 0;
  let failed = 0;
  
  try {
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      console.log(`\n========== [${i + 1}/${tasks.length}] ==========`);
      
      try {
        await publishOne(page, task);
        published++;
        console.log(`   ✅ 发布成功`);
        // 回写飞书状态
        await updateFeishuStatus(task.id, '已发布');
      } catch (e) {
        failed++;
        console.log(`   ❌ 发布失败: ${e.message}`);
        // 回写飞书状态
        await updateFeishuStatus(task.id, '发布失败');
      }
      
      // 发布间隔
      if (i < tasks.length - 1) {
        console.log(`\n⏳ 等待 ${CONFIG.publishInterval} 秒后发布下一条...`);
        await page.waitForTimeout(CONFIG.publishInterval * 1000);
      }
    }
  } finally {
    console.log('\n========================================');
    console.log(`📊 发布完成: 成功 ${published}, 失败 ${failed}, 总计 ${tasks.length}`);
    console.log('========================================');
    
    console.log('\n浏览器保持打开 30 秒，你可以手动检查结果...');
    await page.waitForTimeout(30000);
    
    await context.close();
    console.log('浏览器已关闭');
  }
}

main().catch(console.error);
