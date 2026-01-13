import { useState, useEffect } from 'react';
import type { Config, BitBrowserWindow, WindowTableMapping, BrowserType, AIConfig } from '../../types';
import './ConfigSettings.css';

// 预设模型列表
const TEXT_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview (最新)' },
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (实验)' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'gemini-exp-1206', name: 'Gemini Exp 1206' },
  { id: 'custom', name: '自定义...' },
];

const IMAGE_MODELS = [
  { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image (最新)' },
  { id: 'imagen-3.0-generate-001', name: 'Imagen 3.0' },
  { id: 'imagen-3.0-fast-generate-001', name: 'Imagen 3.0 Fast' },
  { id: 'custom', name: '自定义...' },
];

function ConfigSettings(): JSX.Element {
  const [config, setConfig] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  // 比特浏览器窗口
  const [windows, setWindows] = useState<BitBrowserWindow[]>([]);
  const [mappings, setMappings] = useState<WindowTableMapping[]>([]);
  const [loadingWindows, setLoadingWindows] = useState(false);
  
  // 飞书测试
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [testingWindowId, setTestingWindowId] = useState<string | null>(null);
  const [mappingTestResults, setMappingTestResults] = useState<Record<string, any>>({});
  const [testingAll, setTestingAll] = useState(false);
  
  // AI 配置
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    geminiApiKey: '',
    textModel: 'gemini-3-flash-preview',
    imageModel: 'gemini-3-pro-image-preview',
    titlePromptTemplate: '',
    contentPromptTemplate: '',
    imagePromptTemplate: '',
  });
  const [testingAiText, setTestingAiText] = useState(false);
  const [testingAiImage, setTestingAiImage] = useState(false);
  const [aiTextResult, setAiTextResult] = useState<any>(null);
  const [aiImageResult, setAiImageResult] = useState<any>(null);
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [batchGenerateResult, setBatchGenerateResult] = useState<any>(null);
  const [clearingGenerated, setClearingGenerated] = useState(false);
  const [clearResult, setClearResult] = useState<any>(null);

  useEffect(() => {
    loadConfig();
    loadWindows();
  }, []);

  const loadConfig = async (): Promise<void> => {
    try {
      const cfg = await (window as any).api.config.get();
      console.log('Loaded config:', cfg);
      console.log('Window table mappings:', cfg.windowTableMappings);
      setConfig(cfg);
      setMappings(cfg.windowTableMappings || []);
      // 加载 AI 配置
      if (cfg.ai) {
        setAiConfig({
          geminiApiKey: cfg.ai.geminiApiKey || '',
          textModel: cfg.ai.textModel || 'gemini-3-flash-preview',
          imageModel: cfg.ai.imageModel || 'gemini-3-pro-image-preview',
          customTextModel: cfg.ai.customTextModel || '',
          customImageModel: cfg.ai.customImageModel || '',
          titlePromptTemplate: cfg.ai.titlePromptTemplate || '',
          contentPromptTemplate: cfg.ai.contentPromptTemplate || '',
          imagePromptTemplate: cfg.ai.imagePromptTemplate || '',
        });
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      setMessage('❌ 加载配置失败');
    }
  };

  const loadWindows = async (): Promise<void> => {
    setLoadingWindows(true);
    try {
      const windowList = await (window as any).api.bitBrowser.getWindows();
      setWindows(windowList);
    } catch (error) {
      console.log('获取比特浏览器窗口失败，请确保比特浏览器已启动');
    } finally {
      setLoadingWindows(false);
    }
  };

  // 测试飞书连接（单个）
  const handleTestFeishu = async (tableId?: string, windowId?: string, dataTableId?: string): Promise<void> => {
    if (!config?.feishu.appId || !config?.feishu.appSecret) {
      setMessage('❌ 请先填写 App ID 和 App Secret');
      return;
    }

    const testTableId = tableId || config.feishu.tableId || (mappings.length > 0 ? mappings[0].feishuTableId : '');
    if (!testTableId) {
      setMessage('❌ 请填写表格ID');
      return;
    }

    setTesting(true);
    setTestingWindowId(windowId || null);
    setMessage('正在测试飞书连接...');
    
    // 如果是测试全局配置，清除全局测试结果
    if (!windowId) {
      setTestResult(null);
    }

    try {
      const result = await (window as any).api.feishu.test(
        config.feishu.appId,
        config.feishu.appSecret,
        testTableId,
        dataTableId  // 传递数据表ID
      );
      
      // 根据是否有 windowId 决定存储位置
      if (windowId) {
        setMappingTestResults(prev => ({ ...prev, [windowId]: result }));
      } else {
        setTestResult(result);
      }
      
      if (result.success) {
        setMessage(`✅ 连接成功！表格: ${result.tableName}, 总记录: ${result.recordCount}, 待发布: ${result.pendingCount}`);
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (error) {
      setMessage('❌ 测试失败: ' + (error as Error).message);
    } finally {
      setTesting(false);
      setTestingWindowId(null);
    }
  };

  // 测试所有映射
  const handleTestAllMappings = async (): Promise<void> => {
    if (!config?.feishu.appId || !config?.feishu.appSecret) {
      setMessage('❌ 请先填写 App ID 和 App Secret');
      return;
    }

    if (mappings.length === 0) {
      setMessage('❌ 没有配置映射');
      return;
    }

    const validMappings = mappings.filter(m => m.feishuTableId);
    if (validMappings.length === 0) {
      setMessage('❌ 没有配置表格ID的映射');
      return;
    }

    setTestingAll(true);
    setMappingTestResults({});
    setMessage(`正在测试 ${validMappings.length} 个映射...`);

    let successCount = 0;
    let failCount = 0;

    // 逐个测试，避免并发问题
    for (const mapping of validMappings) {
      setTestingWindowId(mapping.windowId);
      
      try {
        const result = await (window as any).api.feishu.test(
          config.feishu.appId,
          config.feishu.appSecret,
          mapping.feishuTableId,
          mapping.feishuDataTableId
        );
        
        setMappingTestResults(prev => ({ ...prev, [mapping.windowId]: result }));
        
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
        setMappingTestResults(prev => ({ 
          ...prev, 
          [mapping.windowId]: { success: false, error: (error as Error).message } 
        }));
      }
    }

    setTestingWindowId(null);
    setTestingAll(false);
    setMessage(`✅ 测试完成：成功 ${successCount} 个，失败 ${failCount} 个`);
  };

  const handleAddMapping = (win: BitBrowserWindow): void => {
    if (mappings.find(m => m.windowId === win.id)) {
      setMessage('该窗口已添加');
      return;
    }
    
    const newMapping: WindowTableMapping = {
      windowId: win.id,
      windowName: win.name,
      feishuTableId: '',
    };
    setMappings([...mappings, newMapping]);
  };

  const handleRemoveMapping = (windowId: string): void => {
    setMappings(mappings.filter(m => m.windowId !== windowId));
  };

  const handleTableIdChange = (windowId: string, tableId: string): void => {
    setMappings(mappings.map(m => 
      m.windowId === windowId ? { ...m, feishuTableId: tableId } : m
    ));
  };

  const handleDataTableIdChange = (windowId: string, dataTableId: string): void => {
    setMappings(mappings.map(m => 
      m.windowId === windowId ? { ...m, feishuDataTableId: dataTableId } : m
    ));
  };

  const handleSaveConfig = async (): Promise<void> => {
    if (!config) return;

    setSaving(true);
    try {
      const updatedConfig = {
        ...config,
        windowTableMappings: mappings,
        ai: aiConfig,
      };
      await (window as any).api.config.set(updatedConfig);
      await (window as any).api.config.save();
      setMessage('✅ 配置保存成功');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save config:', error);
      setMessage('❌ 配置保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 测试 AI 文案生成
  const handleTestAiText = async (): Promise<void> => {
    if (!aiConfig.geminiApiKey) {
      setMessage('❌ 请先填写 Gemini API Key');
      return;
    }
    
    const modelId = aiConfig.textModel === 'custom' 
      ? aiConfig.customTextModel 
      : aiConfig.textModel;
    
    if (!modelId) {
      setMessage('❌ 请选择或输入文案模型');
      return;
    }
    
    setTestingAiText(true);
    setAiTextResult(null);
    setMessage('正在测试文案模型...');
    
    try {
      const result = await (window as any).api.ai.testText(aiConfig.geminiApiKey, modelId);
      
      if (result.success) {
        setAiTextResult({
          success: true,
          modelName: modelId,
        });
        setMessage('✅ 文案模型连接成功');
      } else {
        setAiTextResult({ success: false, error: result.error });
        setMessage(`❌ ${result.error}`);
      }
    } catch (error: any) {
      setAiTextResult({ success: false, error: error.message });
      setMessage(`❌ 测试失败: ${error.message}`);
    } finally {
      setTestingAiText(false);
    }
  };

  // 测试 AI 图片生成
  const handleTestAiImage = async (): Promise<void> => {
    if (!aiConfig.geminiApiKey) {
      setMessage('❌ 请先填写 Gemini API Key');
      return;
    }
    
    setTestingAiImage(true);
    setAiImageResult(null);
    
    try {
      const modelId = aiConfig.imageModel === 'custom' 
        ? aiConfig.customImageModel 
        : aiConfig.imageModel;
      
      const result = await (window as any).api.ai.testImage(aiConfig.geminiApiKey, modelId);
      
      if (result.success) {
        setAiImageResult({ success: true, modelName: modelId });
        setMessage('✅ 图片模型连接成功');
      } else {
        setAiImageResult({ success: false, error: result.error });
        setMessage(`❌ ${result.error}`);
      }
    } catch (error: any) {
      setAiImageResult({ success: false, error: error.message });
      setMessage(`❌ 测试失败: ${error.message}`);
    } finally {
      setTestingAiImage(false);
    }
  };

  // 批量生成 AI 内容
  const handleBatchGenerate = async (): Promise<void> => {
    if (!aiConfig.geminiApiKey) {
      setMessage('❌ 请先配置 Gemini API Key');
      return;
    }

    if (!config?.feishu.appId || !config?.feishu.appSecret || !config?.feishu.tableId) {
      setMessage('❌ 请先配置飞书连接');
      return;
    }

    if (!aiConfig.titlePromptTemplate && !aiConfig.contentPromptTemplate && !aiConfig.imagePromptTemplate) {
      setMessage('❌ 请至少配置一个提示词模板');
      return;
    }

    setGeneratingBatch(true);
    setBatchGenerateResult(null);
    setMessage('🤖 开始批量生成内容...');

    try {
      const results = await (window as any).api.ai.generateBatch();
      
      if (Array.isArray(results)) {
        const successCount = results.filter((r: any) => r.success).length;
        const totalCount = results.length;
        
        setBatchGenerateResult({
          success: true,
          total: totalCount,
          successCount,
          failCount: totalCount - successCount,
          results,
        });
        
        setMessage(`✅ 批量生成完成：成功 ${successCount}/${totalCount} 条`);
      } else if (results.error) {
        setBatchGenerateResult({ success: false, error: results.error });
        setMessage(`❌ ${results.error}`);
      }
    } catch (error: any) {
      setBatchGenerateResult({ success: false, error: error.message });
      setMessage(`❌ 批量生成失败: ${error.message}`);
    } finally {
      setGeneratingBatch(false);
    }
  };

  // 清空已生成的内容
  const handleClearGenerated = async (): Promise<void> => {
    if (!config?.feishu.appId || !config?.feishu.appSecret || !config?.feishu.tableId) {
      setMessage('❌ 请先配置飞书连接');
      return;
    }

    const confirmed = window.confirm('确定要清空所有已生成的内容吗？\n\n这将清空状态为"已生成"的记录的标题、文案和封面，并将状态改为空。');
    if (!confirmed) {
      return;
    }

    setClearingGenerated(true);
    setClearResult(null);
    setMessage('🧹 正在清空已生成的内容...');

    try {
      const result = await (window as any).api.ai.clearGenerated();
      
      if (result.success) {
        setClearResult({ success: true, count: result.count });
        setMessage(`✅ 清空完成：已清空 ${result.count} 条记录`);
      } else {
        setClearResult({ success: false, error: result.error });
        setMessage(`❌ ${result.error}`);
      }
    } catch (error: any) {
      setClearResult({ success: false, error: error.message });
      setMessage(`❌ 清空失败: ${error.message}`);
    } finally {
      setClearingGenerated(false);
    }
  };

  if (!config) {
    return <div className="config-settings">加载中...</div>;
  }

  return (
    <div className="config-settings">
      <h2>系统设置</h2>

      {/* 飞书配置 */}
      <div className="config-section">
        <div className="section-header">
          <h3>飞书配置</h3>
          <button 
            className="btn-test" 
            onClick={() => handleTestFeishu()} 
            disabled={testing}
          >
            {testing ? '测试中...' : '测试连接'}
          </button>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>App ID</label>
            <input
              type="text"
              value={config.feishu.appId}
              onChange={(e) =>
                setConfig({
                  ...config,
                  feishu: { ...config.feishu, appId: e.target.value },
                })
              }
              placeholder="cli_xxxxxxxxx"
            />
          </div>
          <div className="form-group">
            <label>App Secret</label>
            <input
              type="password"
              value={config.feishu.appSecret}
              onChange={(e) =>
                setConfig({
                  ...config,
                  feishu: { ...config.feishu, appSecret: e.target.value },
                })
              }
              placeholder="输入 App Secret"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>默认表格ID (Base ID)</label>
            <input
              type="text"
              value={config.feishu.tableId}
              onChange={(e) =>
                setConfig({
                  ...config,
                  feishu: { ...config.feishu, tableId: e.target.value },
                })
              }
              placeholder="GGh2bW3Q2aHpi1shiVqcAlhmnMd"
            />
          </div>
        </div>
        
        {/* 测试结果 */}
        {testResult && (
          <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
            <div className="result-item">
              <span className="label">Token获取:</span>
              <span className={testResult.tokenOk ? 'ok' : 'fail'}>
                {testResult.tokenOk ? '✅ 成功' : '❌ 失败'}
              </span>
            </div>
            <div className="result-item">
              <span className="label">表格访问:</span>
              <span className={testResult.tableOk ? 'ok' : 'fail'}>
                {testResult.tableOk ? `✅ ${testResult.tableName}` : '❌ 失败'}
              </span>
            </div>
            <div className="result-item">
              <span className="label">记录数量:</span>
              <span>{testResult.recordCount} 条 (待发布: {testResult.pendingCount} 条)</span>
            </div>
            {testResult.fields && testResult.fields.length > 0 && (
              <div className="result-item">
                <span className="label">字段列表:</span>
                <span className="fields">{testResult.fields.join(', ')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI 配置 */}
      <div className="config-section ai-config-section">
        <div className="section-header">
          <h3>🤖 AI 配置 (Gemini)</h3>
          <div className="ai-action-buttons">
            <button 
              className="btn-clear-generated" 
              onClick={handleClearGenerated}
              disabled={clearingGenerated || !config?.feishu.appId}
              title="清空所有已生成的内容，以便重新生成"
            >
              {clearingGenerated ? '清空中...' : '🧹 清空已生成'}
            </button>
            <button 
              className="btn-batch-generate" 
              onClick={handleBatchGenerate}
              disabled={generatingBatch || !aiConfig.geminiApiKey}
            >
              {generatingBatch ? '生成中...' : '🚀 批量生成内容'}
            </button>
          </div>
        </div>
        <p className="help-text">配置 Gemini API 用于自动生成小红书文案和图片</p>
        
        <div className="form-row">
          <div className="form-group">
            <label>Gemini API Key</label>
            <input
              type="password"
              value={aiConfig.geminiApiKey || ''}
              onChange={(e) => setAiConfig({ ...aiConfig, geminiApiKey: e.target.value })}
              placeholder="AIzaSy..."
            />
            <p className="help-text">从 Google AI Studio 获取: aistudio.google.com</p>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>文案生成模型</label>
            <div className="model-selector">
              <select
                value={aiConfig.textModel || 'gemini-2.5-flash'}
                onChange={(e) => setAiConfig({ ...aiConfig, textModel: e.target.value })}
              >
                {TEXT_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <button 
                className="btn-ai-test" 
                onClick={handleTestAiText}
                disabled={testingAiText || !aiConfig.geminiApiKey}
              >
                {testingAiText ? '测试中...' : '测试文案'}
              </button>
            </div>
            {aiConfig.textModel === 'custom' && (
              <div className="custom-model-input">
                <label>自定义模型名称</label>
                <input
                  type="text"
                  value={aiConfig.customTextModel || ''}
                  onChange={(e) => setAiConfig({ ...aiConfig, customTextModel: e.target.value })}
                  placeholder="输入模型名称，如 gemini-2.5-flash"
                />
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label>图片生成模型</label>
            <div className="model-selector">
              <select
                value={aiConfig.imageModel || 'gemini-3-pro-image-preview'}
                onChange={(e) => setAiConfig({ ...aiConfig, imageModel: e.target.value })}
              >
                {IMAGE_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <button 
                className="btn-ai-test" 
                onClick={handleTestAiImage}
                disabled={testingAiImage || !aiConfig.geminiApiKey}
              >
                {testingAiImage ? '测试中...' : '测试图片'}
              </button>
            </div>
            {aiConfig.imageModel === 'custom' && (
              <div className="custom-model-input">
                <label>自定义模型名称</label>
                <input
                  type="text"
                  value={aiConfig.customImageModel || ''}
                  onChange={(e) => setAiConfig({ ...aiConfig, customImageModel: e.target.value })}
                  placeholder="输入模型名称，如 gemini-3-pro-image-preview"
                />
              </div>
            )}
          </div>
        </div>

        {/* 文案测试结果 */}
        {aiTextResult && (
          <div className={`ai-test-result ${aiTextResult.success ? 'success' : 'error'}`}>
            {aiTextResult.success ? (
              <>
                <span>✅ 文案模型连接成功: {aiTextResult.modelName}</span>
                {aiTextResult.generatedText && (
                  <pre>{aiTextResult.generatedText.substring(0, 300)}...</pre>
                )}
              </>
            ) : (
              <span>❌ {aiTextResult.error}</span>
            )}
          </div>
        )}

        {/* 图片测试结果 */}
        {aiImageResult && (
          <div className={`ai-test-result ${aiImageResult.success ? 'success' : 'error'}`}>
            {aiImageResult.success ? (
              <span>✅ 图片模型连接成功: {aiImageResult.modelName}</span>
            ) : (
              <span>❌ {aiImageResult.error}</span>
            )}
          </div>
        )}

        {/* 批量生成结果 */}
        {batchGenerateResult && (
          <div className={`ai-test-result ${batchGenerateResult.success ? 'success' : 'error'}`}>
            {batchGenerateResult.success ? (
              <div>
                <p>✅ 批量生成完成</p>
                <p>总计: {batchGenerateResult.total} 条，成功: {batchGenerateResult.successCount} 条，失败: {batchGenerateResult.failCount} 条</p>
                {batchGenerateResult.results && batchGenerateResult.results.length > 0 && (
                  <details style={{ marginTop: '10px' }}>
                    <summary style={{ cursor: 'pointer' }}>查看详情</summary>
                    <div style={{ maxHeight: '200px', overflow: 'auto', marginTop: '10px' }}>
                      {batchGenerateResult.results.map((r: any, i: number) => (
                        <div key={i} style={{ padding: '5px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          {r.success ? (
                            <span>✅ 记录 {r.recordId.substring(0, 8)}... 生成成功</span>
                          ) : (
                            <span>❌ 记录 {r.recordId.substring(0, 8)}... 失败: {r.error}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ) : (
              <span>❌ {batchGenerateResult.error}</span>
            )}
          </div>
        )}

        {/* 清空结果 */}
        {clearResult && (
          <div className={`ai-test-result ${clearResult.success ? 'success' : 'error'}`}>
            {clearResult.success ? (
              <span>✅ 已清空 {clearResult.count} 条记录的生成内容</span>
            ) : (
              <span>❌ {clearResult.error}</span>
            )}
          </div>
        )}

        {/* 预留国内 API */}
        <div className="domestic-api-section">
          <h4>🇨🇳 国内 API（预留）</h4>
          <div className="form-row">
            <div className="form-group">
              <label>通义千问 API Key</label>
              <input
                type="password"
                value={aiConfig.qwenApiKey || ''}
                onChange={(e) => setAiConfig({ ...aiConfig, qwenApiKey: e.target.value })}
                placeholder="暂未开放"
                disabled
              />
            </div>
            <div className="form-group">
              <label>通义万相 API Key</label>
              <input
                type="password"
                value={aiConfig.wanxiangApiKey || ''}
                onChange={(e) => setAiConfig({ ...aiConfig, wanxiangApiKey: e.target.value })}
                placeholder="暂未开放"
                disabled
              />
            </div>
          </div>
        </div>

        {/* 提示词模板配置 */}
        <div className="prompt-templates-section">
          <h4>📝 提示词模板配置</h4>
          <p className="help-text">自定义 AI 生成内容的提示词，使用 <code>{'{{主题}}'}</code> 作为占位符</p>
          
          <div className="form-group">
            <label>标题生成提示词</label>
            <textarea
              value={aiConfig.titlePromptTemplate || ''}
              onChange={(e) => setAiConfig({ ...aiConfig, titlePromptTemplate: e.target.value })}
              placeholder={'例如：请根据主题"{{主题}}"生成一个吸引人的小红书标题，要求简洁有力，包含关键词，长度15-25字。'}
              rows={4}
            />
          </div>

          <div className="form-group">
            <label>文案生成提示词</label>
            <textarea
              value={aiConfig.contentPromptTemplate || ''}
              onChange={(e) => setAiConfig({ ...aiConfig, contentPromptTemplate: e.target.value })}
              placeholder={'例如：请根据主题"{{主题}}"生成小红书文案。要求：1. 风格活泼有趣 2. 使用emoji 3. 末尾包含3-5个#标签 4. 长度200-500字'}
              rows={6}
            />
          </div>

          <div className="form-group">
            <label>图片生成提示词</label>
            <textarea
              value={aiConfig.imagePromptTemplate || ''}
              onChange={(e) => setAiConfig({ ...aiConfig, imagePromptTemplate: e.target.value })}
              placeholder={'例如：生成一张关于"{{主题}}"的小红书封面图，风格清新明亮，适合社交媒体分享，高清精美。'}
              rows={4}
            />
          </div>

          <div className="prompt-tips">
            <p>💡 提示词编写技巧：</p>
            <ul>
              <li>使用 <code>{'{{主题}}'}</code> 占位符会被替换为飞书表格中的"主题"字段内容</li>
              <li>文案提示词中要求在末尾包含 #标签，这样发布时可以自动提取</li>
              <li>可以指定风格、长度、格式等具体要求</li>
              <li>留空则不生成对应内容</li>
            </ul>
          </div>
        </div>
      </div>


      {/* 图片和发布设置 */}
      <div className="config-section">
        <h3>发布设置</h3>
        
        {/* 浏览器类型选择 */}
        <div className="form-row">
          <div className="form-group">
            <label>浏览器类型</label>
            <div className="browser-selector">
              <label className={`browser-option ${config.browserType === 'bitbrowser' || !config.browserType ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="browserType"
                  value="bitbrowser"
                  checked={config.browserType === 'bitbrowser' || !config.browserType}
                  onChange={() => setConfig({ ...config, browserType: 'bitbrowser' as BrowserType })}
                />
                <span className="browser-icon">🌐</span>
                <span className="browser-name">比特浏览器</span>
                <span className="browser-desc">多账号并行发布</span>
              </label>
              <label className={`browser-option ${config.browserType === 'chrome' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="browserType"
                  value="chrome"
                  checked={config.browserType === 'chrome'}
                  onChange={() => setConfig({ ...config, browserType: 'chrome' as BrowserType })}
                />
                <span className="browser-icon">🔵</span>
                <span className="browser-name">谷歌浏览器</span>
                <span className="browser-desc">单账号串行发布</span>
              </label>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label>本地图片目录</label>
            <div className="input-with-button">
              <input
                type="text"
                value={config.imageDir || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    imageDir: e.target.value,
                  })
                }
                placeholder="选择图片存放目录"
              />
              <button
                className="btn-browse"
                onClick={async () => {
                  try {
                    const dir = await (window as any).api.dialog.selectDirectory();
                    if (dir) {
                      setConfig({ ...config, imageDir: dir });
                    }
                  } catch (error) {
                    console.error('选择目录失败:', error);
                  }
                }}
              >
                浏览
              </button>
            </div>
            <p className="help-text">图片文件名需与商品ID一致，如：123456.png</p>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>发布间隔（秒）</label>
            <input
              type="number"
              value={config.publishInterval}
              onChange={(e) =>
                setConfig({
                  ...config,
                  publishInterval: parseInt(e.target.value) || 30,
                })
              }
              min="10"
              max="300"
            />
          </div>
        </div>
      </div>

      {/* 比特浏览器窗口配置 - 仅在选择比特浏览器时显示 */}
      {(config.browserType === 'bitbrowser' || !config.browserType) && (
      <div className="config-section">
        <div className="section-header">
          <h3>比特浏览器窗口</h3>
          <button className="btn-refresh" onClick={loadWindows} disabled={loadingWindows}>
            {loadingWindows ? '加载中...' : '刷新窗口'}
          </button>
        </div>
        <p className="help-text">为每个比特浏览器窗口配置对应的飞书表格，实现多账号分别发布不同内容</p>
        
        <div className="windows-grid">
          {windows.length === 0 ? (
            <p className="empty-text">未找到窗口，请启动比特浏览器后点击"刷新窗口"</p>
          ) : (
            windows.map(win => {
              const mapping = mappings.find(m => m.windowId === win.id);
              const isConfigured = !!mapping;
              const hasTableId = mapping && mapping.feishuTableId;
              
              return (
                <div key={win.id} className={`window-card ${isConfigured ? 'configured' : ''} ${hasTableId ? 'has-table' : ''}`}>
                  <div className="window-info">
                    <span className="window-name">{win.name}</span>
                    <span className="window-id">{win.id.substring(0, 8)}...</span>
                    {hasTableId && (
                      <span className="table-id-badge" title={mapping.feishuTableId}>
                        📋 {mapping.feishuTableId.substring(0, 12)}...
                      </span>
                    )}
                  </div>
                  <button
                    className={`btn-add ${isConfigured ? 'added' : ''}`}
                    onClick={() => handleAddMapping(win)}
                    disabled={isConfigured}
                  >
                    {isConfigured ? '✓ 已添加' : '添加'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
      )}

      {/* 谷歌浏览器配置 - 仅在选择谷歌浏览器时显示 */}
      {config.browserType === 'chrome' && (
      <div className="config-section">
        <h3>谷歌浏览器配置</h3>
        <p className="help-text">使用本地 Chrome 浏览器发布，首次使用需要手动登录小红书</p>
        <div className="form-row">
          <div className="form-group">
            <label>Chrome 路径（可选）</label>
            <div className="input-with-button">
              <input
                type="text"
                value={config.chrome?.executablePath || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    chrome: { ...config.chrome, executablePath: e.target.value },
                  })
                }
                placeholder="留空自动检测"
              />
              <button
                className="btn-browse"
                onClick={async () => {
                  try {
                    const result = await (window as any).api.dialog.selectFile?.();
                    if (result) {
                      setConfig({ ...config, chrome: { ...config.chrome, executablePath: result } });
                    }
                  } catch (error) {
                    console.error('选择文件失败:', error);
                  }
                }}
              >
                浏览
              </button>
            </div>
            <p className="help-text">通常无需设置，程序会自动查找 Chrome</p>
          </div>
        </div>
        <div className="chrome-info">
          <p>💡 使用谷歌浏览器时：</p>
          <ul>
            <li>首次发布需要手动登录小红书账号</li>
            <li>登录状态会自动保存，下次无需重新登录</li>
            <li>所有任务将串行发布（一个接一个）</li>
          </ul>
        </div>
      </div>
      )}

      {/* 窗口与表格映射 */}
      <div className="config-section">
        <div className="section-header">
          <h3>窗口与表格映射 ({mappings.length})</h3>
          {mappings.length > 0 && (
            <button 
              className="btn-test-all" 
              onClick={handleTestAllMappings} 
              disabled={testing || testingAll}
            >
              {testingAll ? '测试中...' : '🔄 全部测试'}
            </button>
          )}
        </div>
        <p className="help-text">Base ID 是多维表格的ID，数据表ID 是具体表的ID（tbl开头，复制表格时会不同）</p>
        {mappings.length === 0 ? (
          <p className="empty-text">暂无映射配置，请从上方添加浏览器窗口</p>
        ) : (
          <div className="mappings-list">
            {mappings.map(mapping => {
              const mappingResult = mappingTestResults[mapping.windowId];
              const isTestingThis = testingWindowId === mapping.windowId;
              
              return (
                <div key={mapping.windowId} className="mapping-item-wrapper">
                  <div className="mapping-item">
                    <div className="mapping-window">
                      <span className="window-label">窗口:</span>
                      <span className="window-value">{mapping.windowName}</span>
                      <span className="window-id-small">({mapping.windowId.substring(0, 8)}...)</span>
                    </div>
                    <div className="mapping-inputs">
                      <div className="mapping-input-group">
                        <label>Base ID</label>
                        <input
                          type="text"
                          value={mapping.feishuTableId}
                          onChange={(e) => handleTableIdChange(mapping.windowId, e.target.value)}
                          placeholder="多维表格ID"
                        />
                      </div>
                      <div className="mapping-input-group">
                        <label>数据表ID</label>
                        <input
                          type="text"
                          value={mapping.feishuDataTableId || ''}
                          onChange={(e) => handleDataTableIdChange(mapping.windowId, e.target.value)}
                          placeholder="tbl开头（可选）"
                        />
                      </div>
                    </div>
                    <div className="mapping-actions">
                      <button
                        className="btn-test-small"
                        onClick={() => handleTestFeishu(mapping.feishuTableId, mapping.windowId, mapping.feishuDataTableId)}
                        disabled={isTestingThis || testingAll || !mapping.feishuTableId}
                      >
                        {isTestingThis ? '测试中...' : '测试'}
                      </button>
                      <button
                        className="btn-remove"
                        onClick={() => handleRemoveMapping(mapping.windowId)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  {/* 每个映射的测试结果 */}
                  {mappingResult && (
                    <div className={`mapping-test-result ${mappingResult.success ? 'success' : 'error'}`}>
                      {mappingResult.success ? (
                        <span>✅ 表格: {mappingResult.tableName}, 记录: {mappingResult.recordCount}, 待发布: {mappingResult.pendingCount}</span>
                      ) : (
                        <span>❌ {mappingResult.error}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 保存按钮 */}
      <div className="config-actions">
        <button className="btn-save" onClick={handleSaveConfig} disabled={saving}>
          {saving ? '保存中...' : '保存配置'}
        </button>
      </div>

      {message && <div className="message">{message}</div>}
    </div>
  );
}

export default ConfigSettings;
