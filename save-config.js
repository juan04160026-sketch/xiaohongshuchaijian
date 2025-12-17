/**
 * 保存 Chrome 插件配置到本地文件
 * 用法: node save-config.js --imageDir "E:\小红书项目\图片"
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_FILE = path.join(os.homedir(), '.xhs-publisher', 'config.json');

// 读取现有配置
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

// 保存配置
function saveConfig(config) {
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    console.log('✅ 配置已保存: ' + CONFIG_FILE);
  } catch (e) {
    console.log('❌ 保存配置失败: ' + e.message);
  }
}

// 解析命令行参数
const args = process.argv.slice(2);
const config = loadConfig();

for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace('--', '');
  const value = args[i + 1];
  if (key && value) {
    config[key] = value;
    console.log(`设置 ${key} = ${value}`);
  }
}

if (args.length === 0) {
  console.log('当前配置:');
  console.log(JSON.stringify(config, null, 2));
  console.log('\n用法:');
  console.log('  node save-config.js --imageDir "E:\\小红书项目\\图片"');
  console.log('  node save-config.js --feishuAppId "xxx" --feishuAppSecret "xxx"');
} else {
  saveConfig(config);
}
