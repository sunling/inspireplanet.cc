import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

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

interface CardData {
  id: string;
  Title: string;
  Quote: string;
  Detail?: string;
  ImagePath?: string;
  Creator?: string;
  Font?: string;
  GradientClass?: string;
  Upload?: string;
  Created: string;
  Username?: string;
}

interface CommentData {
  id?: string;
  name: string;
  comment: string;
  created: string;
}

const CardDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  const [card, setCard] = useState<CardData | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // 评论表单状态
  const [commentForm, setCommentForm] = useState({
    name: '',
    content: '',
  });
  const [submittingComment, setSubmittingComment] = useState(false);

  // 加载卡片详情
  const fetchCardById = async (cardId: string) => {
    try {
      // 模拟API调用
      // 实际环境中应该使用: fetch(`${getBaseUrl()}/.netlify/functions/cardsHandler?id=${cardId}`)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 模拟数据
      const mockCard: CardData = {
        id: cardId,
        Title: '生命的意义',
        Quote:
          '生命的意义不在于你呼吸了多少次，而在于有多少个让你屏住呼吸的时刻。',
        Detail:
          '每一个让你心动的瞬间，都是生命赋予你的珍贵礼物。\n\n保持对生活的热爱，珍惜每一个美好的时刻。',
        ImagePath: '/public/images/MorningRunlight.png',
        Creator: '匿名用户',
        Font: 'Noto Sans SC',
        GradientClass: 'card-gradient-1',
        Created: new Date().toISOString(),
        Username: 'user123',
      };

      return mockCard;
    } catch (error) {
      console.error('获取卡片失败:', error);
      return null;
    }
  };

  // 加载评论
  const fetchComments = async (cardId: string) => {
    try {
      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 模拟评论数据
      const mockComments: CommentData[] = [
        {
          id: '1',
          name: '张三',
          comment: '写得真好，很有启发！',
          created: new Date(Date.now() - 3600000).toISOString(), // 1小时前
        },
        {
          id: '2',
          name: '李四',
          comment: '这句话让我重新思考了生命的意义。',
          created: new Date(Date.now() - 7200000).toISOString(), // 2小时前
        },
      ];

      return mockComments;
    } catch (error) {
      console.error('获取评论失败:', error);
      return [];
    }
  };

  // 检查用户是否可以编辑卡片
  const checkEditPermission = (cardData: CardData) => {
    try {
      const userData = localStorage.getItem('userData');
      if (!userData) {
        setCanEdit(false);
        return;
      }

      const user = JSON.parse(userData);
      const currentUsername = user.username || '';
      const cardUsername = cardData.Username || '';

      setCanEdit(currentUsername && currentUsername === cardUsername);
    } catch (e) {
      console.error('解析用户信息失败:', e);
      setCanEdit(false);
    }
  };

  // 初始化页面
  useEffect(() => {
    const initPage = async () => {
      if (!id) {
        setError('未找到卡片ID，请返回卡片列表页面重试。');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // 加载卡片详情
        const cardData = await fetchCardById(id);
        if (!cardData) {
          setError('未找到该卡片，可能已被删除或ID无效。');
          setIsLoading(false);
          return;
        }

        setCard(cardData);
        checkEditPermission(cardData);

        // 加载评论
        const commentsData = await fetchComments(id);
        setComments(commentsData);
      } catch (err) {
        console.error('加载卡片详情失败:', err);
        setError('加载失败，请稍后再试。');
      } finally {
        setIsLoading(false);
      }
    };

    initPage();
  }, [id]);

  // 下载卡片为图片
  const downloadCard = async () => {
    if (!cardRef.current) return;

    setDownloading(true);
    try {
      // 实际环境中应该使用html2canvas库来实现下载功能
      // 这里模拟下载过程
      await new Promise((resolve) => setTimeout(resolve, 1500));

      alert('卡片下载成功！');
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败，请重试');
    } finally {
      setDownloading(false);
    }
  };

  // 处理编辑按钮点击
  const handleEdit = () => {
    if (id) {
      navigate(`/card-edit?id=${id}`);
    }
  };

  // 提交评论
  const handleCommentSubmit = async () => {
    if (!commentForm.name.trim()) {
      alert('请输入您的名字');
      return;
    }

    if (!commentForm.content.trim()) {
      alert('请输入评论内容');
      return;
    }

    if (!id) return;

    setSubmittingComment(true);
    try {
      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 800));

      // 添加新评论
      const newComment: CommentData = {
        id: Date.now().toString(),
        name: commentForm.name,
        comment: commentForm.content,
        created: new Date().toISOString(),
      };

      setComments((prev) => [newComment, ...prev]);

      // 重置表单
      setCommentForm({ name: '', content: '' });

      alert('评论提交成功！');
    } catch (error) {
      console.error('提交评论失败:', error);
      alert('评论提交失败，请稍后再试');
    } finally {
      setSubmittingComment(false);
    }
  };

  // 格式化日期
  const formatCommentDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${
      date.getMonth() + 1
    }月${date.getDate()}日 ${date.getHours()}:${String(
      date.getMinutes()
    ).padStart(2, '0')}`;
  };

  // 清理和处理内容
  const sanitizeContent = (content: string | undefined) => {
    if (!content) return '';
    return DOMPurify.sanitize(content);
  };

  // 处理Markdown内容
  const renderMarkdown = (text: string | undefined) => {
    if (!text) return '';
    marked.setOptions({ breaks: true });
    const html = marked.parse(sanitizeContent(text));
    return <div dangerouslySetInnerHTML={{ __html: html as string }} />;
  };

  // 渲染卡片内容
  const renderCard = () => {
    if (!card) return null;
    const gradientClass = card.GradientClass || 'card-gradient-1';
    const fontColor = getFontColorForGradient(gradientClass);

    return (
      <div className="card-container">
        <div
          id="detail-card"
          ref={cardRef}
          className={`card ${gradientClass}`}
          style={{
            fontFamily: card.Font || 'Noto Sans SC, sans-serif',
            color: fontColor,
          }}
        >
          <div className="card-body">
            <div className="title">{sanitizeContent(card.Title)}</div>
            <div
              className="quote-box"
              style={{ backgroundColor: `${fontColor}10` }}
            >
              {sanitizeContent(card.Quote)}
            </div>
            <img
              src={card.ImagePath || '/images/mistyblue.png'}
              alt={card.Title}
              style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
            />
            {card.Detail && (
              <div className="detail-text">{renderMarkdown(card.Detail)}</div>
            )}
          </div>
          <div className="card-footer">
            <div className="footer">
              {card.Creator ? `— ${sanitizeContent(card.Creator)}` : ''}
            </div>
            <div className="date">
              {new Date(card.Created).toLocaleDateString('zh-CN')}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染评论列表
  const renderComments = () => {
    if (comments.length === 0) {
      return <div className="no-comments">暂无评论</div>;
    }

    return (
      <div className="comments-container">
        {comments.map((comment) => (
          <div key={comment.id || comment.created} className="comment">
            <div className="comment-header">
              <span className="comment-author">
                {sanitizeContent(comment.name)}
              </span>
              <span className="comment-date">
                {formatCommentDate(comment.created)}
              </span>
            </div>
            <div className="comment-body">
              {sanitizeContent(comment.comment).replace(/\n/g, '<br>')}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="card-detail-page bg-gradient-default">
      <div className="card-container">
        <div id="card-container">
          {isLoading ? (
            <div className="loading">加载中...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            renderCard()
          )}
        </div>

        <div className="action-buttons">
          <button
            id="download-btn"
            className="btn btn-blue btn-large"
            onClick={downloadCard}
            disabled={downloading || !card}
          >
            {downloading ? '下载中...' : '下载卡片'}
          </button>

          {canEdit && (
            <button
              id="edit-btn"
              className="btn btn-pink btn-large"
              onClick={handleEdit}
            >
              编辑卡片
            </button>
          )}

          <button
            id="share-btn"
            className="btn btn-green btn-large"
            onClick={() => alert('分享功能已触发')}
          >
            分享卡片
          </button>
        </div>

        <div className="comments-section">
          <h2>评论</h2>
          {renderComments()}

          <div className="comment-form">
            <h3>添加评论</h3>
            <div className="form-group">
              <label htmlFor="commenter-name">姓名</label>
              <input
                type="text"
                id="commenter-name"
                className="form-input"
                placeholder="请输入您的姓名"
                value={commentForm.name}
                onChange={(e) =>
                  setCommentForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label htmlFor="comment-content">评论内容</label>
              <textarea
                id="comment-content"
                className="form-input"
                rows={4}
                placeholder="写下您的想法..."
                value={commentForm.content}
                onChange={(e) =>
                  setCommentForm((prev) => ({
                    ...prev,
                    content: e.target.value,
                  }))
                }
              ></textarea>
            </div>
            <button
              className="submit-btn btn btn-primary"
              onClick={handleCommentSubmit}
              disabled={submittingComment}
            >
              {submittingComment ? '提交中...' : '提交评论'}
            </button>
            <div id="comment-message" className="message hidden"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardDetail;
