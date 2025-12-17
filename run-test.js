#!/usr/bin/env node

/**
 * 使用 npx 运行 Playwright 测试
 * 用法: npx -y playwright@1.40.0 node run-test.js
 */

const { chromium } = require('playwright');

async function testTitleInput() {
  console.log('🚀 启动 Playwright 测试...\n');

  const browser = await chromium.launch({
    headless: false,
  });

  const page = await browser.newPage();

  try {
    const publishUrl = 'https://creator.xiaohongshu.com/publish/publish?source=official&from=menu&target=image';
    console.log(`📱 打开页面: ${publishUrl}`);
    try {
      await page.goto(publishUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      console.log('✅ 页面已加载\n');
    } catch (e) {
      console.log('⚠️ 页面加载超时，继续测试...\n');
    }

    console.log('⏳ 等待 10 秒，确保页面完全加载...');
    await page.waitForTimeout(10000);
    
    // 检查页面标题和 URL
    console.log(`📄 页面标题: ${await page.title()}`);
    console.log(`🔗 当前 URL: ${page.url()}\n`);

    console.log('\n📝 测试标题输入...');
    
    // 首先检查页面上的所有输入框
    console.log('📊 检查页面上的所有输入框...');
    const inputs = await page.$$('input');
    console.log(`找到 ${inputs.length} 个输入框\n`);
    
    for (let i = 0; i < Math.min(inputs.length, 5); i++) {
      const placeholder = await inputs[i].getAttribute('placeholder');
      const type = await inputs[i].getAttribute('type');
      const id = await inputs[i].getAttribute('id');
      const className = await inputs[i].getAttribute('class');
      console.log(`  ${i + 1}. type="${type}" placeholder="${placeholder}" id="${id}" class="${className}"`);
    }
    
    const titleSelector = '#web > div > div > div > div > div.body > div.content > div.plugin.title-container > div > div > div.input > div.d-input-wrapper.d-inline-block.c-input_inner > div > input';
    
    try {
      console.log('\n⏳ 等待标题输入框出现...');
      await page.waitForSelector(titleSelector, { timeout: 10000 });
      console.log('✅ 标题输入框已找到\n');

      const titleInput = await page.$(titleSelector);
      
      if (titleInput) {
        console.log('🖱️ 点击标题输入框...');
        await titleInput.click();
        await page.waitForTimeout(500);

        console.log('🗑️ 清空现有内容...');
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Delete');
        await page.waitForTimeout(300);

        const testTitle = '🎉 Playwright 自动化测试 - ' + new Date().toLocaleTimeString();
        console.log(`✍️ 输入标题: ${testTitle}`);
        await titleInput.type(testTitle, { delay: 50 });
        
        await page.waitForTimeout(1000);

        const inputValue = await titleInput.inputValue();
        console.log(`\n📋 输入框当前值: ${inputValue}`);
        
        if (inputValue === testTitle) {
          console.log('✅ 标题输入成功！\n');
        } else {
          console.log('⚠️ 标题输入可能有问题\n');
        }

        console.log('📸 保存页面截图...');
        await page.screenshot({ path: 'test-result.png' });
        console.log('✅ 截图已保存: test-result.png\n');

      } else {
        console.error('❌ 未找到标题输入框\n');
      }
    } catch (error) {
      console.error('❌ 标题输入测试失败:', error.message, '\n');
    }

    console.log('\n✅ 测试完成！');
    console.log('💡 提示: 浏览器窗口将在 30 秒后关闭');
    
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ 测试出错:', error);
  } finally {
    await browser.close();
    console.log('✅ 浏览器已关闭');
  }
}

testTitleInput().catch(console.error);
