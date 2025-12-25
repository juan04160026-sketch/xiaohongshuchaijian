import React, { useState } from 'react';
import './UserGuide.css';

type GuideSection = 'overview' | 'install' | 'feishu' | 'config' | 'publish' | 'faq';

const UserGuide: React.FC = () => {
  const [activeSection, setActiveSection] = useState<GuideSection>('overview');

  return (
    <div className="user-guide">
      <div className="guide-sidebar">
        <h3>📚 使用说明</h3>
        <ul className="guide-menu">
          <li 
            className={activeSection === 'overview' ? 'active' : ''}
            onClick={() => setActiveSection('overview')}
          >
            🏠 功能概述
          </li>
          <li 
            className={activeSection === 'install' ? 'active' : ''}
            onClick={() => setActiveSection('install')}
          >
            💻 环境安装
          </li>
          <li 
            className={activeSection === 'feishu' ? 'active' : ''}
            onClick={() => setActiveSection('feishu')}
          >
            📊 飞书表格配置
          </li>
          <li 
            className={activeSection === 'config' ? 'active' : ''}
            onClick={() => setActiveSection('config')}
          >
            ⚙️ 软件设置步骤
          </li>
          <li 
            className={activeSection === 'publish' ? 'active' : ''}
            onClick={() => setActiveSection('publish')}
          >
            🚀 发布操作流程
          </li>
          <li 
            className={activeSection === 'faq' ? 'active' : ''}
            onClick={() => setActiveSection('faq')}
          >
            ❓ 常见问题
          </li>
        </ul>
      </div>

      <div className="guide-content">
        {activeSection === 'overview' && <OverviewSection />}
        {activeSection === 'install' && <InstallSection />}
        {activeSection === 'feishu' && <FeishuSection />}
        {activeSection === 'config' && <ConfigSection />}
        {activeSection === 'publish' && <PublishSection />}
        {activeSection === 'faq' && <FaqSection />}
      </div>
    </div>
  );
};

const OverviewSection: React.FC = () => (
  <div className="guide-section">
    <h2>🏠 功能概述</h2>
    
    <div className="info-card">
      <h3>📌 本工具可以做什么？</h3>
      <p>自动从飞书多维表格读取笔记内容，批量发布到小红书平台。</p>
    </div>

    <div className="feature-grid">
      <div className="feature-item">
        <span className="feature-icon">🖥️</span>
        <h4>多账号发布</h4>
        <p>支持比特浏览器多窗口，同时发布多个账号</p>
      </div>
      <div className="feature-item">
        <span className="feature-icon">🌐</span>
        <h4>单账号发布</h4>
        <p>支持谷歌浏览器单账号发布</p>
      </div>
      <div className="feature-item">
        <span className="feature-icon">📷</span>
        <h4>飞书图片</h4>
        <p>自动下载飞书表格中的封面图片</p>
      </div>
      <div className="feature-item">
        <span className="feature-icon">🎨</span>
        <h4>文字配图</h4>
        <p>使用小红书AI自动生成封面</p>
      </div>
      <div className="feature-item">
        <span className="feature-icon">🔄</span>
        <h4>状态同步</h4>
        <p>发布后自动更新飞书表格状态</p>
      </div>
      <div className="feature-item">
        <span className="feature-icon">📋</span>
        <h4>多表格支持</h4>
        <p>每个窗口可对应不同的飞书表格</p>
      </div>
    </div>

    <div className="info-card highlight">
      <h3>🎯 图片来源选项</h3>
      <table className="guide-table">
        <thead>
          <tr>
            <th>选项</th>
            <th>说明</th>
            <th>适用场景</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>飞书图片</strong></td>
            <td>从飞书表格的"小红书封面"字段下载</td>
            <td>已有设计好的封面图</td>
          </tr>
          <tr>
            <td><strong>文字配图</strong></td>
            <td>使用小红书AI自动生成封面</td>
            <td>没有封面图，快速发布</td>
          </tr>
          <tr>
            <td><strong>本地图片</strong></td>
            <td>从本地目录读取图片</td>
            <td>图片存储在本地电脑</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="info-card">
      <h3>⚡ 快速开始流程</h3>
      <div className="steps-flow">
        <div className="step-item">
          <span className="step-number">1</span>
          <span className="step-text">环境安装</span>
        </div>
        <span className="step-arrow">→</span>
        <div className="step-item">
          <span className="step-number">2</span>
          <span className="step-text">飞书配置</span>
        </div>
        <span className="step-arrow">→</span>
        <div className="step-item">
          <span className="step-number">3</span>
          <span className="step-text">软件设置</span>
        </div>
        <span className="step-arrow">→</span>
        <div className="step-item">
          <span className="step-number">4</span>
          <span className="step-text">开始发布</span>
        </div>
      </div>
    </div>
  </div>
);

const InstallSection: React.FC = () => (
  <div className="guide-section">
    <h2>💻 环境安装</h2>

    <div className="info-card important">
      <h3>⚠️ 开发者模式运行（源码方式）</h3>
      <p>如果你是从源码运行本项目，需要安装以下环境：</p>
    </div>

    <div className="info-card">
      <h3>1️⃣ 安装 Node.js</h3>
      <ol className="guide-steps">
        <li>
          <strong>下载 Node.js</strong>
          <p>访问官网：<a href="https://nodejs.org/" target="_blank" rel="noreferrer">https://nodejs.org/</a></p>
          <p>推荐下载 <strong>LTS（长期支持版）</strong>，版本 18.x 或更高</p>
        </li>
        <li>
          <strong>安装 Node.js</strong>
          <p>双击下载的安装包，按提示完成安装</p>
          <p>安装时勾选 "Add to PATH" 选项</p>
        </li>
        <li>
          <strong>验证安装</strong>
          <p>打开命令提示符（CMD）或 PowerShell，输入：</p>
          <div className="code-example">
            <code>node -v</code>
            <p>应显示版本号，如：v18.17.0</p>
          </div>
          <div className="code-example">
            <code>npm -v</code>
            <p>应显示版本号，如：9.6.7</p>
          </div>
        </li>
      </ol>
    </div>

    <div className="info-card">
      <h3>2️⃣ 安装项目依赖</h3>
      <ol className="guide-steps">
        <li>
          <strong>打开项目目录</strong>
          <p>在项目文件夹中打开命令提示符或 PowerShell</p>
          <p>可以在文件夹空白处按住 Shift + 右键，选择"在此处打开 PowerShell"</p>
        </li>
        <li>
          <strong>安装依赖包</strong>
          <div className="code-example">
            <code>npm install</code>
          </div>
          <p>等待安装完成，可能需要几分钟</p>
        </li>
        <li>
          <strong>编译项目</strong>
          <div className="code-example">
            <code>npm run build</code>
          </div>
        </li>
        <li>
          <strong>启动应用</strong>
          <div className="code-example">
            <code>npm start</code>
          </div>
          <p>或者双击项目目录中的 <code>启动应用.bat</code> 文件</p>
        </li>
      </ol>
    </div>

    <div className="info-card">
      <h3>3️⃣ 安装比特浏览器（多账号发布需要）</h3>
      <ol className="guide-steps">
        <li>
          <strong>下载比特浏览器</strong>
          <p>访问官网：<a href="https://www.bitbrowser.cn/" target="_blank" rel="noreferrer">https://www.bitbrowser.cn/</a></p>
        </li>
        <li>
          <strong>安装并注册账号</strong>
          <p>按提示完成安装和注册</p>
        </li>
        <li>
          <strong>创建浏览器窗口</strong>
          <p>在比特浏览器中创建多个窗口，每个窗口登录一个小红书账号</p>
        </li>
        <li>
          <strong>确保比特浏览器已启动</strong>
          <p>使用本工具前，需要先启动比特浏览器</p>
        </li>
      </ol>
      <div className="tip-box">
        💡 <strong>提示：</strong>如果只使用单账号发布，可以跳过比特浏览器，直接使用谷歌浏览器
      </div>
    </div>

    <div className="info-card">
      <h3>4️⃣ 安装谷歌浏览器（单账号发布需要）</h3>
      <ol className="guide-steps">
        <li>
          <strong>下载 Chrome 浏览器</strong>
          <p>访问：<a href="https://www.google.cn/chrome/" target="_blank" rel="noreferrer">https://www.google.cn/chrome/</a></p>
        </li>
        <li>
          <strong>安装 Chrome</strong>
          <p>按提示完成安装</p>
        </li>
      </ol>
      <div className="tip-box">
        💡 <strong>提示：</strong>首次使用时需要手动登录小红书，之后登录状态会自动保存
      </div>
    </div>

    <div className="info-card highlight">
      <h3>📦 快速启动命令汇总</h3>
      <table className="guide-table">
        <thead>
          <tr>
            <th>命令</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>npm install</code></td>
            <td>安装项目依赖（首次运行需要）</td>
          </tr>
          <tr>
            <td><code>npm run build</code></td>
            <td>编译项目</td>
          </tr>
          <tr>
            <td><code>npm start</code></td>
            <td>启动应用</td>
          </tr>
          <tr>
            <td><code>npm run dev</code></td>
            <td>开发模式运行（热更新）</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="info-card">
      <h3>🔧 常见安装问题</h3>
      <div className="faq-item">
        <h4>npm install 报错？</h4>
        <ul>
          <li>检查 Node.js 是否正确安装</li>
          <li>尝试使用管理员权限运行命令提示符</li>
          <li>尝试清除 npm 缓存：<code>npm cache clean --force</code></li>
          <li>删除 node_modules 文件夹后重新安装</li>
        </ul>
      </div>
      <div className="faq-item">
        <h4>npm start 启动失败？</h4>
        <ul>
          <li>确保已运行 <code>npm run build</code> 编译项目</li>
          <li>检查是否有其他程序占用端口</li>
          <li>查看控制台错误信息</li>
        </ul>
      </div>
    </div>
  </div>
);

const FeishuSection: React.FC = () => (
  <div className="guide-section">
    <h2>📊 飞书表格配置</h2>

    <div className="info-card important">
      <h3>📋 第一步：创建飞书表格</h3>
      <p>在飞书中创建一个多维表格，包含以下字段：</p>
      <table className="guide-table">
        <thead>
          <tr>
            <th>字段名</th>
            <th>类型</th>
            <th>必填</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>小红书标题</code></td>
            <td>文本</td>
            <td>✅ 是</td>
            <td>笔记标题，最多20字</td>
          </tr>
          <tr>
            <td><code>小红书文案</code></td>
            <td>文本</td>
            <td>✅ 是</td>
            <td>笔记正文，支持 #话题 格式</td>
          </tr>
          <tr>
            <td><code>小红书封面</code></td>
            <td>附件</td>
            <td>❌ 否</td>
            <td>封面图片，可多张</td>
          </tr>
          <tr>
            <td><code>状态</code></td>
            <td>单选</td>
            <td>✅ 是</td>
            <td>选项：待发布、已发布、发布失败</td>
          </tr>
          <tr>
            <td><code>商品ID</code></td>
            <td>文本</td>
            <td>❌ 否</td>
            <td>关联商品（可选）</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="info-card">
      <h3>🔑 第二步：创建飞书应用</h3>
      <ol className="guide-steps">
        <li>
          <strong>访问飞书开放平台</strong>
          <p>打开 <a href="https://open.feishu.cn/" target="_blank" rel="noreferrer">https://open.feishu.cn/</a></p>
        </li>
        <li>
          <strong>创建企业自建应用</strong>
          <p>点击"创建应用" → 选择"企业自建应用"</p>
        </li>
        <li>
          <strong>获取凭证</strong>
          <p>在应用详情页获取 <code>App ID</code> 和 <code>App Secret</code></p>
        </li>
        <li>
          <strong>添加权限</strong>
          <p>在"权限管理"中添加以下权限：</p>
          <ul>
            <li><code>bitable:app</code> - 多维表格权限</li>
            <li><code>drive:drive</code> - 云文档权限（下载图片需要）</li>
          </ul>
        </li>
        <li>
          <strong>发布应用</strong>
          <p>创建版本并发布应用</p>
        </li>
      </ol>
    </div>

    <div className="info-card">
      <h3>🔗 第三步：获取表格ID</h3>
      <div className="code-example">
        <p><strong>表格URL示例：</strong></p>
        <code>https://xxx.feishu.cn/base/<span className="highlight-text">GGh2bW3Q2aHpi1shiVqcAlhmnMd</span>?table=<span className="highlight-text2">tblLMlVq9PcwZwiU</span></code>
      </div>
      <ul className="id-explain">
        <li>
          <span className="id-label">Base ID（多维表格ID）</span>
          <span className="id-value">GGh2bW3Q2aHpi1shiVqcAlhmnMd</span>
          <span className="id-desc">URL中 /base/ 后面的部分</span>
        </li>
        <li>
          <span className="id-label">Data Table ID（数据表ID）</span>
          <span className="id-value">tblLMlVq9PcwZwiU</span>
          <span className="id-desc">URL中 table= 后面的部分（tbl开头）</span>
        </li>
      </ul>
    </div>

    <div className="info-card">
      <h3>🔐 第四步：授权表格权限</h3>
      <ol className="guide-steps">
        <li>打开你的飞书多维表格</li>
        <li>点击右上角"分享"按钮</li>
        <li>搜索并添加你创建的飞书应用</li>
        <li>授予"可编辑"权限</li>
      </ol>
    </div>
  </div>
);

const ConfigSection: React.FC = () => (
  <div className="guide-section">
    <h2>⚙️ 软件设置步骤</h2>

    <div className="info-card">
      <h3>📝 步骤1：配置飞书连接</h3>
      <ol className="guide-steps">
        <li>点击顶部导航的 <strong>"系统设置"</strong> 标签</li>
        <li>在"飞书配置"区域填写：
          <ul>
            <li><strong>App ID</strong>：飞书应用的 App ID</li>
            <li><strong>App Secret</strong>：飞书应用的 App Secret</li>
            <li><strong>表格 ID</strong>：飞书多维表格的 Base ID</li>
          </ul>
        </li>
        <li>点击 <strong>"测试连接"</strong> 按钮验证配置是否正确</li>
        <li>看到绿色提示"连接成功"即可</li>
      </ol>
    </div>

    <div className="info-card">
      <h3>🌐 步骤2：选择浏览器类型</h3>
      <div className="option-cards">
        <div className="option-card">
          <h4>🖥️ 比特浏览器</h4>
          <p>适合多账号同时发布</p>
          <ul>
            <li>需要先安装比特浏览器</li>
            <li>在比特浏览器中创建多个窗口</li>
            <li>每个窗口登录一个小红书账号</li>
            <li>确保比特浏览器已启动</li>
          </ul>
        </div>
        <div className="option-card">
          <h4>🌐 谷歌浏览器</h4>
          <p>适合单账号发布</p>
          <ul>
            <li>使用本地Chrome浏览器</li>
            <li>首次使用需手动登录小红书</li>
            <li>登录状态会自动保存</li>
          </ul>
        </div>
      </div>
    </div>

    <div className="info-card">
      <h3>📷 步骤3：选择图片来源</h3>
      <div className="option-cards">
        <div className="option-card recommended">
          <span className="badge">推荐</span>
          <h4>飞书图片</h4>
          <p>从飞书表格的"小红书封面"字段自动下载图片</p>
        </div>
        <div className="option-card">
          <h4>文字配图</h4>
          <p>使用小红书AI自动生成封面，无需上传图片</p>
        </div>
        <div className="option-card">
          <h4>本地图片</h4>
          <p>需要配置本地图片目录，按商品ID匹配图片</p>
        </div>
      </div>
    </div>

    <div className="info-card important">
      <h3>🔗 步骤4：配置窗口-表格映射（重要！）</h3>
      <p>如果使用比特浏览器，需要为每个窗口配置对应的飞书表格：</p>
      <ol className="guide-steps">
        <li>在"系统设置"页面，找到"浏览器窗口"区域</li>
        <li>点击 <strong>"刷新窗口列表"</strong> 获取比特浏览器的所有窗口</li>
        <li>找到要配置的窗口，点击 <strong>"添加"</strong> 按钮</li>
        <li>在弹出的配置框中填写：
          <ul>
            <li><strong>Base ID</strong>：飞书多维表格ID</li>
            <li><strong>数据表ID</strong>：具体数据表ID（tbl开头）</li>
          </ul>
        </li>
        <li>点击 <strong>"保存配置"</strong></li>
      </ol>
      <div className="tip-box">
        💡 <strong>提示：</strong>每个窗口可以对应不同的飞书表格，实现多账号发布不同内容
      </div>
    </div>

    <div className="info-card">
      <h3>💾 步骤5：保存配置</h3>
      <p>完成所有设置后，点击页面底部的 <strong>"保存配置"</strong> 按钮</p>
    </div>
  </div>
);

const PublishSection: React.FC = () => (
  <div className="guide-section">
    <h2>🚀 发布操作流程</h2>

    <div className="info-card">
      <h3>📥 步骤1：加载笔记</h3>
      <ol className="guide-steps">
        <li>点击顶部导航的 <strong>"发布管理"</strong> 标签</li>
        <li>点击 <strong>"刷新笔记"</strong> 按钮</li>
        <li>系统会自动从飞书表格加载所有"待发布"状态的笔记</li>
        <li>每个窗口会显示对应表格中的待发布笔记数量</li>
      </ol>
    </div>

    <div className="info-card">
      <h3>✅ 步骤2：选择要发布的内容</h3>
      <ul className="guide-list">
        <li><strong>勾选窗口</strong>：勾选要发布的窗口（账号）</li>
        <li><strong>全选</strong>：点击"全选"快速选择所有窗口</li>
        <li><strong>清空笔记</strong>：清除当前加载的笔记列表</li>
      </ul>
    </div>

    <div className="info-card highlight">
      <h3>▶️ 步骤3：开始发布</h3>
      <ol className="guide-steps">
        <li>确认已选择要发布的窗口</li>
        <li>点击 <strong>"开始发布"</strong> 按钮</li>
        <li>系统会自动执行以下操作：
          <ul>
            <li>打开比特浏览器窗口</li>
            <li>访问小红书发布页面</li>
            <li>上传图片（或使用文字配图）</li>
            <li>填写标题和正文</li>
            <li>自动选择话题标签</li>
            <li>点击发布按钮</li>
            <li>更新飞书表格状态为"已发布"</li>
          </ul>
        </li>
      </ol>
    </div>

    <div className="info-card">
      <h3>📊 步骤4：查看发布结果</h3>
      <ul className="guide-list">
        <li>发布过程中可以在控制台查看实时日志</li>
        <li>发布完成后，飞书表格中的状态会自动更新</li>
        <li>可以在"日志查询"标签查看历史发布记录</li>
      </ul>
    </div>

    <div className="info-card">
      <h3>⏹️ 停止发布</h3>
      <p>如需中断发布，点击 <strong>"停止发布"</strong> 按钮</p>
    </div>
  </div>
);

const FaqSection: React.FC = () => (
  <div className="guide-section">
    <h2>❓ 常见问题</h2>

    <div className="faq-item">
      <h4>Q1: 标题被截断了怎么办？</h4>
      <p>小红书标题限制20个字符。系统会智能处理：</p>
      <ul>
        <li>纯文字不超过20字：保留完整标题（包括emoji）</li>
        <li>纯文字超过20字：自动截断到20字</li>
      </ul>
    </div>

    <div className="faq-item">
      <h4>Q2: 飞书图片为空怎么办？</h4>
      <p>如果飞书表格中没有上传封面图片，系统会自动切换到"文字配图"模式，使用小红书的AI功能生成封面。</p>
    </div>

    <div className="faq-item">
      <h4>Q3: 发布后状态没有更新？</h4>
      <p>检查以下几点：</p>
      <ul>
        <li>飞书应用是否有表格编辑权限</li>
        <li>表格中是否有"状态"字段</li>
        <li>状态字段是否为单选类型</li>
        <li>窗口映射中的数据表ID是否正确</li>
      </ul>
    </div>

    <div className="faq-item">
      <h4>Q4: 比特浏览器窗口不显示？</h4>
      <p>解决方法：</p>
      <ul>
        <li>确保比特浏览器已启动</li>
        <li>点击"刷新窗口列表"</li>
        <li>检查比特浏览器API是否正常（默认端口54345）</li>
      </ul>
    </div>

    <div className="faq-item">
      <h4>Q5: 如何添加话题标签？</h4>
      <p>在飞书表格的"小红书文案"字段中使用 <code>#话题名</code> 格式：</p>
      <div className="code-example">
        <code>这是正文内容 #小红书 #分享日常 #好物推荐</code>
      </div>
      <p>系统会自动识别并选择对应话题。</p>
    </div>

    <div className="faq-item">
      <h4>Q6: 测试连接失败？</h4>
      <p>可能的原因：</p>
      <ul>
        <li>App ID 或 App Secret 填写错误</li>
        <li>飞书应用未发布</li>
        <li>表格ID填写错误</li>
        <li>飞书应用没有表格访问权限</li>
      </ul>
    </div>

    <div className="faq-item">
      <h4>Q7: 如何查看发布日志？</h4>
      <p>点击顶部导航的"日志查询"标签，可以查看所有发布记录和错误信息。</p>
    </div>
  </div>
);

export default UserGuide;
