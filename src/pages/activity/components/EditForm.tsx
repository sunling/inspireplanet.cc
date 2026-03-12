import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
} from '@mui/material';
import useResponsive from '../../../hooks/useResponsive';
import { useGlobalSnackbar } from '../../../context/app';
import { imagesApi } from '../../../netlify/config';
import { getUserId } from '../../../utils';

import { Meetup, MeetupList } from '../../../netlify/functions/meetup';

interface FormErrors {
  [key: string]: string | undefined;
}

interface EditFormProps {
  initialValues: Meetup;
  onSubmit: (data: any) => Promise<void>;
  submitText: string;
  isLoading: boolean;
  existingQrUrl?: string;
}

// 格式化日期时间为datetime-local格式
export const formatDateTimeLocal = (date: Date): string => {
  const [year, month, day, hours, minutes] = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
  ];
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// 快捷日期时间配置
export const quickTimeOptions = {
  tomorrow: { label: '明天 19:00', config: { days: 1, hours: 19 } },
  'next-week': {
    label: '下周六 14:00',
    config: {
      days: (now: { getDay: () => number }) => (6 - now.getDay() + 7) % 7 || 7,
      hours: 14,
    },
  },
  'next-sunday': {
    label: '下周日 10:00',
    config: {
      days: (now: { getDay: () => number }) => (7 - now.getDay()) % 7 || 7,
      hours: 10,
    },
  },
  weekend: {
    label: '本周末 19:00',
    config: {
      days: (now: { getDay: () => number }) =>
        now.getDay() === 0 ? 6 : now.getDay() === 6 ? 7 : 6 - now.getDay(),
      hours: 19,
    },
  },
};

const EditForm: React.FC<EditFormProps> = ({
  initialValues,
  onSubmit,
  submitText,
  isLoading,
  existingQrUrl = '',
}) => {
  const { isMobile } = useResponsive();
  const showSnackbar = useGlobalSnackbar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragover, setDragover] = useState(false);
  const [qrPreview, setQrPreview] = useState(initialValues.cover || '');
  const [errors, setErrors] = useState<FormErrors>({});
  const [formValues, setFormValues] = useState<Meetup>(initialValues);

  useEffect(() => {
    setFormValues(initialValues);
  }, [initialValues]);

  // 表单验证函数
  const validateForm = (values: Meetup): FormErrors => {
    const newErrors: FormErrors = {};

    // 必填字段验证
    if (!values.title?.trim()) newErrors.title = '此字段为必填项';
    if (!values.description?.trim()) newErrors.description = '此字段为必填项';
    if (!values.mode) newErrors.mode = '此字段为必填项';
    if (!values.datetime) newErrors.datetime = '此字段为必填项';
    if (!values.creator?.trim()) newErrors.creator = '此字段为必填项';
    if (!values.wechat_id?.trim()) newErrors.wechat_id = '此字段为必填项';
    if (!values.cover) newErrors.cover = '请上传活动群二维码';

    // 日期时间验证
    if (values.datetime && new Date(values.datetime) <= new Date()) {
      newErrors.datetime = '活动时间必须是未来时间';
    }
    setErrors(newErrors);

    return newErrors;
  };

  // 处理快捷日期时间选择
  const handleQuickDateTimeSelect = (type: string) => {
    const now = new Date();
    const result = new Date();
    const option = quickTimeOptions[type as keyof typeof quickTimeOptions];

    if (option) {
      const days =
        typeof option.config.days === 'function'
          ? option.config.days(now)
          : option.config.days;

      result.setDate(now.getDate() + days);
      result.setHours(option.config.hours, 0, 0, 0);

      setFormValues((prev) => ({
        ...prev,
        datetime: formatDateTimeLocal(result),
      }));

      // 清除datetime字段的错误
      if (errors.datetime) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.datetime;
          return newErrors;
        });
      }
    }
  };

  // 检查当前选中的日期时间是否匹配某个快捷选项
  const isQuickDateTimeActive = (type: string): boolean => {
    const now = new Date();
    const result = new Date();
    const option = quickTimeOptions[type as keyof typeof quickTimeOptions];

    if (option) {
      const days =
        typeof option.config.days === 'function'
          ? option.config.days(now)
          : option.config.days;

      result.setDate(now.getDate() + days);
      result.setHours(option.config.hours, 0, 0, 0);
      return formValues.datetime === formatDateTimeLocal(result);
    }
    return false;
  };

  // 处理二维码文件
  const handleQRFile = (file: File) => {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({
        ...prev,
        cover: '请上传图片文件',
      }));
      showSnackbar.error('请上传图片文件');
      return;
    }

    // 验证文件大小
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        cover: '图片大小不能超过5MB',
      }));
      showSnackbar.error('图片大小不能超过5MB');
      return;
    }

    // 读取文件并设置预览
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const base64Image = e.target.result as string;
        setQrPreview(base64Image);
        setFormValues((prev) => ({
          ...prev,
          cover: base64Image,
        }));
        // 清除错误
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.cover;
          return newErrors;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // 上传二维码图片
  const uploadQRImage = async (base64Image: string): Promise<string> => {
    try {
      if (/^https?:\/\//i.test(base64Image)) return base64Image; // 保持现有URL
      const response = await imagesApi.upload(base64Image);
      if (!response.success) {
        showSnackbar.error('上传二维码失败');
        return '';
      }
      return response.data?.url || '';
    } catch (error) {
      console.error('上传二维码失败:', error);
      showSnackbar.error(
        error instanceof Error ? error.message : '上传二维码失败'
      );
      return '';
    }
  };

  // 处理输入变化
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  // 处理表单提交
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // 验证表单
    const validationErrors = validateForm(formValues);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      // 上传二维码图片
      const cover = await uploadQRImage(formValues.cover);
      if (!cover && !existingQrUrl) return;

      // 准备活动数据
      const localDateTime = new Date(formValues.datetime);

      const submitData = {
        ...formValues,
        datetime: localDateTime.toISOString(),
        duration: formValues.duration ? parseFloat(formValues.duration) : null,
        max_ppl: formValues.max_ppl ? formValues.max_ppl : null,
        cover: cover || existingQrUrl,
        user_id: getUserId(),
      };

      // 调用外部提交函数
      await onSubmit(submitData);
    } catch (error) {
      showSnackbar.error(
        '操作失败: ' + (error instanceof Error ? error.message : '未知错误')
      );
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        {/* 基本信息 */}
        <Box
          sx={{
            mb: 4,
            p: 3,
            borderRadius: 1,
            boxShadow: 1,
          }}
        >
          <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
            基本信息
          </Typography>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>
              活动标题
            </Typography>
            <TextField
              fullWidth
              id="title"
              name="title"
              type="text"
              value={formValues.title}
              helperText={errors['title']}
              error={!!errors['title']}
              onChange={handleInputChange}
              required
              placeholder="输入活动标题"
              size={isMobile ? 'small' : 'medium'}
            />
          </Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>
              活动描述
            </Typography>
            <TextField
              fullWidth
              id="description"
              name="description"
              type="text"
              value={formValues.description}
              onChange={handleInputChange}
              error={!!errors['description']}
              helperText={errors['description']}
              required
              placeholder="详细描述活动内容、目标和亮点"
              multiline
              minRows={4}
              size={isMobile ? 'small' : 'medium'}
            />
          </Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>
              活动类型
            </Typography>
            <TextField
              fullWidth
              id="mode"
              name="mode"
              placeholder="选择活动类型"
              value={formValues.mode}
              onChange={handleInputChange}
              error={!!errors['mode']}
              helperText={errors['mode']}
              required
              select
              size={isMobile ? 'small' : 'medium'}
            >
              {MeetupList.map((item) => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </Box>

        {/* 时间地点 */}
        <Card sx={{ mb: 4, boxShadow: 1, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              时间地点
            </Typography>
          </Box>
          <CardContent>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>
                活动时间
              </Typography>
              <TextField
                fullWidth
                id="datetime"
                name="datetime"
                type="datetime-local"
                error={!!errors['datetime']}
                helperText={errors['datetime']}
                value={formValues.datetime}
                onChange={handleInputChange}
                required
                size={isMobile ? 'small' : 'medium'}
              />
            </Box>

            {/* 快捷时间选择 - 仅在创建时显示 */}
            {!existingQrUrl && (
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  快捷选择：
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(quickTimeOptions).map(([type, option]) => (
                    <Button
                      key={type}
                      variant={
                        isQuickDateTimeActive(type) ? 'contained' : 'outlined'
                      }
                      size="small"
                      onClick={() => handleQuickDateTimeSelect(type)}
                      sx={{
                        minWidth: isMobile ? 'auto' : '120px',
                        backgroundColor: isQuickDateTimeActive(type)
                          ? 'blue'
                          : 'transparent',
                        borderColor: 'blue',
                        color: isQuickDateTimeActive(type) ? 'white' : 'blue',
                      }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </Box>
              </Box>
            )}

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>
                    活动地点
                  </Typography>
                  <TextField
                    fullWidth
                    id="location"
                    name="location"
                    type="text"
                    error={!!errors['location']}
                    helperText={errors['location']}
                    value={formValues.location}
                    onChange={handleInputChange}
                    placeholder="线下活动请填写具体地址，线上活动可填写平台名称"
                    size={isMobile ? 'small' : 'medium'}
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>
                    活动时长（小时）
                  </Typography>
                  <TextField
                    fullWidth
                    id="duration"
                    name="duration"
                    type="number"
                    value={formValues.duration}
                    onChange={handleInputChange}
                    placeholder="例如：2"
                    size={isMobile ? 'small' : 'medium'}
                  />
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>
                最大参与人数
              </Typography>
              <TextField
                fullWidth
                id="max_ppl"
                name="max_ppl"
                type="number"
                value={formValues.max_ppl || ''}
                onChange={handleInputChange}
                placeholder="不限制可留空"
                size={isMobile ? 'small' : 'medium'}
              />
            </Box>
          </CardContent>
        </Card>

        {/* 联系方式 */}
        <Box
          sx={{
            mb: 4,
            p: 3,
            borderRadius: 1,
            boxShadow: 1,
          }}
        >
          <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
            联系方式
          </Typography>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>
              组织者姓名
            </Typography>
            <TextField
              fullWidth
              id="creator"
              name="creator"
              type="text"
              error={!!errors['creator']}
              helperText={errors['creator']}
              value={formValues.creator}
              onChange={handleInputChange}
              required
              placeholder="您的姓名"
              size={isMobile ? 'small' : 'medium'}
            />
          </Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>
              微信号
            </Typography>
            <TextField
              fullWidth
              id="wechat_id"
              name="wechat_id"
              type="text"
              error={!!errors['wechat_id']}
              helperText={errors['wechat_id']}
              value={formValues.wechat_id}
              onChange={handleInputChange}
              required
              placeholder="请填写微信号，用于活动沟通"
              size={isMobile ? 'small' : 'medium'}
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>
              活动群二维码
            </Typography>
            <Box
              className={`qr-upload ${dragover ? 'dragover' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragover(true);
              }}
              onDragLeave={() => setDragover(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragover(false);
                if (e.dataTransfer.files.length > 0)
                  handleQRFile(e.dataTransfer.files[0]);
              }}
              sx={{
                border: !!errors['cover']
                  ? '2px dashed #d32f2f'
                  : '2px dashed #ddd',
                borderRadius: 1,
                padding: '2rem',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: dragover
                  ? 'rgba(255, 127, 80, 0.05)'
                  : 'transparent',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: 'rgba(255, 127, 80, 0.05)',
                },
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleQRFile(e.target.files[0]);
                  }
                }}
                style={{ display: 'none' }}
              />
              {qrPreview ? (
                <Box
                  component="img"
                  src={qrPreview}
                  alt="二维码预览"
                  sx={{
                    maxWidth: '200px',
                    maxHeight: '200px',
                    margin: '0 auto',
                    borderRadius: 1,
                  }}
                />
              ) : (
                <>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    请点击上传群二维码
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    支持拖拽上传，JPG/PNG格式
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        </Box>

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={isLoading}
          sx={{
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(255, 127, 80, 0.3)',
            '&:disabled': {
              bgcolor: '#ccc',
              boxShadow: 'none',
            },
          }}
        >
          {isLoading ? '处理中...' : submitText}
        </Button>
      </form>
    </>
  );
};

export default EditForm;
