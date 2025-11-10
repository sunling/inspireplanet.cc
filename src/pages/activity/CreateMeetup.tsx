import {
  Card,
  CardContent,
  Box,
  Typography,
  TextField,
  Button,
} from '@mui/material';

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResponsive } from '../hooks/useResponsive';

interface MeetupData {
  title: string;
  description: string;
  type: string;
  datetime: string;
  location: string;
  duration: string;
  maxParticipants: string;
  organizer: string;
  contact: string;
  qrImageUrl: string;
}

const CreateMeetup: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragover, setDragover] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [qrPreview, setQrPreview] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [meetupData, setMeetupData] = useState<MeetupData>({
    title: '',
    description: '',
    type: '',
    datetime: '',
    location: '',
    duration: '',
    maxParticipants: '',
    organizer: '',
    contact: '',
    qrImageUrl: '',
  });

  // 初始化表单，设置最小日期时间和默认活动时间
  useEffect(() => {
    // 设置最小日期时间为当前时间1小时后
    const now = new Date();
    const minDateTime = new Date(now.getTime() + 60 * 60 * 1000);
    const minDateTimeStr = formatDateTimeLocal(minDateTime);

    // 设置默认活动时间为明天19:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0);
    const defaultDateTimeStr = formatDateTimeLocal(tomorrow);

    setMeetupData((prev) => ({
      ...prev,
      datetime: defaultDateTimeStr,
    }));

    // 检查用户登录状态并填充组织者信息
    checkUserLoginAndFillOrganizer();
  }, []);

  // 从localStorage获取用户信息并填充组织者字段
  const checkUserLoginAndFillOrganizer = () => {
    try {
      const userData = localStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        if (user.name) {
          setMeetupData((prev) => ({
            ...prev,
            organizer: user.name,
          }));
        }
      }
    } catch (error) {
      console.error('解析用户信息失败:', error);
    }
  };

  // 格式化日期时间为datetime-local格式
  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // 处理快捷日期时间选择
  const handleQuickDateTimeSelect = (type: string) => {
    const now = new Date();
    const result = new Date();

    switch (type) {
      case 'tomorrow':
        result.setDate(now.getDate() + 1);
        result.setHours(19, 0, 0, 0);
        break;
      case 'next-week':
        // 下周六
        const daysUntilNextSaturday = (6 - now.getDay() + 7) % 7 || 7;
        result.setDate(now.getDate() + daysUntilNextSaturday);
        result.setHours(14, 0, 0, 0);
        break;
      case 'next-sunday':
        // 下周日
        const daysUntilNextSunday = (7 - now.getDay()) % 7 || 7;
        result.setDate(now.getDate() + daysUntilNextSunday);
        result.setHours(10, 0, 0, 0);
        break;
      case 'weekend':
        // 本周末（如果今天是周六或周日，则选择下周末）
        const dayOfWeek = now.getDay();
        if (dayOfWeek === 0) {
          // 周日
          result.setDate(now.getDate() + 6); // 下周六
        } else if (dayOfWeek === 6) {
          // 周六
          result.setDate(now.getDate() + 7); // 下周日
        } else {
          result.setDate(now.getDate() + (6 - dayOfWeek)); // 本周六
        }
        result.setHours(19, 0, 0, 0);
        break;
      default:
        return;
    }

    setMeetupData((prev) => ({
      ...prev,
      datetime: formatDateTimeLocal(result),
    }));
  };

  // 检查当前选中的日期时间是否匹配某个快捷选项
  const isQuickDateTimeActive = (type: string): boolean => {
    const now = new Date();
    const result = new Date();

    switch (type) {
      case 'tomorrow':
        result.setDate(now.getDate() + 1);
        result.setHours(19, 0, 0, 0);
        break;
      case 'next-week':
        const daysUntilNextSaturday = (6 - now.getDay() + 7) % 7 || 7;
        result.setDate(now.getDate() + daysUntilNextSaturday);
        result.setHours(14, 0, 0, 0);
        break;
      case 'next-sunday':
        const daysUntilNextSunday = (7 - now.getDay()) % 7 || 7;
        result.setDate(now.getDate() + daysUntilNextSunday);
        result.setHours(10, 0, 0, 0);
        break;
      case 'weekend':
        const dayOfWeek = now.getDay();
        if (dayOfWeek === 0) {
          result.setDate(now.getDate() + 6);
        } else if (dayOfWeek === 6) {
          result.setDate(now.getDate() + 7);
        } else {
          result.setDate(now.getDate() + (6 - dayOfWeek));
        }
        result.setHours(19, 0, 0, 0);
        break;
      default:
        return false;
    }

    return meetupData.datetime === formatDateTimeLocal(result);
  };

  // 处理表单输入变化
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setMeetupData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // 清除对应字段的错误信息
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // 处理拖拽事件
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragover(true);
  };

  const handleDragLeave = () => {
    setDragover(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
    if (e.dataTransfer.files.length > 0) {
      handleQRFile(e.dataTransfer.files[0]);
    }
  };

  // 点击上传区域触发文件选择
  const handleQRUploadClick = () => {
    fileInputRef.current?.click();
  };

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleQRFile(e.target.files[0]);
    }
  };

  // 处理二维码文件
  const handleQRFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({
        ...prev,
        qr: '请上传图片文件',
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        qr: '图片大小不能超过5MB',
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setQrPreview(e.target.result as string);
        setMeetupData((prev) => ({
          ...prev,
          qrImageUrl: e.target?.result as string,
        }));

        // 清除错误信息
        if (errors.qr) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors.qr;
            return newErrors;
          });
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 清除之前的错误信息
    setErrors({});

    // 验证必填字段
    const requiredFields: Array<keyof MeetupData> = [
      'title',
      'description',
      'type',
      'datetime',
      'organizer',
      'contact',
    ];
    requiredFields.forEach((field) => {
      if (!meetupData[field].trim()) {
        newErrors[field] = '此字段为必填项';
      }
    });

    // 验证日期时间不能是过去
    const now = new Date();
    const selectedDateTime = new Date(meetupData.datetime);
    if (meetupData.datetime && selectedDateTime <= now) {
      newErrors.datetime = '活动时间必须是未来时间';
    }

    // 验证二维码
    if (!meetupData.qrImageUrl) {
      newErrors.qr = '请上传活动群二维码';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitLoading(true);

    try {
      // 准备活动数据
      // 将用户输入的本地日期时间转换为UTC时间
      const localDateTime = new Date(meetupData.datetime);
      const datetime = localDateTime.toISOString();

      const submitData = {
        ...meetupData,
        datetime,
        duration: meetupData.duration ? parseFloat(meetupData.duration) : null,
        maxParticipants: meetupData.maxParticipants
          ? parseInt(meetupData.maxParticipants)
          : null,
        createdBy: getCurrentUsername(),
      };

      // 在实际应用中，这里会调用API提交数据
      console.log('提交活动数据:', submitData);

      // 模拟API调用延迟
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 显示成功信息
      setSuccessMessage('活动发布成功！');

      // 重置表单
      setMeetupData({
        title: '',
        description: '',
        type: '',
        datetime: '',
        location: '',
        duration: '',
        maxParticipants: '',
        organizer: '',
        contact: '',
        qrImageUrl: '',
      });
      setQrPreview('');

      // 3秒后跳转到活动列表页
      setTimeout(() => {
        navigate('/meetups');
      }, 3000);
    } catch (error) {
      console.error('发布活动失败:', error);
      alert(
        '发布失败: ' + (error instanceof Error ? error.message : '未知错误')
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  // 获取当前用户名
  const getCurrentUsername = (): string | null => {
    try {
      const userData = localStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        return user.username || user.email || null;
      }
    } catch (error) {
      console.error('获取用户名失败:', error);
    }
    return null;
  };

  return (
    <div className="container">
      <p className="text-muted">快速创建活动，连接志同道合的朋友</p>

      {successMessage && (
        <div className="success-message" style={{ display: 'block' }}>
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* 基本信息 */}
        <div className="form-section">
          <h3>基本信息</h3>
          <div className="form-group">
            <label htmlFor="title">活动标题</label>
            <input
              type="text"
              id="title"
              name="title"
              value={meetupData.title}
              onChange={handleInputChange}
              required
              placeholder="输入活动标题"
            />
            {errors.title && (
              <div className="error-message">{errors.title}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="description">活动描述</label>
            <textarea
              id="description"
              name="description"
              value={meetupData.description}
              onChange={handleInputChange}
              required
              placeholder="详细描述活动内容、目标和亮点"
            />
            {errors.description && (
              <div className="error-message">{errors.description}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="type">活动类型</label>
            <select
              id="type"
              name="type"
              value={meetupData.type}
              onChange={handleInputChange}
              required
            >
              <option value="">选择活动类型</option>
              <option value="online">线上活动</option>
              <option value="offline">线下活动</option>
              <option value="hybrid">线上线下结合</option>
            </select>
            {errors.type && <div className="error-message">{errors.type}</div>}
          </div>
        </div>

        {/* 时间地点 */}
        <Card sx={{ mb: 4, boxShadow: 2, borderRadius: 3, overflow: 'hidden' }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ bgcolor: '#667eea', p: 2 }}>
              <Typography variant="h6" color="white" fontWeight="bold">
                时间地点
              </Typography>
            </Box>
            <Box sx={{ p: 3 }}>
              <TextField
                fullWidth
                id="datetime"
                name="datetime"
                label="活动时间"
                type="datetime-local"
                value={meetupData.datetime}
                onChange={handleInputChange}
                required
                error={!!errors.datetime}
                helperText={errors.datetime || '选择活动开始时间'}
                margin="normal"
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                size={isMobile ? 'small' : 'medium'}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#667eea',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea',
                    },
                  },
                }}
              />

              <Box sx={{ mt: 2, mb: 3 }}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  快捷选择：
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    '& > button': {
                      minWidth: isMobile ? 'auto' : '120px',
                    },
                  }}
                >
                  <Button
                    variant={
                      isQuickDateTimeActive('tomorrow')
                        ? 'contained'
                        : 'outlined'
                    }
                    color="primary"
                    size="small"
                    onClick={() => handleQuickDateTimeSelect('tomorrow')}
                    sx={{
                      backgroundColor: isQuickDateTimeActive('tomorrow')
                        ? '#667eea'
                        : 'transparent',
                      borderColor: '#667eea',
                      color: isQuickDateTimeActive('tomorrow')
                        ? 'white'
                        : '#667eea',
                      '&:hover': {
                        backgroundColor: isQuickDateTimeActive('tomorrow')
                          ? '#5a67d8'
                          : 'rgba(102, 126, 234, 0.1)',
                        borderColor: '#5a67d8',
                      },
                    }}
                  >
                    明天 19:00
                  </Button>
                  <Button
                    variant={
                      isQuickDateTimeActive('next-week')
                        ? 'contained'
                        : 'outlined'
                    }
                    color="primary"
                    size="small"
                    onClick={() => handleQuickDateTimeSelect('next-week')}
                    sx={{
                      backgroundColor: isQuickDateTimeActive('next-week')
                        ? '#667eea'
                        : 'transparent',
                      borderColor: '#667eea',
                      color: isQuickDateTimeActive('next-week')
                        ? 'white'
                        : '#667eea',
                      '&:hover': {
                        backgroundColor: isQuickDateTimeActive('next-week')
                          ? '#5a67d8'
                          : 'rgba(102, 126, 234, 0.1)',
                        borderColor: '#5a67d8',
                      },
                    }}
                  >
                    下周六 14:00
                  </Button>
                  <Button
                    variant={
                      isQuickDateTimeActive('next-sunday')
                        ? 'contained'
                        : 'outlined'
                    }
                    color="primary"
                    size="small"
                    onClick={() => handleQuickDateTimeSelect('next-sunday')}
                    sx={{
                      backgroundColor: isQuickDateTimeActive('next-sunday')
                        ? '#667eea'
                        : 'transparent',
                      borderColor: '#667eea',
                      color: isQuickDateTimeActive('next-sunday')
                        ? 'white'
                        : '#667eea',
                      '&:hover': {
                        backgroundColor: isQuickDateTimeActive('next-sunday')
                          ? '#5a67d8'
                          : 'rgba(102, 126, 234, 0.1)',
                        borderColor: '#5a67d8',
                      },
                    }}
                  >
                    下周日 10:00
                  </Button>
                  <Button
                    variant={
                      isQuickDateTimeActive('weekend')
                        ? 'contained'
                        : 'outlined'
                    }
                    color="primary"
                    size="small"
                    onClick={() => handleQuickDateTimeSelect('weekend')}
                    sx={{
                      backgroundColor: isQuickDateTimeActive('weekend')
                        ? '#667eea'
                        : 'transparent',
                      borderColor: '#667eea',
                      color: isQuickDateTimeActive('weekend')
                        ? 'white'
                        : '#667eea',
                      '&:hover': {
                        backgroundColor: isQuickDateTimeActive('weekend')
                          ? '#5a67d8'
                          : 'rgba(102, 126, 234, 0.1)',
                        borderColor: '#5a67d8',
                      },
                    }}
                  >
                    本周末 19:00
                  </Button>
                </Box>
              </Box>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="location">活动地点</label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={meetupData.location}
                    onChange={handleInputChange}
                    placeholder="线下活动请填写具体地址，线上活动可填写平台名称"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="duration">
                    活动时长（小时）<span className="optional">（可选）</span>
                  </label>
                  <input
                    type="number"
                    id="duration"
                    name="duration"
                    value={meetupData.duration}
                    onChange={handleInputChange}
                    min="0.5"
                    step="0.5"
                    placeholder="例如：2"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="maxParticipants">
                  最大参与人数<span className="optional">（可选）</span>
                </label>
                <input
                  type="number"
                  id="maxParticipants"
                  name="maxParticipants"
                  value={meetupData.maxParticipants}
                  onChange={handleInputChange}
                  min="1"
                  placeholder="不限制可留空"
                />
              </div>
            </Box>
          </CardContent>
        </Card>

        {/* 联系方式 */}
        <div className="form-section">
          <h3>联系方式</h3>
          <div className="form-group">
            <label htmlFor="organizer">组织者姓名</label>
            <input
              type="text"
              id="organizer"
              name="organizer"
              value={meetupData.organizer}
              onChange={handleInputChange}
              required
              placeholder="您的姓名"
            />
            {errors.organizer && (
              <div className="error-message">{errors.organizer}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="contact">微信号</label>
            <input
              type="text"
              id="contact"
              name="contact"
              value={meetupData.contact}
              onChange={handleInputChange}
              required
              placeholder="请输入微信号"
            />
            {errors.contact && (
              <div className="error-message">{errors.contact}</div>
            )}
          </div>

          <div className="form-group">
            <label>活动群二维码</label>
            <div
              className={`qr-upload ${dragover ? 'dragover' : ''}`}
              onClick={handleQRUploadClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              {qrPreview ? (
                <img src={qrPreview} alt="二维码预览" className="qr-preview" />
              ) : (
                <div id="qr-upload-content">
                  <p>点击上传群二维码</p>
                  <p className="text-muted text-sm">
                    支持拖拽上传，JPG/PNG格式
                  </p>
                </div>
              )}
            </div>
            {errors.qr && <div className="error-message">{errors.qr}</div>}
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={submitLoading}>
          {submitLoading ? '发布中...' : '🚀 发布活动'}
        </button>
      </form>
    </div>
  );
};

export default CreateMeetup;
