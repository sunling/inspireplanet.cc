import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Container } from '@mui/material';
import useResponsive from '../../hooks/useResponsive';
import { useGlobalSnackbar } from '../../context/app';
import { meetupsApi } from '@/netlify/config';
import { Meetup, MeetupMode } from '@/netlify/functions/meetup';
import { getUserId, getUserName } from '@/utils/user';
import EditForm, { formatDateTimeLocal } from './components/EditForm';

const EditMeetup: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useResponsive();
  const showSnackbar = useGlobalSnackbar();
  const [submitLoading, setSubmitLoading] = useState(false);
  const [initialValues, setInitialValues] = useState<Meetup>({
    title: '',
    description: '',
    mode: MeetupMode.ONLINE,
    datetime: formatDateTimeLocal(new Date()),
    location: '',
    duration: '',
    max_ppl: null,
    creator: getUserName() || '',
    wechat_id: '',
    cover: '',
  });
  const [existingQrUrl, setExistingQrUrl] = useState<string>('');

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const meetupId = searchParams.get('id') || '';

  useEffect(() => {
    const load = async () => {
      if (!meetupId) return;
      const res = await meetupsApi.getById(meetupId);
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
      setInitialValues({
        ...record,
        datetime: formatDateTimeLocal(start),
      });
      setExistingQrUrl(record.cover || '');
    };
    load();
  }, [meetupId]);

  // 处理表单提交
  const handleSubmit = async (data: any) => {
    setSubmitLoading(true);
    try {
      // 提交更新数据
      const response = await meetupsApi.update({ id: meetupId, ...data });
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
      <Box
        sx={{
          maxWidth: 800,
          mx: 'auto',
          bgcolor: 'white',
          p: 4,
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        <Typography variant="body1" color="text.secondary" paragraph>
          修改活动信息
        </Typography>

        <EditForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          submitText="💾 保存修改"
          isLoading={submitLoading}
          existingQrUrl={existingQrUrl}
        />
      </Box>
    </Container>
  );
};

export default EditMeetup;
