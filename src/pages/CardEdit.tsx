import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import Header from '../components/Header';
import Footer from '../components/Footer';

// 导入渐变字体颜色配置
const gradientFontColors: Record<string, string> = {
  'card-gradient-1': 'rgb(107, 33, 168)',
  'card-gradient-2': 'rgb(234, 88, 12)',
  'card-gradient-3': 'rgb(13, 148, 136)',
  'card-gradient-4': 'rgb(79, 70, 229)',
  'card-gradient-5': 'rgb(220, 38, 38)',
};

const getFontColorForGradient = (gradient: string): string => {
  return gradientFontColors[gradient] || 'rgb(0, 0, 0)';
};

// 卡片数据接口
interface CardData {
  id: string;
  title: string;
  quote: string;
  detail: string;
  creator: string;
  gradientClass: string;
  font: string;
  imagePath?: string;
  createdAt?: string;
}

const CardEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 表单状态
  const [cardData, setCardData] = useState<CardData>({
    id: id || '',
    title: '',
    quote: '',
    detail: '',
    creator: '',
    gradientClass: 'card-gradient-1',
    font: 'Noto Sans SC',
    imagePath: '',
  });

  // UI状态
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 模拟获取卡片数据
  useEffect(() => {
    const fetchCardData = async () => {
      try {
        setLoading(true);
        // 在实际应用中，这里应该是API调用
        // 模拟API延迟
        await new Promise((resolve) => setTimeout(resolve, 800));

        // 模拟数据
        const mockCardData: CardData = {
          id: id || '',
          title: '如何保持持续学习的动力',
          quote: '学习不是人生的全部，但学习是人生中最重要的一部分。',
          detail:
            '在快节奏的现代生活中，持续学习变得越来越重要。\n\n我认为保持学习动力的关键在于：\n1. 设定明确的学习目标\n2. 将大目标分解为小步骤\n3. 找到学习的内在乐趣\n4. 定期复盘和调整学习方法',
          creator: '学习爱好者',
          gradientClass: 'card-gradient-3',
          font: 'Noto Serif SC',
          imagePath: '',
        };

        setCardData(mockCardData);
        setError('');
      } catch (err) {
        setError('获取卡片数据失败，请稍后重试');
        console.error('获取卡片数据失败:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCardData();
    } else {
      setLoading(false);
      setError('卡片ID不存在');
    }
  }, [id]);

  // 处理表单输入变化
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setCardData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      // 在实际应用中，这里应该是API调用
      // 模拟API延迟
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log('保存卡片数据:', cardData);
      // 保存成功后返回卡片详情页
      navigate(`/card-detail?id=${id}`);
    } catch (err) {
      setError('保存卡片失败，请稍后重试');
      console.error('保存卡片失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 处理返回
  const handleBack = () => {
    navigate(-1);
  };

  // 渲染卡片预览
  const renderCardPreview = () => {
    // 将Markdown转换为HTML并进行净化 - 使用marked.parse的同步版本
    const markdownHtml = marked.parse(cardData.detail || '', { async: false });
    const sanitizedDetail = DOMPurify.sanitize(markdownHtml, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    });
    const fontColor = getFontColorForGradient(cardData.gradientClass);

    return (
      <div className="card-container">
        <div
          className={`card ${cardData.gradientClass}`}
          style={{ color: fontColor }}
        >
          <div className="card-body">
            <div className="title" style={{ fontFamily: cardData.font }}>
              {cardData.title || '标题'}
            </div>
            <div
              className="quote-box"
              style={{
                fontFamily: cardData.font,
                backgroundColor: `${fontColor}10`,
              }}
            >
              {cardData.quote || '金句'}
            </div>
            <img
              src={cardData.imagePath || '/images/mistyblue.png'}
              alt={cardData.title || '标题'}
              style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
            />
            <div
              className="detail-text"
              style={{ fontFamily: cardData.font }}
              dangerouslySetInnerHTML={{ __html: sanitizedDetail }}
            />
          </div>
          <div className="card-footer">
            <div className="footer" style={{ fontFamily: cardData.font }}>
              {cardData.creator ? `— ${cardData.creator}` : ''}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-light)' }}>
      <div className="header">
        <button onClick={handleBack} className="back-button">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回
        </button>
        <h1>✏️ 雕琢你的灵感</h1>
      </div>

      <div className="main-container">
        <div className="form-container">
          {loading && id ? (
            <div className="loading">加载中...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <form id="edit-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="title">标题</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  placeholder="请输入卡片标题"
                  value={cardData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="quote">金句</label>
                <input
                  type="text"
                  id="quote"
                  name="quote"
                  placeholder="请输入触动你的金句"
                  value={cardData.quote}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="detail">启发详情</label>
                <textarea
                  id="detail"
                  name="detail"
                  placeholder="请详细描述这个观点给你带来的启发和你的行动计划"
                  value={cardData.detail}
                  onChange={handleInputChange}
                  required
                  style={{ minHeight: '120px', resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="creator">创作者</label>
                <input
                  type="text"
                  id="creator"
                  name="creator"
                  placeholder="请输入创作者名称"
                  value={cardData.creator}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="gradientClass">背景渐变</label>
                <select
                  id="gradientClass"
                  name="gradientClass"
                  value={cardData.gradientClass}
                  onChange={handleInputChange}
                >
                  <option value="card-gradient-1">渐变1</option>
                  <option value="card-gradient-2">渐变2</option>
                  <option value="card-gradient-3">渐变3</option>
                  <option value="card-gradient-4">渐变4</option>
                  <option value="card-gradient-5">渐变5</option>
                  <option value="card-gradient-6">渐变6</option>
                  <option value="card-gradient-7">渐变7</option>
                  <option value="card-gradient-8">渐变8</option>
                  <option value="card-gradient-9">渐变9</option>
                  <option value="card-gradient-10">渐变10</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="font">字体</label>
                <select
                  id="font"
                  name="font"
                  value={cardData.font}
                  onChange={handleInputChange}
                >
                  <option value="Noto Sans SC">思源黑体</option>
                  <option value="Noto Serif SC">思源宋体</option>
                  <option value="Ma Shan Zheng">马善政楷体</option>
                  <option value="Inter">Inter</option>
                  <option value="Playfair Display">Playfair Display</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Lato">Lato</option>
                  <option value="Dancing Script">Dancing Script</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="imagePath">背景图片</label>
                <select
                  id="imagePath"
                  name="imagePath"
                  value={cardData.imagePath || ''}
                  onChange={handleInputChange}
                >
                  <option value="">无背景图片</option>
                </select>
              </div>

              <div className="action-buttons">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={handleBack}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={loading}
                >
                  保存修改
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="preview-container">{renderCardPreview()}</div>
      </div>
    </div>
  );
};

export default CardEdit;
/*
 * @Author: your name
 * @Date: 2025-11-01 17:50:03
 * @LastEditTime: 2025-11-01 17:50:04
 * @LastEditors: huili.local
 * @Description: In User Settings Edit
 * @FilePath: /inspireplanet.cc/src/pages/CardEdit.tsx
 */
