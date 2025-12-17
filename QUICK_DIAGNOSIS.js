/**
 * 飞书连接快速诊断脚本
 * 
 * 使用方法：
 * 1. 打开浏览器开发者工具 (F12)
 * 2. 切换到 Console 标签
 * 3. 复制整个脚本到控制台
 * 4. 按 Enter 运行
 * 5. 按照提示输入 App ID、App Secret 和 Base ID
 */

async function quickDiagnosis() {
  console.clear();
  console.log('%c🔍 飞书连接快速诊断工具', 'font-size: 16px; font-weight: bold; color: #1890ff;');
  console.log('%c请按照提示输入信息\n', 'color: #666;');

  // 获取用户输入
  const appId = prompt('请输入飞书 App ID:');
  if (!appId) {
    console.error('❌ 已取消');
    return;
  }

  const appSecret = prompt('请输入飞书 App Secret:');
  if (!appSecret) {
    console.error('❌ 已取消');
    return;
  }

  const baseId = prompt('请输入飞书 Base ID (从 URL 中复制):');
  if (!baseId) {
    console.error('❌ 已取消');
    return;
  }

  console.log('\n%c开始诊断...', 'font-weight: bold;');
  console.log('App ID:', appId.substring(0, 5) + '***');
  console.log('App Secret:', appSecret.substring(0, 5) + '***');
  console.log('Base ID:', baseId);

  // 步骤 1：测试网络
  console.log('\n%c步骤 1: 测试网络连接', 'font-weight: bold; color: #1890ff;');
  try {
    const testResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: 'test', app_secret: 'test' })
    });
    console.log('✅ 网络连接正常 (HTTP', testResponse.status + ')');
  } catch (e) {
    console.error('❌ 网络连接失败:', e.message);
    console.error('可能原因：');
    console.error('  • 网络未连接');
    console.error('  • 防火墙阻止');
    console.error('  • 飞书服务不可用');
    return;
  }

  // 步骤 2：获取 Token
  console.log('\n%c步骤 2: 获取 Token', 'font-weight: bold; color: #1890ff;');
  let accessToken;
  try {
    const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret })
    });
    const tokenData = await tokenResponse.json();

    if (tokenData.code !== 0) {
      console.error('❌ Token 获取失败');
      console.error('错误代码:', tokenData.code);
      console.error('错误信息:', tokenData.msg);
      console.error('\n可能原因：');
      
      const errorReasons = {
        '1': '• App ID 或 App Secret 错误 - 请检查是否复制正确',
        '4': '• App ID 不存在 - 请确认 App ID 是否正确',
        '5': '• 应用已禁用 - 请在飞书开放平台启用应用',
        '6': '• 应用未发布 - 请在飞书开放平台发布应用',
        '13': '• 应用权限不足 - 需要添加 bitable:app:readonly 权限',
      };
      
      if (errorReasons[tokenData.code]) {
        console.error(errorReasons[tokenData.code]);
      } else {
        console.error('• 未知错误，请查看错误信息');
      }
      return;
    }

    accessToken = tokenData.tenant_access_token;
    console.log('✅ Token 获取成功');
    console.log('Token:', accessToken.substring(0, 20) + '...');
  } catch (e) {
    console.error('❌ Token 获取异常:', e.message);
    return;
  }

  // 步骤 3：验证 Base ID 格式
  console.log('\n%c步骤 3: 验证 Base ID 格式', 'font-weight: bold; color: #1890ff;');
  if (!baseId.match(/^[a-zA-Z0-9]{20,}$/)) {
    console.error('❌ Base ID 格式错误');
    console.error('Base ID 应该是 20+ 个字母和数字');
    console.error('当前 Base ID:', baseId);
    console.error('长度:', baseId.length);
    return;
  }
  console.log('✅ Base ID 格式正确');

  // 步骤 4：读取表格
  console.log('\n%c步骤 4: 读取表格', 'font-weight: bold; color: #1890ff;');
  try {
    const tableResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${baseId}/tables`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const tableData = await tableResponse.json();

    if (tableData.code !== 0) {
      console.error('❌ 表格读取失败');
      console.error('错误代码:', tableData.code);
      console.error('错误信息:', tableData.msg);
      console.error('\n可能原因：');
      
      const errorReasons = {
        '91402': '• Base ID 不存在或格式错误 - 请检查 Base ID 是否正确',
        '99991001': '• 应用权限不足 - 需要添加 bitable:app:readonly 权限',
        '99991002': '• 应用未发布 - 请在飞书开放平台发布应用',
      };
      
      if (errorReasons[tableData.code]) {
        console.error(errorReasons[tableData.code]);
      } else {
        console.error('• 未知错误，请查看错误信息');
      }
      return;
    }

    const tableCount = tableData.data?.items?.length || 0;
    console.log('✅ 表格读取成功');
    console.log('找到', tableCount, '个表格');
    
    if (tableCount > 0) {
      console.log('\n表格列表：');
      tableData.data.items.forEach((table, index) => {
        console.log(`  ${index + 1}. ${table.name} (ID: ${table.table_id})`);
      });
    }
  } catch (e) {
    console.error('❌ 表格读取异常:', e.message);
    return;
  }

  // 步骤 5：读取记录
  console.log('\n%c步骤 5: 读取表格记录', 'font-weight: bold; color: #1890ff;');
  try {
    const firstTableId = tableData.data.items[0].table_id;
    const recordsResponse = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${baseId}/tables/${firstTableId}/records`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const recordsData = await recordsResponse.json();

    if (recordsData.code !== 0) {
      console.error('❌ 记录读取失败:', recordsData.msg);
      return;
    }

    const recordCount = recordsData.data?.items?.length || 0;
    console.log('✅ 记录读取成功');
    console.log('找到', recordCount, '条记录');
    
    if (recordCount > 0) {
      console.log('\n第一条记录的字段：');
      const firstRecord = recordsData.data.items[0];
      Object.entries(firstRecord.fields).forEach(([key, value]) => {
        console.log(`  • ${key}: ${JSON.stringify(value).substring(0, 50)}`);
      });
    }
  } catch (e) {
    console.error('❌ 记录读取异常:', e.message);
    return;
  }

  // 诊断完成
  console.log('\n%c🎉 诊断完成！所有连接正常', 'font-size: 14px; font-weight: bold; color: #52c41a;');
  console.log('\n现在你可以在插件中使用这些凭证了：');
  console.log('App ID:', appId);
  console.log('App Secret:', appSecret);
  console.log('Base ID:', baseId);
}

// 运行诊断
quickDiagnosis().catch(e => console.error('诊断出错:', e));
