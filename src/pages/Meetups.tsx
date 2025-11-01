import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Meetup {
  id: string;
  title: string;
  description: string;
  type: 'online' | 'offline' | 'culture' | 'outdoor';
  datetime: string;
  location?: string;
  fee: string;
  max_participants?: number;
  organizer: string;
  contact: string;
  qr_image_url?: string;
  status: 'upcoming' | 'ongoing' | 'ended';
  created_at: string;
  participant_count: number;
  cover?: string;
}

const Meetups: React.FC = () => {
  const navigate = useNavigate();

  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [filteredMeetups, setFilteredMeetups] = useState<Meetup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateButton, setShowCreateButton] = useState(false);

  // 筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // 模态框状态
  const [showRSVPDialog, setShowRSVPDialog] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [currentMeetupId, setCurrentMeetupId] = useState<string | null>(null);
  const [currentQRUrl, setCurrentQRUrl] = useState<string | null>(null);

  // RSVP表单状态
  const [rsvpForm, setRsvpForm] = useState({
    name: '',
    wechatId: '',
  });

  // 检查用户登录状态并显示创建按钮
  useEffect(() => {
    const checkAuthAndShowCreateButton = () => {
      try {
        const token =
          localStorage.getItem('userToken') ||
          localStorage.getItem('authToken');
        if (token) {
          setShowCreateButton(true);
        }
      } catch (error) {
        console.error('检查认证状态失败:', error);
      }
    };

    checkAuthAndShowCreateButton();
    loadMeetups();
  }, []);

  // 加载活动列表
  const loadMeetups = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 模拟API调用
      // 实际环境中应该使用: fetch('/.netlify/functions/meetupHandler')
      await new Promise((resolve) => setTimeout(resolve, 800));

      // 模拟数据
      const mockMeetups: Meetup[] = [
        {
          id: '1',
          title: '技术交流分享会',
          description:
            '一起探讨前沿技术发展趋势，分享项目经验和技术心得。无论你是技术专家还是刚入门的学习者，都欢迎参与讨论！',
          type: 'online',
          datetime: '2024-02-15T19:00:00',
          fee: '免费',
          max_participants: 50,
          organizer: '张三',
          contact: 'zhangsan@example.com',
          qr_image_url: '/images/wechat-sl.jpg',
          status: 'upcoming',
          created_at: '2024-01-20T10:00:00Z',
          participant_count: 25,
        },
        {
          id: '2',
          title: '周末户外徒步活动',
          description:
            '一起去香山徒步，享受大自然的美景，锻炼身体，结交朋友。适合所有体能水平的朋友参加。',
          type: 'outdoor',
          datetime: '2024-02-18T08:00:00',
          location: '香山公园',
          fee: '30元',
          max_participants: 20,
          organizer: '李四',
          contact: 'lisi@example.com',
          qr_image_url: '/images/wechat-sl.jpg',
          status: 'upcoming',
          created_at: '2024-01-22T15:30:00Z',
          participant_count: 12,
        },
        {
          id: '3',
          title: '读书分享：《人类简史》',
          description:
            '一起阅读和讨论尤瓦尔·赫拉利的经典作品《人类简史》，分享读书心得，探讨人类文明的发展历程。',
          type: 'culture',
          datetime: '2024-02-20T14:00:00',
          location: '三里屯书店',
          fee: '免费',
          max_participants: 15,
          organizer: '王五',
          contact: 'wangwu@example.com',
          qr_image_url: '/images/wechat-sl.jpg',
          status: 'upcoming',
          created_at: '2024-01-25T09:15:00Z',
          participant_count: 8,
        },
        {
          id: '4',
          title: '线上冥想课程',
          description:
            '在繁忙的生活中给自己留出一些宁静的时光，通过冥想放松身心，提升专注力和幸福感。',
          type: 'online',
          datetime: '2024-02-22T20:00:00',
          fee: '免费',
          max_participants: 30,
          organizer: '赵六',
          contact: 'zhaoliu@example.com',
          qr_image_url: '/images/wechat-sl.jpg',
          status: 'upcoming',
          created_at: '2024-01-28T18:45:00Z',
          participant_count: 15,
        },
      ];

      setMeetups(mockMeetups);
      setFilteredMeetups(mockMeetups);
    } catch (err) {
      console.error('加载活动失败:', err);
      setError('加载活动失败，请稍后再试');
    } finally {
      setIsLoading(false);
    }
  };

  // 应用过滤器
  useEffect(() => {
    applyFilters();
  }, [searchQuery, typeFilter, meetups]);

  const applyFilters = () => {
    let filtered = [...meetups];

    // 类型过滤
    if (typeFilter) {
      filtered = filtered.filter((meetup) => meetup.type === typeFilter);
    }

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (meetup) =>
          meetup.title.toLowerCase().includes(query) ||
          meetup.description.toLowerCase().includes(query)
      );
    }

    setFilteredMeetups(filtered);
  };

  // 处理搜索输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // 清除搜索
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // 处理类型过滤变化
  const handleTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value);
  };

  // 报名参加活动
  const handleJoinMeetup = async (meetupId: string, qrImageUrl?: string) => {
    const token =
      localStorage.getItem('userToken') || localStorage.getItem('authToken');
    const userInfo =
      localStorage.getItem('userInfo') || localStorage.getItem('userData');

    if (!token || !userInfo) {
      alert('请先登录后再报名参加活动');
      navigate('/login', { state: { redirect: window.location.pathname } });
      return;
    }

    try {
      const user = JSON.parse(userInfo);

      // 检查是否已经报名
      const isAlreadyRegistered = await checkRSVPStatus(
        meetupId,
        user.wechat_id || ''
      );
      if (isAlreadyRegistered) {
        if (qrImageUrl) {
          showQRCode(qrImageUrl);
        } else {
          alert('您已经报名了这个活动！请联系组织者获取群聊信息。');
        }
        return;
      }

      // 显示报名确认对话框
      setRsvpForm({
        name: user.name || '',
        wechatId: user.wechat_id || '',
      });
      setCurrentMeetupId(meetupId);
      setCurrentQRUrl(qrImageUrl || null);
      setShowRSVPDialog(true);
    } catch (error) {
      console.error('处理报名失败:', error);
      alert('处理报名请求失败，请稍后重试');
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
    if (!rsvpForm.name.trim()) {
      alert('请输入您的姓名');
      return;
    }

    if (!currentMeetupId) return;

    try {
      const userInfo =
        localStorage.getItem('userInfo') || localStorage.getItem('userData');
      const user = userInfo ? JSON.parse(userInfo) : {};

      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 关闭对话框
      setShowRSVPDialog(false);

      // 更新本地数据
      setMeetups((prev) =>
        prev.map((meetup) =>
          meetup.id === currentMeetupId
            ? { ...meetup, participant_count: meetup.participant_count + 1 }
            : meetup
        )
      );

      // 显示成功消息和二维码
      if (currentQRUrl) {
        setTimeout(() => {
          showQRCode(currentQRUrl);
        }, 500);
      } else {
        alert('报名成功！请联系组织者获取群聊信息。');
      }
    } catch (error) {
      console.error('报名失败:', error);
      alert('报名失败，请稍后重试');
    }
  };

  // 显示二维码弹窗
  const showQRCode = (qrImageUrl: string) => {
    setCurrentQRUrl(qrImageUrl);
    setShowQRModal(true);
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

  // 检查活动是否即将举行
  const isUpcoming = (dateString: string) => {
    return new Date(dateString) > new Date();
  };

  // 渲染活动列表
  const renderMeetups = () => {
    if (filteredMeetups.length === 0) {
      return (
        <div className="empty-state">
          <h3>暂无活动</h3>
          <p>还没有符合条件的活动，快来发起第一个活动吧！</p>
        </div>
      );
    }

    return (
      <div className="meetups-grid">
        {filteredMeetups.map((meetup) => {
          const isUpcomingMeetup = isUpcoming(meetup.datetime);
          const formattedDate = formatDate(meetup.datetime);
          const formattedTime = formatTime(meetup.datetime);

          return (
            <div
              key={meetup.id}
              className="meetup-card"
              onClick={() => navigate(`/meetup-detail/${meetup.id}`)}
            >
              <div className="meetup-content">
                <div
                  className={`meetup-type ${
                    meetup.type === 'online' ? 'online' : 'offline'
                  }`}
                >
                  {meetup.type === 'online' ? '线上活动' : '线下活动'}
                </div>
                <h3 className="meetup-title">{meetup.title}</h3>
                <div className="meetup-meta">
                  <div className="meetup-meta-item">📅 {formattedDate}</div>
                  <div className="meetup-meta-item">🕐 {formattedTime}</div>
                  {meetup.location && (
                    <div className="meetup-meta-item">📍 {meetup.location}</div>
                  )}
                </div>
                <div className="meetup-description">{meetup.description}</div>
                <div className="meetup-organizer">
                  👤 组织者：{meetup.organizer}
                </div>
              </div>
              <div className="meetup-actions">
                <button
                  className="join-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJoinMeetup(meetup.id, meetup.qr_image_url);
                  }}
                  disabled={!isUpcomingMeetup}
                >
                  {isUpcomingMeetup ? '报名参加' : '已结束'}
                </button>
                <button
                  className="detail-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/meetup-detail/${meetup.id}`);
                  }}
                >
                  查看详情
                </button>
                <div className="participant-count">
                  {meetup.participant_count}
                  {meetup.max_participants
                    ? '/' + meetup.max_participants
                    : ''}{' '}
                  人参加
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="meetups-page bg-gradient-default">
      <main className="meetup-container">
        <div className="meetup-header">
          <h1>活动列表</h1>
          {showCreateButton && (
            <a
              href="/create-meetup"
              className="create-meetup-btn"
              id="createMeetupBtn"
            >
              发起活动
            </a>
          )}
        </div>

        <div className="meetup-filters">
          <div className="search-container">
            <input
              type="text"
              id="searchInput"
              placeholder="搜索活动标题或描述..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <button
              id="clearSearch"
              className={`clear-search ${searchQuery ? '' : 'hidden'}`}
              onClick={handleClearSearch}
            >
              ×
            </button>
          </div>
          <select
            className="filter-select"
            id="typeFilter"
            value={typeFilter}
            onChange={handleTypeFilterChange}
          >
            <option value="">所有类型</option>
            <option value="online">线上活动</option>
            <option value="offline">线下活动</option>
          </select>
        </div>

        <div id="meetupsContainer">
          {isLoading ? (
            <div className="loading">正在加载活动...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            renderMeetups()
          )}
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

            <h3>确认报名</h3>

            <div className="form-group">
              <label>姓名:</label>
              <input
                type="text"
                value={rsvpForm.name}
                onChange={(e) =>
                  setRsvpForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="请输入您的姓名"
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
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowRSVPDialog(false)}
              >
                取消
              </button>
              <button className="btn-primary" onClick={handleSubmitRSVP}>
                确认报名
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 二维码弹窗 */}
      {showQRModal && currentQRUrl && (
        <div className="modal" onClick={() => setShowQRModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>扫码进群</h3>
            <img src={currentQRUrl} alt="群聊二维码" className="qr-image" />
            <p>请使用微信扫描二维码加入群聊</p>
            <button
              className="btn-primary"
              onClick={() => setShowQRModal(false)}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Meetups;
