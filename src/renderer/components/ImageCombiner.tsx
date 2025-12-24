import { useState, useEffect, useRef, useCallback } from 'react';
import './ImageCombiner.css';

interface TextItem {
  id: string;
  text: string;
  offsetX: number;
  offsetY: number;
}

interface StyleSettings {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  strokeEnabled: boolean;
  strokeColor: string;
  boldEnabled: boolean;
}

interface SubtitleSettings {
  enabled: boolean;
  text: string;
  fontFamily: string;
  fontSize: number;
  textColor: string;
  offsetX: number; // 副标题X偏移
  offsetY: number; // 副标题Y偏移
  boldEnabled: boolean;
}

interface IconSettings {
  image: string | null;
  size: number;
  x: number;
  y: number;
}

function ImageCombiner(): JSX.Element {
  // 背景图状态
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundImageName, setBackgroundImageName] = useState('');
  
  // 文字列表状态
  const [textList, setTextList] = useState<TextItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // 样式设置
  const [styleSettings, setStyleSettings] = useState<StyleSettings>({
    fontFamily: "'Microsoft YaHei', sans-serif",
    fontSize: 56,
    textColor: '#000000',
    strokeEnabled: false,
    strokeColor: '#ff0000',
    boldEnabled: true,
  });
  
  // 副标题设置
  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>({
    enabled: false,
    text: '',
    fontFamily: "'Microsoft YaHei', sans-serif",
    fontSize: 32,
    textColor: '#666666',
    offsetX: 0,
    offsetY: 80,
    boldEnabled: false,
  });
  
  // 图标设置
  const [iconSettings, setIconSettings] = useState<IconSettings>({
    image: null,
    size: 80,
    x: -120,
    y: -100,
  });
  const [iconName, setIconName] = useState('');
  
  // 导出目录（从系统设置读取）
  const [exportDir, setExportDir] = useState('');
  
  // 拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<'main' | 'subtitle'>('main');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // 消息提示
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'info' | 'success' | 'error'>('info');
  
  // Tab 状态
  const [inputTab, setInputTab] = useState<'feishu' | 'manual'>('feishu');
  const [manualInput, setManualInput] = useState('');
  
  // 生成进度
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState({ current: 0, total: 0 });
  
  // Canvas ref
  const previewRef = useRef<HTMLDivElement>(null);

  // 组件加载时从系统设置读取图片目录
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await (window as any).api.config.get();
        if (config.imageDir) {
          setExportDir(config.imageDir);
        }
      } catch (error) {
        console.error('加载配置失败:', error);
      }
    };
    loadConfig();
  }, []);

  // 显示消息
  const showMessage = useCallback((msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  }, []);

  // 处理背景图上传
  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      showMessage('图片最大 10MB', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setBackgroundImage(event.target?.result as string);
      setBackgroundImageName(file.name);
      showMessage('背景图上传成功', 'success');
    };
    reader.readAsDataURL(file);
  };

  // 处理图标上传
  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setIconSettings(prev => ({ ...prev, image: event.target?.result as string }));
      setIconName(file.name);
      showMessage('图标上传成功', 'success');
    };
    reader.readAsDataURL(file);
  };

  // 从飞书加载数据
  const handleLoadFromFeishu = async () => {
    try {
      showMessage('正在从飞书加载数据...', 'info');
      const states = await (window as any).api.feishu.loadByWindows();
      
      const allTasks: TextItem[] = [];
      for (const state of states) {
        for (const task of state.tasks) {
          allTasks.push({
            id: task.productId || task.id,
            text: task.title || '',
            offsetX: 0,
            offsetY: 0,
          });
        }
      }
      
      if (allTasks.length === 0) {
        showMessage('没有找到待发布的数据', 'error');
        return;
      }
      
      setTextList(allTasks);
      setCurrentIndex(0);
      showMessage(`成功加载 ${allTasks.length} 条数据`, 'success');
    } catch (error) {
      showMessage('加载失败: ' + (error as Error).message, 'error');
    }
  };

  // 添加手动输入的文字
  const handleAddManualText = () => {
    if (!manualInput.trim()) {
      showMessage('请输入文字', 'error');
      return;
    }
    
    const newItem: TextItem = {
      id: `manual_${Date.now()}`,
      text: manualInput,
      offsetX: 0,
      offsetY: 0,
    };
    
    setTextList(prev => [...prev, newItem]);
    setManualInput('');
    showMessage('已添加文字', 'success');
  };

  // 更新当前文字
  const handleUpdateCurrentText = (text: string) => {
    setTextList(prev => prev.map((item, idx) => 
      idx === currentIndex ? { ...item, text } : item
    ));
  };

  // 删除当前文字
  const handleDeleteCurrent = () => {
    if (textList.length === 0) return;
    
    setTextList(prev => prev.filter((_, idx) => idx !== currentIndex));
    if (currentIndex >= textList.length - 1 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
    showMessage('已删除', 'success');
  };

  // 重置位置
  const handleResetPosition = () => {
    setTextList(prev => prev.map((item, idx) => 
      idx === currentIndex ? { ...item, offsetX: 0, offsetY: 0 } : item
    ));
  };

  // 拖拽开始
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!backgroundImage || textList.length === 0) return;
    
    const target = e.target as HTMLElement;
    
    // 检查是否点击了副标题
    if (target.closest('.preview-subtitle')) {
      setIsDragging(true);
      setDragTarget('subtitle');
      setDragStart({
        x: e.clientX - (subtitleSettings.offsetX || 0),
        y: e.clientY - (subtitleSettings.offsetY || 0),
      });
      return;
    }
    
    // 检查是否点击了主标题
    if (target.closest('.preview-main-text')) {
      setIsDragging(true);
      setDragTarget('main');
      const currentItem = textList[currentIndex];
      setDragStart({
        x: e.clientX - (currentItem?.offsetX || 0),
        y: e.clientY - (currentItem?.offsetY || 0),
      });
      return;
    }
  };

  // 拖拽中
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = Math.max(-200, Math.min(200, e.clientX - dragStart.x));
    const newY = Math.max(-200, Math.min(200, e.clientY - dragStart.y));
    
    if (dragTarget === 'subtitle') {
      setSubtitleSettings(prev => ({ ...prev, offsetX: newX, offsetY: newY }));
    } else {
      setTextList(prev => prev.map((item, idx) => 
        idx === currentIndex ? { ...item, offsetX: newX, offsetY: newY } : item
      ));
    }
  }, [isDragging, dragStart, currentIndex, dragTarget]);

  // 拖拽结束
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // 预览区文字换行计算 - 与Canvas保持一致
  const getPreviewLines = useCallback((text: string, fontSize: number, fontFamily: string, bold: boolean): string[] => {
    if (!text) return [];
    
    // 预览区宽度是 400px，留出 10px padding，实际可用 380px
    // 使用 90% 宽度 = 360px
    const maxWidth = 360;
    
    // 创建临时 canvas 来测量文字宽度
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return text.split('\n');
    
    const fontWeight = bold ? 'bold' : 'normal';
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    
    const result: string[] = [];
    const paragraphs = text.split('\n');
    
    for (const paragraph of paragraphs) {
      if (!paragraph) {
        result.push('');
        continue;
      }
      
      let currentLine = '';
      for (const char of paragraph) {
        const testLine = currentLine + char;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && currentLine) {
          result.push(currentLine);
          currentLine = char;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        result.push(currentLine);
      }
    }
    
    return result;
  }, []);

  // 生成单张图片 - 与原始HTML逻辑保持一致
  const generateSingleImage = async (item: TextItem): Promise<Blob | null> => {
    if (!backgroundImage) return null;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // 加载背景图
    const bgImg = new Image();
    bgImg.src = backgroundImage;
    
    await new Promise<void>((resolve) => {
      bgImg.onload = () => resolve();
    });
    
    canvas.width = bgImg.width;
    canvas.height = bgImg.height;
    
    // 绘制背景
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    
    // 计算缩放比例（预览区域是 400x533）
    const scaleX = canvas.width / 400;
    const scaleY = canvas.height / 533;
    
    // 设置文字样式 - 使用用户设置的字体大小，按比例缩放
    const fontWeight = styleSettings.boldEnabled ? 'bold' : 'normal';
    const scaledFontSize = styleSettings.fontSize * scaleY;
    ctx.font = `${fontWeight} ${scaledFontSize}px ${styleSettings.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = styleSettings.textColor;
    
    // 计算文字位置（考虑偏移）
    const x = (canvas.width / 2) + (item.offsetX * scaleX);
    const y = (canvas.height / 2) + (item.offsetY * scaleY);
    
    // 自动换行函数 - 根据最大宽度分割文字
    const wrapText = (text: string, maxWidth: number): string[] => {
      const result: string[] = [];
      // 先按换行符分割
      const paragraphs = text.split('\n');
      
      for (const paragraph of paragraphs) {
        if (!paragraph) {
          result.push('');
          continue;
        }
        
        let currentLine = '';
        for (const char of paragraph) {
          const testLine = currentLine + char;
          const metrics = ctx.measureText(testLine);
          
          if (metrics.width > maxWidth && currentLine) {
            result.push(currentLine);
            currentLine = char;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) {
          result.push(currentLine);
        }
      }
      
      return result;
    };
    
    // 计算最大宽度（留出边距）
    const maxWidth = canvas.width * 0.9;
    const lines = wrapText(item.text, maxWidth);
    
    const lineHeight = scaledFontSize * 1.2;
    // 关键：使用原始HTML的居中计算方式
    const startY = y - (lines.length - 1) * lineHeight / 2;
    
    for (let i = 0; i < lines.length; i++) {
      const lineY = startY + i * lineHeight;
      
      // 如果有描边，先绘制描边
      if (styleSettings.strokeEnabled) {
        ctx.strokeStyle = styleSettings.strokeColor;
        ctx.lineWidth = 4 * scaleY; // 描边宽度也要缩放
        ctx.strokeText(lines[i], x, lineY);
      }
      
      // 绘制文字
      ctx.fillStyle = styleSettings.textColor;
      ctx.fillText(lines[i], x, lineY);
    }
    
    // 如果有装饰图标，绘制图标
    if (iconSettings.image) {
      const iconImg = new Image();
      iconImg.src = iconSettings.image;
      
      await new Promise<void>((resolve) => {
        iconImg.onload = () => resolve();
      });
      
      const canvasIconX = (canvas.width / 2) + (iconSettings.x * scaleX);
      const canvasIconY = (canvas.height / 2) + (iconSettings.y * scaleY);
      const scaledIconSize = iconSettings.size * scaleY;
      
      ctx.drawImage(
        iconImg,
        canvasIconX - scaledIconSize / 2,
        canvasIconY - scaledIconSize / 2,
        scaledIconSize,
        scaledIconSize
      );
    }
    
    // 绘制副标题
    if (subtitleSettings.enabled && subtitleSettings.text) {
      const subFontWeight = subtitleSettings.boldEnabled ? 'bold' : 'normal';
      const subScaledFontSize = subtitleSettings.fontSize * scaleY;
      ctx.font = `${subFontWeight} ${subScaledFontSize}px ${subtitleSettings.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = subtitleSettings.textColor;
      
      // 副标题换行
      const subWrapText = (text: string, maxW: number): string[] => {
        const res: string[] = [];
        const paras = text.split('\n');
        for (const para of paras) {
          if (!para) { res.push(''); continue; }
          let curLine = '';
          for (const ch of para) {
            const testL = curLine + ch;
            if (ctx.measureText(testL).width > maxW && curLine) {
              res.push(curLine);
              curLine = ch;
            } else {
              curLine = testL;
            }
          }
          if (curLine) res.push(curLine);
        }
        return res;
      };
      
      const subLines = subWrapText(subtitleSettings.text, maxWidth);
      const subLineHeight = subScaledFontSize * 1.2;
      
      // 副标题使用独立的位置
      const subX = (canvas.width / 2) + (subtitleSettings.offsetX * scaleX);
      const subY = (canvas.height / 2) + (subtitleSettings.offsetY * scaleY);
      const subStartY = subY - (subLines.length - 1) * subLineHeight / 2;
      
      for (let i = 0; i < subLines.length; i++) {
        const subLineY = subStartY + i * subLineHeight;
        ctx.fillText(subLines[i], subX, subLineY);
      }
    }
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  };

  // 批量生成所有图片
  const handleGenerateAll = async () => {
    if (!backgroundImage) {
      showMessage('请先上传背景图', 'error');
      return;
    }
    if (textList.length === 0) {
      showMessage('请先添加文字', 'error');
      return;
    }
    if (!exportDir) {
      showMessage('请先选择导出目录', 'error');
      return;
    }
    
    setGenerating(true);
    setGenerateProgress({ current: 0, total: textList.length });
    
    try {
      for (let i = 0; i < textList.length; i++) {
        const item = textList[i];
        const blob = await generateSingleImage(item);
        
        if (blob) {
          // 通过 IPC 保存文件
          const arrayBuffer = await blob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          const fileName = `${item.id}.png`;
          
          await (window as any).api.file.save(exportDir, fileName, Array.from(uint8Array));
        }
        
        setGenerateProgress({ current: i + 1, total: textList.length });
      }
      
      showMessage(`成功生成 ${textList.length} 张图片`, 'success');
    } catch (error) {
      showMessage('生成失败: ' + (error as Error).message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  // 生成当前图片预览
  const handlePreviewCurrent = async () => {
    if (!backgroundImage || textList.length === 0) return;
    
    const item = textList[currentIndex];
    const blob = await generateSingleImage(item);
    
    if (blob) {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };

  const currentItem = textList[currentIndex];

  return (
    <div className="image-combiner">
      <div className="combiner-header">
        <h2>图文合成器</h2>
        <p className="description">批量生成小红书图文，支持从飞书导入数据</p>
      </div>

      <div className="combiner-content">
        {/* 左侧预览区 */}
        <div className="preview-panel">
          <div 
            className="preview-container" 
            ref={previewRef}
            onMouseDown={handleMouseDown}
          >
            {backgroundImage ? (
              <>
                <img src={backgroundImage} alt="背景" className="preview-bg" />
                {currentItem && (
                  <div className="preview-content-wrapper">
                    {/* 主标题 */}
                    <div 
                      className="preview-main-text"
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: `translate(calc(-50% + ${currentItem.offsetX}px), calc(-50% + ${currentItem.offsetY}px))`,
                        textAlign: 'center',
                        cursor: 'move',
                      }}
                    >
                      {getPreviewLines(currentItem.text, styleSettings.fontSize, styleSettings.fontFamily, styleSettings.boldEnabled).map((line, index) => (
                        <div 
                          key={index}
                          className="preview-text"
                          style={{
                            fontFamily: styleSettings.fontFamily,
                            fontSize: `${styleSettings.fontSize}px`,
                            color: styleSettings.textColor,
                            fontWeight: styleSettings.boldEnabled ? 'bold' : 'normal',
                            lineHeight: 1.2,
                            ...(styleSettings.strokeEnabled ? {
                              WebkitTextStroke: `2px ${styleSettings.strokeColor}`,
                              paintOrder: 'stroke fill',
                            } : {}),
                          }}
                        >
                          {line || '\u00A0'}
                        </div>
                      ))}
                    </div>
                    {/* 副标题 */}
                    {subtitleSettings.enabled && subtitleSettings.text && (
                      <div 
                        className="preview-subtitle"
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          transform: `translate(calc(-50% + ${subtitleSettings.offsetX}px), calc(-50% + ${subtitleSettings.offsetY}px))`,
                          textAlign: 'center',
                          cursor: 'move',
                        }}
                      >
                        {getPreviewLines(subtitleSettings.text, subtitleSettings.fontSize, subtitleSettings.fontFamily, subtitleSettings.boldEnabled).map((line, index) => (
                          <div 
                            key={`sub-${index}`}
                            className="preview-text"
                            style={{
                              fontFamily: subtitleSettings.fontFamily,
                              fontSize: `${subtitleSettings.fontSize}px`,
                              color: subtitleSettings.textColor,
                              fontWeight: subtitleSettings.boldEnabled ? 'bold' : 'normal',
                              lineHeight: 1.2,
                            }}
                          >
                            {line || '\u00A0'}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {iconSettings.image && (
                  <div 
                    className="preview-icon"
                    style={{
                      transform: `translate(calc(-50% + ${iconSettings.x}px), calc(-50% + ${iconSettings.y}px))`,
                    }}
                  >
                    <img 
                      src={iconSettings.image} 
                      alt="图标" 
                      style={{ width: `${iconSettings.size}px` }}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="empty-preview">请先上传背景图</div>
            )}
          </div>
          <p className="preview-tip">拖动文字可调整位置</p>
        </div>

        {/* 右侧控制区 */}
        <div className="control-panel">
          {/* 背景图上传 */}
          <div className="section">
            <h3 className="section-title">背景图上传</h3>
            <div className="upload-area">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleBackgroundUpload}
                id="bg-upload"
                hidden
              />
              <label htmlFor="bg-upload" className="upload-label">
                {backgroundImageName || '点击选择背景图 (JPG/PNG/WEBP)'}
              </label>
            </div>
            {backgroundImage && (
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setBackgroundImage(null);
                  setBackgroundImageName('');
                }}
              >
                重新上传
              </button>
            )}
          </div>

          {/* 文字输入 */}
          <div className="section">
            <h3 className="section-title">文字输入</h3>
            <div className="tabs">
              <button 
                className={`tab ${inputTab === 'feishu' ? 'active' : ''}`}
                onClick={() => setInputTab('feishu')}
              >
                飞书导入
              </button>
              <button 
                className={`tab ${inputTab === 'manual' ? 'active' : ''}`}
                onClick={() => setInputTab('manual')}
              >
                手动添加
              </button>
            </div>
            
            {inputTab === 'feishu' ? (
              <div className="tab-content">
                <button className="btn btn-primary" onClick={handleLoadFromFeishu}>
                  📥 从飞书加载数据
                </button>
                {textList.length > 0 && (
                  <div className="success-msg">
                    ✔ 已加载 {textList.length} 条数据
                  </div>
                )}
              </div>
            ) : (
              <div className="tab-content">
                <textarea
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="输入文案（最多3行，每行不超过20字）"
                  rows={3}
                />
                <button className="btn btn-primary" onClick={handleAddManualText}>
                  添加到列表
                </button>
              </div>
            )}
          </div>

          {/* 批量切换 */}
          {textList.length > 0 && (
            <div className="section">
              <h3 className="section-title">批量切换</h3>
              <div className="batch-controls">
                <button 
                  className="btn" 
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                >
                  上一条
                </button>
                <span className="counter">
                  {currentIndex + 1} / {textList.length}
                </span>
                <button 
                  className="btn"
                  onClick={() => setCurrentIndex(Math.min(textList.length - 1, currentIndex + 1))}
                  disabled={currentIndex === textList.length - 1}
                >
                  下一条
                </button>
              </div>
              
              {/* 当前文字编辑 */}
              {currentItem && (
                <div className="current-edit">
                  <label>当前文字：</label>
                  <textarea
                    value={currentItem.text}
                    onChange={(e) => handleUpdateCurrentText(e.target.value)}
                    rows={2}
                  />
                  <div className="edit-info">
                    <span>ID: {currentItem.id}</span>
                    <button className="btn btn-danger btn-sm" onClick={handleDeleteCurrent}>
                      删除
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* 文字样式 */}
          <div className="section">
            <h3 className="section-title">文字样式</h3>
            
            <div className="form-row">
              <label>字体：</label>
              <select 
                value={styleSettings.fontFamily}
                onChange={(e) => setStyleSettings(prev => ({ ...prev, fontFamily: e.target.value }))}
              >
                <option value="'Microsoft YaHei', sans-serif">微软雅黑</option>
                <option value="'SimSun', serif">宋体</option>
                <option value="'PingFang SC', sans-serif">苹方</option>
                <option value="'Source Han Sans', sans-serif">思源黑体</option>
              </select>
            </div>
            
            <div className="form-row">
              <label>大小：</label>
              <input 
                type="number" 
                value={styleSettings.fontSize}
                onChange={(e) => setStyleSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) || 56 }))}
                min={12}
                max={200}
              />
            </div>
            
            <div className="form-row">
              <label>颜色：</label>
              <input 
                type="color" 
                value={styleSettings.textColor}
                onChange={(e) => setStyleSettings(prev => ({ ...prev, textColor: e.target.value }))}
              />
            </div>
            
            <div className="form-row">
              <label>描边：</label>
              <input 
                type="checkbox" 
                checked={styleSettings.strokeEnabled}
                onChange={(e) => setStyleSettings(prev => ({ ...prev, strokeEnabled: e.target.checked }))}
              />
              {styleSettings.strokeEnabled && (
                <input 
                  type="color" 
                  value={styleSettings.strokeColor}
                  onChange={(e) => setStyleSettings(prev => ({ ...prev, strokeColor: e.target.value }))}
                />
              )}
            </div>
            
            <div className="form-row">
              <label>加粗：</label>
              <input 
                type="checkbox" 
                checked={styleSettings.boldEnabled}
                onChange={(e) => setStyleSettings(prev => ({ ...prev, boldEnabled: e.target.checked }))}
              />
            </div>
            
            <div className="form-row">
              <label>位置X：</label>
              <input 
                type="number" 
                value={currentItem?.offsetX || 0}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setTextList(prev => prev.map((item, idx) => 
                    idx === currentIndex ? { ...item, offsetX: val } : item
                  ));
                }}
                min={-500}
                max={500}
              />
            </div>
            
            <div className="form-row">
              <label>位置Y：</label>
              <input 
                type="number" 
                value={currentItem?.offsetY || 0}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setTextList(prev => prev.map((item, idx) => 
                    idx === currentIndex ? { ...item, offsetY: val } : item
                  ));
                }}
                min={-500}
                max={500}
              />
            </div>
            
            <button className="btn btn-secondary" onClick={handleResetPosition}>
              重置位置
            </button>
          </div>

          {/* 副标题设置 */}
          <div className="section">
            <h3 className="section-title">副标题设置</h3>
            
            <div className="form-row">
              <label>启用：</label>
              <input 
                type="checkbox" 
                checked={subtitleSettings.enabled}
                onChange={(e) => setSubtitleSettings(prev => ({ ...prev, enabled: e.target.checked }))}
              />
            </div>
            
            {subtitleSettings.enabled && (
              <>
                <div className="form-row">
                  <label>内容：</label>
                  <input 
                    type="text"
                    value={subtitleSettings.text}
                    onChange={(e) => setSubtitleSettings(prev => ({ ...prev, text: e.target.value }))}
                    placeholder="输入副标题"
                    style={{ flex: 1 }}
                  />
                </div>
                
                <div className="form-row">
                  <label>字体：</label>
                  <select 
                    value={subtitleSettings.fontFamily}
                    onChange={(e) => setSubtitleSettings(prev => ({ ...prev, fontFamily: e.target.value }))}
                  >
                    <option value="'Microsoft YaHei', sans-serif">微软雅黑</option>
                    <option value="'SimSun', serif">宋体</option>
                    <option value="'PingFang SC', sans-serif">苹方</option>
                    <option value="'Source Han Sans', sans-serif">思源黑体</option>
                  </select>
                </div>
                
                <div className="form-row">
                  <label>大小：</label>
                  <input 
                    type="number" 
                    value={subtitleSettings.fontSize}
                    onChange={(e) => setSubtitleSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) || 32 }))}
                    min={12}
                    max={120}
                  />
                </div>
                
                <div className="form-row">
                  <label>颜色：</label>
                  <input 
                    type="color" 
                    value={subtitleSettings.textColor}
                    onChange={(e) => setSubtitleSettings(prev => ({ ...prev, textColor: e.target.value }))}
                  />
                </div>
                
                <div className="form-row">
                  <label>加粗：</label>
                  <input 
                    type="checkbox" 
                    checked={subtitleSettings.boldEnabled}
                    onChange={(e) => setSubtitleSettings(prev => ({ ...prev, boldEnabled: e.target.checked }))}
                  />
                </div>
                
                <div className="form-row">
                  <label>位置X：</label>
                  <input 
                    type="number" 
                    value={subtitleSettings.offsetX}
                    onChange={(e) => setSubtitleSettings(prev => ({ ...prev, offsetX: parseInt(e.target.value) || 0 }))}
                    min={-500}
                    max={500}
                  />
                </div>
                
                <div className="form-row">
                  <label>位置Y：</label>
                  <input 
                    type="number" 
                    value={subtitleSettings.offsetY}
                    onChange={(e) => setSubtitleSettings(prev => ({ ...prev, offsetY: parseInt(e.target.value) || 0 }))}
                    min={-500}
                    max={500}
                  />
                </div>
              </>
            )}
          </div>

          {/* 装饰图标 */}
          <div className="section">
            <h3 className="section-title">装饰图标</h3>
            <div className="upload-area">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleIconUpload}
                id="icon-upload"
                hidden
              />
              <label htmlFor="icon-upload" className="upload-label">
                {iconName || '点击上传图标'}
              </label>
            </div>
            
            {iconSettings.image && (
              <>
                <div className="form-row">
                  <label>大小：</label>
                  <input 
                    type="number" 
                    value={iconSettings.size}
                    onChange={(e) => setIconSettings(prev => ({ ...prev, size: parseInt(e.target.value) || 80 }))}
                    min={20}
                    max={200}
                  />
                </div>
                <div className="form-row">
                  <label>位置X：</label>
                  <input 
                    type="number" 
                    value={iconSettings.x}
                    onChange={(e) => setIconSettings(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))}
                    min={-500}
                    max={500}
                  />
                </div>
                <div className="form-row">
                  <label>位置Y：</label>
                  <input 
                    type="number" 
                    value={iconSettings.y}
                    onChange={(e) => setIconSettings(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))}
                    min={-500}
                    max={500}
                  />
                </div>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setIconSettings(prev => ({ ...prev, image: null }));
                    setIconName('');
                  }}
                >
                  移除图标
                </button>
              </>
            )}
          </div>

          {/* 导出设置 - 使用系统设置的图片目录 */}
          <div className="section">
            <h3 className="section-title">导出目录</h3>
            {exportDir ? (
              <div className="export-path">
                <span>📁 {exportDir}</span>
                <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                  (来自系统设置的图片目录)
                </p>
              </div>
            ) : (
              <div className="export-path" style={{ color: '#f44336' }}>
                ⚠️ 请先在「系统设置」中配置图片目录
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="section action-buttons">
            <button 
              className="btn btn-info" 
              onClick={handlePreviewCurrent}
              disabled={!backgroundImage || textList.length === 0}
            >
              👁️ 预览当前
            </button>
            <button 
              className="btn btn-success" 
              onClick={handleGenerateAll}
              disabled={!backgroundImage || textList.length === 0 || !exportDir || generating}
            >
              {generating 
                ? `生成中 ${generateProgress.current}/${generateProgress.total}` 
                : `🎨 批量生成 (${textList.length}张)`
              }
            </button>
          </div>
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <div 
          className={`combiner-message combiner-message-${messageType}`}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '10px 16px',
            borderRadius: '6px',
            color: 'white',
            fontSize: '13px',
            fontWeight: 500,
            zIndex: 9999,
            maxWidth: '280px',
            backgroundColor: messageType === 'success' ? '#4CAF50' : messageType === 'error' ? '#f44336' : '#333',
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}

export default ImageCombiner;
