import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';

const CoverEditor: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverPreviewRef = useRef<HTMLDivElement>(null);

  // 状态管理
  const [title, setTitle] = useState<string>('启发星球');
  const [keywords, setKeywords] = useState<string>('灵感 创意 分享');
  const [fontFamily, setFontFamily] = useState<string>(
    "'Noto Sans SC', sans-serif"
  );
  const [layout, setLayout] = useState<string>('center');
  const [bgSelect, setBgSelect] = useState<string>('images/mistyblue.png');
  const [customBgImage, setCustomBgImage] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [searchStatus, setSearchStatus] = useState<string>('');
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchImages, setSearchImages] = useState<any[]>([]);
  const [searching, setSearching] = useState<boolean>(false);

  // 字体选项
  const fontOptions = [
    { value: "'Noto Sans SC', sans-serif", label: '思源黑体' },
    { value: "'Smiley Sans', sans-serif", label: '得意黑' },
    { value: "'Ma Shan Zheng', cursive", label: '马善政毛笔体' },
    { value: "'LXGW WenKai', serif", label: '霞鹜文楷' },
    { value: "'Alibaba PuHuiTi', sans-serif", label: '阿里汉仪智能黑体' },
    { value: "'Noto Serif SC', serif", label: '思源宋体' },
    { value: "'PingFang SC', sans-serif", label: '苹方' },
    { value: "'KaiTi', serif", label: '楷体' },
  ];

  // 布局选项
  const layoutOptions = [
    { value: 'center', label: '居中排版' },
    { value: 'left', label: '左上排版' },
  ];

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setCustomBgImage(e.target.result as string);
          setUploadStatus(`已上传：${file.name}`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 搜索图片
  const searchImagesHandler = async () => {
    const searchText = `${title} ${keywords}`.trim();

    if (!searchText) {
      alert('请先输入标题或关键词');
      return;
    }

    setSearching(true);
    setSearchStatus('正在搜索相关图片...');
    setShowSearchResults(false);

    try {
      // 在实际应用中，这里会调用API搜索图片
      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 模拟搜索结果
      const mockImages = [
        {
          url: 'https://picsum.photos/id/1/1200/600',
          thumb: 'https://picsum.photos/id/1/200/200',
          title: '风景1',
          description: '山脉风景',
        },
        {
          url: 'https://picsum.photos/id/2/1200/600',
          thumb: 'https://picsum.photos/id/2/200/200',
          title: '风景2',
          description: '海滩风景',
        },
        {
          url: 'https://picsum.photos/id/3/1200/600',
          thumb: 'https://picsum.photos/id/3/200/200',
          title: '风景3',
          description: '森林风景',
        },
      ];

      setSearchQuery(searchText);
      setSearchImages(mockImages);
      setShowSearchResults(true);
      setSearchStatus('');
    } catch (error) {
      console.error('搜索图片失败:', error);
      setSearchStatus(
        `搜索失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    } finally {
      setSearching(false);
    }
  };

  // 选择搜索结果中的图片
  const selectImage = (imageUrl: string) => {
    setCustomBgImage(imageUrl);
    // 这里可以添加选中效果的逻辑
  };

  // 下载封面
  const downloadCover = () => {
    if (!coverPreviewRef.current) return;

    html2canvas(coverPreviewRef.current, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
    })
      .then((canvas) => {
        const link = document.createElement('a');
        link.download = `封面_${new Date().getTime()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      })
      .catch((error) => {
        console.error('下载失败:', error);
        alert('下载失败，请重试');
      });
  };

  // 重置表单
  const resetForm = () => {
    setTitle('启发星球');
    setKeywords('灵感 创意 分享');
    setFontFamily("'Noto Sans SC', sans-serif");
    setLayout('center');
    setBgSelect('images/mistyblue.png');
    setCustomBgImage('');
    setUploadStatus('');
    setSearchStatus('');
    setShowSearchResults(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 格式化标题（支持换行）
  const formatTitle = (text: string) => {
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  // 格式化关键词（空格分隔转为斜杠分隔）
  const formatKeywords = (text: string) => {
    return text
      .split(' ')
      .filter((k) => k.trim())
      .join(' / ');
  };

  // 获取最终的背景图片
  const getBgImage = () => {
    return customBgImage || bgSelect;
  };

  return (
    <>
      {/* 主内容区域 */}
      <div className="main-container">
        {/* 表单部分 */}
        <div className="form-section">
          <div className="form-group">
            <label htmlFor="cover-title">封面标题</label>
            <textarea
              id="cover-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入封面标题..."
            ></textarea>
            <small style={{ color: '#7f8c8d' }}>按回车换行</small>
          </div>

          <div className="form-group">
            <label htmlFor="cover-keywords">关键词</label>
            <input
              type="text"
              id="cover-keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="用空格分隔关键词"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="font-select">字体选择</label>
              <select
                id="font-select"
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
              >
                {fontOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="layout-select">布局风格</label>
              <select
                id="layout-select"
                value={layout}
                onChange={(e) => setLayout(e.target.value)}
              >
                {layoutOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="bg-select">背景图片</label>
              <select
                id="bg-select"
                value={bgSelect}
                onChange={(e) => setBgSelect(e.target.value)}
              >
                <option value="images/mistyblue.png">默认背景</option>
              </select>
            </div>
            <div className="form-group">
              <label>自定义背景图</label>
              <div className="file-upload-wrapper">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📁 上传图片
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>
              <div className="upload-status">{uploadStatus}</div>
            </div>
          </div>

          <div className="form-group compact">
            <button
              type="button"
              className="btn"
              onClick={searchImagesHandler}
              disabled={searching}
            >
              🔍 搜索相关图片
            </button>
            <div className={`upload-status ${searching ? 'loading' : ''}`}>
              {searchStatus}
            </div>
          </div>

          {/* 搜索结果 */}
          {showSearchResults && (
            <div className="search-results">
              <h4>搜索结果：{searchQuery}</h4>
              <div className="image-grid">
                {searchImages.map((image, index) => (
                  <div
                    key={index}
                    className="image-item"
                    title={image.description}
                    onClick={() => selectImage(image.url)}
                  >
                    <img src={image.thumb} alt={image.title} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 预览部分 */}
        <div className="preview-section">
          <div className="cover-container">
            <div className="cover" id="cover-preview" ref={coverPreviewRef}>
              <div
                className="cover-bg"
                style={{ backgroundImage: `url('${getBgImage()}')` }}
              ></div>
              <div className="cover-overlay"></div>
              <div
                className={`cover-content ${
                  layout === 'left' ? 'layout-left' : ''
                }`}
                style={{ fontFamily }}
              >
                <div className="cover-title">{formatTitle(title)}</div>
                <div className="cover-keywords">{formatKeywords(keywords)}</div>
              </div>
            </div>

            <div className="action-buttons">
              <button className="btn" onClick={downloadCover}>
                下载
              </button>
              <button className="btn btn-secondary" onClick={resetForm}>
                重置
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CoverEditor;
