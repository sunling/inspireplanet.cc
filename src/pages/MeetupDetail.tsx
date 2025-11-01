import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Meetup {
  id: string;
  title: string;
  description: string;
  type: 'online' | 'offline' | 'culture' | 'outdoor';
  mode?: 'online' | 'offline';
  datetime: string;
  location?: string;
  fee: string | number | null | undefined;
  max_ppl?: number;
  max_participants?: number;
  duration?: number;
  organizer: string;
  creator?: string;
  contact: string;
  qr_image_url?: string;
  status: 'upcoming' | 'ongoing' | 'ended';
  created_at: string;
  participant_count: number;
  cover?: string;
}

interface Participant {
  name: string;
  wechat_id?: string;
  created_at?: string;
}

interface UserInfo {
  name?: string;
  wechat_id?: string;
  username?: string;
}

const MeetupDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // 模态框状态
  const [showRSVPDialog, setShowRSVPDialog] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);

  // RSVP表单状态
  const [rsvpForm, setRsvpForm] = useState({
    name: '',
    wechatId: '',
  });

  // 提交状态
  const [submitStatus, setSubmitStatus] = useState<
    'initial' | 'loading' | 'success' | 'error'
  >('initial');

  // 加载活动详情
  useEffect(() => {
    if (!id) {
      setError('缺少活动ID参数');
      setIsLoading(false);
      return;
    }

    loadMeetupDetail(id);
  }, [id]);

  // 加载活动详情数据
  const loadMeetupDetail = async (meetupId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // 模拟API调用
      // 实际环境中应该使用: fetch(`/.netlify/functions/meetupHandler?id=${meetupId}`)
      await new Promise((resolve) => setTimeout(resolve, 800));

      // 模拟数据
      const mockMeetup: Meetup = {
        id: meetupId,
        title: '技术交流分享会',
        description:
          '一起探讨前沿技术发展趋势，分享项目经验和技术心得。无论你是技术专家还是刚入门的学习者，都欢迎参与讨论！\n\n本次活动将涵盖：\n- 前端框架最新进展\n- 后端架构设计\n- DevOps实践\n- AI在软件开发中的应用\n\n欢迎大家积极参与！',
        type: 'online',
        datetime: '2024-02-15T19:00:00',
        duration: 2,
        fee: 0,
        max_ppl: 50,
        organizer: '张三',
        contact: 'zhangsan@example.com',
        qr_image_url: '/images/wechat-sl.jpg',
        status: 'upcoming',
        created_at: '2024-01-20T10:00:00Z',
        participant_count: 25,
        cover: '/images/tech-meetup.jpg',
      };

      setMeetup(mockMeetup);

      // 加载参与者信息
      loadParticipants(meetupId);
    } catch (err) {
      console.error('加载活动详情失败:', err);
      setError('加载活动详情失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 加载参与者信息
  const loadParticipants = async (meetupId: string) => {
    try {
      // 模拟API调用
      // 实际环境中应该使用: fetch(`/.netlify/functions/rsvpHandler?meetup_id=${meetupId}`)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 模拟参与者数据
      const mockParticipants: Participant[] = [
        { name: '王五' },
        { name: '赵六' },
        { name: '钱七' },
        { name: '孙八' },
        { name: '周九' },
      ];

      setParticipants(mockParticipants);
    } catch (err) {
      console.error('加载参与者信息失败:', err);
    }
  };

  // 报名参加活动
  const handleJoinMeetup = async () => {
    if (!meetup) return;

    const token =
      localStorage.getItem('userToken') || localStorage.getItem('authToken');
    const userInfoStr =
      localStorage.getItem('userInfo') || localStorage.getItem('userData');

    if (!token || !userInfoStr) {
      alert('请先登录后再报名参加活动');
      navigate('/login', { state: { redirect: window.location.pathname } });
      return;
    }

    setIsActionLoading(true);

    try {
      const userInfo: UserInfo = JSON.parse(userInfoStr);

      // 检查是否已经报名
      const isAlreadyRegistered = await checkRSVPStatus(
        meetup.id,
        userInfo.wechat_id || ''
      );
      if (isAlreadyRegistered) {
        if (meetup.qr_image_url) {
          showQRCode(meetup.qr_image_url);
        } else {
          alert('您已经报名了这个活动！请联系组织者获取群聊信息。');
        }
        return;
      }

      // 显示报名确认对话框
      setRsvpForm({
        name: userInfo.name || '',
        wechatId: userInfo.wechat_id || '',
      });
      setShowRSVPDialog(true);
    } catch (error) {
      console.error('处理报名失败:', error);
      alert('处理报名请求失败，请稍后重试');
    } finally {
      setIsActionLoading(false);
    }
  };

  // 检查RSVP状态
  const checkRSVPStatus = async (
    meetupId: string,
    wechatId: string
  ): Promise<boolean> => {
    try {
      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 模拟返回未报名状态
      return false;
    } catch (error) {
      console.error('检查报名状态失败:', error);
      return false;
    }
  };

  // 提交RSVP
  const handleSubmitRSVP = async () => {
    if (!meetup) return;

    if (!rsvpForm.name.trim()) {
      alert('请输入您的姓名');
      return;
    }

    setSubmitStatus('loading');

    try {
      const userInfoStr =
        localStorage.getItem('userInfo') || localStorage.getItem('userData');
      const userInfo: UserInfo = userInfoStr ? JSON.parse(userInfoStr) : {};

      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 模拟成功响应
      setSubmitStatus('success');

      // 延迟关闭对话框
      setTimeout(() => {
        setShowRSVPDialog(false);

        // 更新报名人数
        if (meetup) {
          setMeetup((prev) =>
            prev
              ? {
                  ...prev,
                  participant_count: prev.participant_count + 1,
                }
              : null
          );
        }

        // 更新参与者列表
        setParticipants((prev) => [
          ...prev,
          { name: rsvpForm.name, wechat_id: rsvpForm.wechatId },
        ]);

        // 显示成功消息和二维码
        if (meetup.qr_image_url) {
          setTimeout(() => {
            showQRCode(meetup.qr_image_url!);
          }, 300);
        } else {
          alert('报名成功！请联系组织者获取群聊信息。');
        }

        // 重置提交状态
        setSubmitStatus('initial');
      }, 1000);
    } catch (error) {
      console.error('报名失败:', error);
      setSubmitStatus('error');

      // 恢复提交状态
      setTimeout(() => {
        setSubmitStatus('initial');
      }, 2000);
    }
  };

  // 显示二维码弹窗
  const showQRCode = (qrImageUrl: string) => {
    setShowQRModal(true);
  };

  // 查看参与者列表
  const handleViewParticipants = () => {
    setShowParticipantsModal(true);
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    };
    return date.toLocaleDateString('zh-CN', options);
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // HTML转义
  const escapeHtml = (text: string) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // 检查活动是否即将举行
  const isUpcoming = (dateString: string) => {
    return new Date(dateString) > new Date();
  };

  // 渲染活动详情
  const renderMeetupDetail = () => {
    if (!meetup) return null;

    const meetupDate = new Date(meetup.datetime);
    const isUpcomingMeetup = isUpcoming(meetup.datetime);
    const formattedDate = formatDate(meetup.datetime);
    const formattedTime = formatTime(meetup.datetime);

    return (
      <div className="detail-content fade-in">
        <div className="detail-section">
          <div className="meetup-header">
            <div
              className={`meetup-type ${
                (meetup.mode || meetup.type) === 'online' ? 'online' : 'offline'
              }`}
            >
              {(meetup.mode || meetup.type) === 'online'
                ? '线上活动'
                : '线下活动'}
            </div>
            <h2
              style={{
                margin: '0 0 1rem 0',
                color: 'var(--text)',
                fontSize: '1.5rem',
                fontWeight: 700,
              }}
            >
              {escapeHtml(meetup.title)}
            </h2>
            <div
              className={`status-badge ${
                isUpcomingMeetup ? 'available' : 'ended'
              }`}
            >
              {isUpcomingMeetup ? '可报名' : '已结束'}
            </div>
          </div>

          <h3>基本信息</h3>
          <div className="basic-info-box">
            <div className="basic-info-row">
              <div className="basic-info-icon">📅</div>
              <div className="basic-info-content">
                <span className="basic-info-label">活动日期</span>
                <span className="basic-info-value">{formattedDate}</span>
              </div>
            </div>
            <div className="basic-info-row">
              <div className="basic-info-icon">🕐</div>
              <div className="basic-info-content">
                <span className="basic-info-label">活动时间</span>
                <span className="basic-info-value">{formattedTime}</span>
              </div>
            </div>
            {meetup.duration && (
              <div className="basic-info-row">
                <div className="basic-info-icon">⏱️</div>
                <div className="basic-info-content">
                  <span className="basic-info-label">活动时长</span>
                  <span className="basic-info-value">
                    {meetup.duration} 小时
                  </span>
                </div>
              </div>
            )}
            {meetup.location && (
              <div className="basic-info-row">
                <div className="basic-info-icon">📍</div>
                <div className="basic-info-content">
                  <span className="basic-info-label">活动地点</span>
                  <span className="basic-info-value">
                    {escapeHtml(meetup.location)}
                  </span>
                </div>
              </div>
            )}
            {meetup.fee !== null && meetup.fee !== undefined && (
              <div className="basic-info-row">
                <div className="basic-info-icon">💰</div>
                <div className="basic-info-content">
                  <span className="basic-info-label">活动费用</span>
                  <span className="basic-info-value">
                    {Number(meetup.fee) > 0 ? `${meetup.fee} 元` : '免费'}
                  </span>
                </div>
              </div>
            )}
            {(meetup.max_ppl || meetup.max_participants) && (
              <div className="basic-info-row">
                <div className="basic-info-icon">👥</div>
                <div className="basic-info-content">
                  <span className="basic-info-label">人数限制</span>
                  <span className="basic-info-value">
                    最多 {meetup.max_ppl || meetup.max_participants} 人
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="detail-section">
          <h3>活动介绍</h3>
          <div className="description-content">
            {escapeHtml(meetup.description).replace(/\n/g, '<br>')}
          </div>
        </div>

        <div className="detail-section">
          <h3>组织者信息</h3>
          <div className="organizer-info">
            <span className="organizer-name">
              👤 {escapeHtml(meetup.creator || meetup.organizer)}
            </span>
          </div>
        </div>

        <div className="action-section">
          <div className="action-title">
            {isUpcomingMeetup ? '立即报名参加' : '活动已结束'}
          </div>
          <button
            className={`action-btn ${isActionLoading ? 'btn-loading' : ''}`}
            onClick={handleJoinMeetup}
            disabled={!isUpcomingMeetup || isActionLoading}
          >
            {isUpcomingMeetup ? '报名参加' : '已结束'}
          </button>
          <div
            className="participant-info"
            onClick={handleViewParticipants}
            style={{ cursor: 'pointer', color: 'var(--primary)' }}
            title="点击查看报名人员名单"
          >
            {meetup.participant_count || 0}
            {meetup.max_ppl ? '/' + meetup.max_ppl : ''} 人已报名 👥
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="meetup-detail-page bg-gradient-default">
      <main>
        <div className="container">
          <a href="/meetups" className="back-btn">
            ← 返回活动列表
          </a>

          <div className="page-header">
            <h1 className="page-title">活动详情</h1>
          </div>

          <div id="meetupContent">
            {isLoading ? (
              <div className="loading">正在加载活动详情...</div>
            ) : error ? (
              <div className="error">
                <h3>加载失败</h3>
                <p>{error}</p>
                <a
                  href="/meetups"
                  style={{ color: 'var(--primary)', textDecoration: 'none' }}
                >
                  返回活动列表
                </a>
              </div>
            ) : (
              renderMeetupDetail()
            )}
          </div>
        </div>
      </main>

      {/* 报名确认对话框 */}
      {showRSVPDialog && (
        <div className="modal" onClick={() => setShowRSVPDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowRSVPDialog(false)}
            >
              ×
            </button>

            <h3 className="modal-title">确认报名</h3>

            <div className="form-group">
              <label>姓名:</label>
              <input
                type="text"
                value={rsvpForm.name}
                onChange={(e) =>
                  setRsvpForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="请输入您的姓名"
                disabled={
                  submitStatus === 'loading' || submitStatus === 'success'
                }
              />
            </div>

            <div className="form-group">
              <label>微信号:</label>
              <input
                type="text"
                value={rsvpForm.wechatId}
                onChange={(e) =>
                  setRsvpForm((prev) => ({ ...prev, wechatId: e.target.value }))
                }
                placeholder="请输入您的微信号"
                disabled={
                  submitStatus === 'loading' || submitStatus === 'success'
                }
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowRSVPDialog(false)}
                disabled={
                  submitStatus === 'loading' || submitStatus === 'success'
                }
              >
                取消
              </button>
              <button
                className={`btn-primary ${
                  submitStatus === 'loading' ? 'btn-loading' : ''
                } ${submitStatus === 'success' ? 'btn-success' : ''}`}
                onClick={handleSubmitRSVP}
                disabled={
                  submitStatus === 'loading' || submitStatus === 'success'
                }
              >
                {submitStatus === 'loading'
                  ? '提交中...'
                  : submitStatus === 'success'
                  ? '报名成功！'
                  : '确认报名'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 二维码弹窗 */}
      {showQRModal && meetup?.qr_image_url && (
        <div className="modal" onClick={() => setShowQRModal(false)}>
          <div
            className="modal-content"
            style={{ textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowQRModal(false)}
            >
              ×
            </button>

            <h3 className="modal-title">扫码进群</h3>
            <img
              src={meetup.qr_image_url}
              alt="群聊二维码"
              style={{
                maxWidth: '100%',
                height: 'auto',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1.5rem',
                border: '1px solid var(--border)',
              }}
            />
            <p
              style={{
                color: 'var(--text-muted)',
                marginBottom: '1.5rem',
                fontSize: '0.95rem',
              }}
            >
              请使用微信扫描二维码加入群聊
            </p>
            <button
              className="btn-primary"
              onClick={() => setShowQRModal(false)}
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 参与者列表弹窗 */}
      {showParticipantsModal && (
        <div className="modal" onClick={() => setShowParticipantsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowParticipantsModal(false)}
            >
              ×
            </button>

            <h3 className="modal-title">报名人员名单</h3>
            <div
              style={{
                maxHeight: '300px',
                overflowY: 'auto',
                margin: '1rem 0',
              }}
            >
              {participants.length > 0 ? (
                participants.map((participant, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '0.5rem 0',
                      borderBottom: '1px solid var(--border-light)',
                    }}
                  >
                    {escapeHtml(participant.name)}
                  </div>
                ))
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  暂无报名人员
                </p>
              )}
            </div>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                className="btn-primary"
                onClick={() => setShowParticipantsModal(false)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetupDetail;
