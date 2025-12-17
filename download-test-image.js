/**
 * 下载测试图片到 test-images 文件夹
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const dir = './test-images';

// 确保目录存在
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// 下载图片
function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(dir, filename);
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      // 处理重定向
      if (response.statusCode === 301 || response.statusCode === 302) {
        https.get(response.headers.location, (res) => {
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log('下载完成: ' + filePath);
            resolve(filePath);
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('下载完成: ' + filePath);
          resolve(filePath);
        });
      }
    }).on('error', reject);
  });
}

// 下载多张测试图片
async function main() {
  console.log('开始下载测试图片...\n');
  
  try {
    await downloadImage('https://picsum.photos/800/600', 'test1.jpg');
    await downloadImage('https://picsum.photos/800/600', 'test2.jpg');
    console.log('\n全部下载完成！');
    console.log('现在可以运行: node test-playwright.js');
  } catch (err) {
    console.error('下载失败:', err.message);
  }
}

main();
