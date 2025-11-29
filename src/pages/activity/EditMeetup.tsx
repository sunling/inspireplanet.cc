import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Container,
  Card,
  CardContent,
  Grid,
  MenuItem,
} from '@mui/material';
import useResponsive from '../../hooks/useResponsive';
import { useGlobalSnackbar } from '../../context/app';
import { api } from '@/netlify/configs';

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
  qrImageUrl: string; // can be http url or base64 for new upload
}

interface FormErrors {
  [key: string]: string | undefined;
}

const formatDateTimeLocal = (date: Date): string => {
  const [year, month, day, hours, minutes] = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
  ];
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const EditMeetup: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useResponsive();
  const showSnackbar = useGlobalSnackbar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragover, setDragover] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [qrPreview, setQrPreview] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const meetupId = searchParams.get('id') || '';

  const [formValues, setFormValues] = useState<MeetupData>({
    title: '',
    description: '',
    type: '',
    datetime: formatDateTimeLocal(new Date()),
    location: '',
    duration: '',
    maxParticipants: '',
    organizer: '',
    contact: '',
    qrImageUrl: '',
  });

  const [existingQrUrl, setExistingQrUrl] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      if (!meetupId) return;
      const res = await api.meetups.getById(meetupId);
      if (!res.success) {
        showSnackbar.error(res.error || '加载活动失败');
        return;
      }
      const record = (res.data?.meetups || [])[0];
      if (!record) {
        showSnackbar.error('活动不存在');
        return;
      }
      const start = new Date(record.datetime);
      setFormValues({
        title: record.title || '',
        description: record.description || '',
        type: record.type || record.mode || '',
        datetime: formatDateTimeLocal(start),
        location: record.location || '',
        duration: String(record.duration ?? ''),
        maxParticipants: String(record.max_participants ?? ''),
        organizer: record.organizer || record.creator || '',
        contact: record.contact || record.wechat_id || '',
        qrImageUrl: record.qr_image_url || record.cover || '',
      });
      setExistingQrUrl(record.qr_image_url || record.cover || '');
      setQrPreview(record.qr_image_url || record.cover || '');
    };
    load();
  }, [meetupId]);

  const validateForm = (values: MeetupData): FormErrors => {
    const newErrors: FormErrors = {};
    if (!values.title.trim()) newErrors.title = '此字段为必填项';
    if (!values.description.trim()) newErrors.description = '此字段为必填项';
    if (!values.type) newErrors.type = '此字段为必填项';
    if (!values.datetime) newErrors.datetime = '此字段为必填项';
    if (!values.organizer.trim()) newErrors.organizer = '此字段为必填项';
    if (!values.contact.trim()) newErrors.contact = '此字段为必填项';
    setErrors(newErrors);
    return newErrors;
  };

  const handleQRFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, qrImageUrl: '请上传图片文件' }));
      showSnackbar.error('请上传图片文件');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, qrImageUrl: '图片大小不能超过5MB' }));
      showSnackbar.error('图片大小不能超过5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const base64Image = e.target.result as string;
        setQrPreview(base64Image);
        setFormValues((prev) => ({ ...prev, qrImageUrl: base64Image }));
        setErrors((prev) => {
          const next = { ...prev };
          delete next.qrImageUrl;
          return next;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadQRImageIfNeeded = async (): Promise<string> => {
    try {
      const val = formValues.qrImageUrl || '';
      if (!val) return '';
      if (/^https?:\/\//i.test(val)) return val; // keep existing URL
      const response = await api.images.upload(val);
      if (!response.success) {
        showSnackbar.error('上传二维码失败');
        return '';
      }
      return response.data?.url || '';
    } catch (error) {
      showSnackbar.error(error instanceof Error ? error.message : '上传二维码失败');
      return '';
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors = validateForm(formValues);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitLoading(true);
    try {
      const localDateTime = new Date(formValues.datetime);
      const qrUrl = await uploadQRImageIfNeeded();

      const updateData: any = {
        title: formValues.title,
        description: formValues.description,
        type: formValues.type,
        datetime: localDateTime.toISOString(),
        location: formValues.location || null,
        duration: formValues.duration ? parseFloat(formValues.duration) : null,
        max_participants: formValues.maxParticipants
          ? parseInt(formValues.maxParticipants)
          : null,
        organizer: formValues.organizer,
        contact: formValues.contact,
        qr_image_url: qrUrl || existingQrUrl || null,
      };

      const response = await api.meetups.update(meetupId, updateData);
      if (!response.success) {
        showSnackbar.error(response.error || '更新失败');
        return;
      }

      showSnackbar.success('活动已更新');
      setTimeout(() => navigate(`/meetup-detail?id=${meetupId}`), 1000);
    } catch (error) {
      showSnackbar.error(
        '更新失败: ' + (error instanceof Error ? error.message : '未知错误')
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ maxWidth: 800, mx: 'auto', bgcolor: 'white', p: 4, borderRadius: 2, boxShadow: 1 }}>
        <Typography variant="body1" color="text.secondary" paragraph>
          修改活动信息
        </Typography>

        <form>
          <Box sx={{ mb: 4, p: 3, borderRadius: 1, boxShadow: 1 }}>
            <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>基本信息</Typography>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>活动标题</Typography>
              <TextField fullWidth id="title" name="title" type="text" value={formValues.title} helperText={errors['title']} error={!!errors['title']} onChange={handleInputChange} required placeholder="输入活动标题" size={isMobile ? 'small' : 'medium'} />
            </Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>活动描述</Typography>
              <TextField fullWidth id="description" name="description" type="text" value={formValues.description} onChange={handleInputChange} error={!!errors['description']} helperText={errors['description']} required placeholder="详细描述活动内容、目标和亮点" multiline minRows={4} size={isMobile ? 'small' : 'medium'} />
            </Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>活动类型</Typography>
              <TextField fullWidth id="type" name="type" value={formValues.type} onChange={handleInputChange} error={!!errors['type']} helperText={errors['type']} required select size={isMobile ? 'small' : 'medium'}>
                <MenuItem key="online" value="online">线上活动</MenuItem>
                <MenuItem key="offline" value="offline">线下活动</MenuItem>
                <MenuItem key="hybrid" value="hybrid">线上线下结合</MenuItem>
              </TextField>
            </Box>
          </Box>

          <Card sx={{ mb: 4, boxShadow: 1, borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight="bold">时间地点</Typography>
            </Box>
            <CardContent>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>活动时间</Typography>
                <TextField fullWidth id="datetime" name="datetime" type="datetime-local" error={!!errors['datetime']} helperText={errors['datetime']} value={formValues.datetime} onChange={handleInputChange} required size={isMobile ? 'small' : 'medium'} />
              </Box>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>活动地点</Typography>
                    <TextField fullWidth id="location" name="location" type="text" error={!!errors['location']} helperText={errors['location']} value={formValues.location} onChange={handleInputChange} placeholder="线下活动请填写具体地址，线上活动可填写平台名称" size={isMobile ? 'small' : 'medium'} />
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>活动时长（小时）</Typography>
                    <TextField fullWidth id="duration" name="duration" type="number" value={formValues.duration} onChange={handleInputChange} placeholder="例如：2" size={isMobile ? 'small' : 'medium'} />
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>最大参与人数</Typography>
                <TextField fullWidth id="maxParticipants" name="maxParticipants" type="number" value={formValues.maxParticipants} onChange={handleInputChange} placeholder="不限制可留空" size={isMobile ? 'small' : 'medium'} />
              </Box>
            </CardContent>
          </Card>

          <Box sx={{ mb: 4, p: 3, borderRadius: 1, boxShadow: 1 }}>
            <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>联系方式</Typography>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>组织者姓名</Typography>
              <TextField fullWidth id="organizer" name="organizer" type="text" error={!!errors['organizer']} helperText={errors['organizer']} value={formValues.organizer} onChange={handleInputChange} required placeholder="您的姓名" size={isMobile ? 'small' : 'medium'} />
            </Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>微信号</Typography>
              <TextField fullWidth id="contact" name="contact" type="text" error={!!errors['contact']} helperText={errors['contact']} value={formValues.contact} onChange={handleInputChange} required placeholder="请输入微信号" size={isMobile ? 'small' : 'medium'} />
            </Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight="600" sx={{ mb: 1 }}>活动群二维码</Typography>
              <Box
                className={`qr-upload ${dragover ? 'dragover' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
                onDragLeave={() => setDragover(false)}
                onDrop={(e) => { e.preventDefault(); setDragover(false); if (e.dataTransfer.files.length > 0) handleQRFile(e.dataTransfer.files[0]); }}
                sx={{
                  border: !!errors['qrImageUrl'] ? '2px dashed #d32f2f' : '2px dashed #ddd',
                  borderRadius: 1,
                  padding: '2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: dragover ? 'rgba(255, 127, 80, 0.05)' : 'transparent',
                  transition: 'all 0.2s',
                  '&:hover': { backgroundColor: 'rgba(255, 127, 80, 0.05)' },
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => { if (e.target.files && e.target.files.length > 0) { handleQRFile(e.target.files[0]); } }}
                  style={{ display: 'none' }}
                />
                {qrPreview ? (
                  <Box component="img" src={qrPreview} alt="二维码预览" sx={{ maxWidth: '200px', maxHeight: '200px', margin: '0 auto', borderRadius: 1 }} />
                ) : (
                  <>
                    <Typography variant="body2" sx={{ mb: 1 }}>点击上传或拖拽上传群二维码</Typography>
                    <Typography variant="caption" color="text.secondary">支持 JPG/PNG，最大 5MB</Typography>
                  </>
                )}
              </Box>
            </Box>
          </Box>

          <Button type="submit" variant="contained" fullWidth disabled={submitLoading} onClick={handleSubmit} sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 600 }}>
            {submitLoading ? '保存中...' : '💾 保存修改'}
          </Button>
        </form>
      </Box>
    </Container>
  );
};

export default EditMeetup;
