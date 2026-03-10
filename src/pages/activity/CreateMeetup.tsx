import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Container } from '@mui/material';
import useResponsive from '../../hooks/useResponsive';
import { useGlobalSnackbar } from '../../context/app';
import { meetupsApi } from '@/netlify/config';
import { Meetup, MeetupMode } from '@/netlify/functions/meetup';
import EditForm, { formatDateTimeLocal } from './components/EditForm';

// 从localStorage获取用户信息
const getCurrentUser = () => {
  try {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
  } catch (error) {
    console.error('解析用户信息失败:', error);
    return null;
  }
};

const CreateMeetup: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const showSnackbar = useGlobalSnackbar();
  const [submitLoading, setSubmitLoading] = useState(false);

  // 初始化默认日期
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0);

  // 初始表单值
  const initialValues: Meetup = {
    title: '',
    description: '',
    mode: MeetupMode.ONLINE,
    datetime: formatDateTimeLocal(tomorrow),
    location: '',
    duration: '',
    max_ppl: null,
    creator: getCurrentUser()?.name || '',
    wechat_id: '',
    cover: '',
  };

  // 处理表单提交
  const handleSubmit = async (data: any) => {
    setSubmitLoading(true);
    try {
      // 提交活动数据
      const response = await meetupsApi.create(data);

      if (!response.success) {
        showSnackbar.error(response.error || '发布失败');
        return;
      }

      showSnackbar.success('活动发布成功！');
      setTimeout(() => navigate('/meetups'), 3000);
    } catch (error) {
      showSnackbar.error(
        '发布失败: ' + (error instanceof Error ? error.message : '未知错误')
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
          快速创建活动，连接志同道合的朋友
        </Typography>

        <EditForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          submitText="🚀 发布活动"
          isLoading={submitLoading}
        />
      </Box>
    </Container>
  );
};

export default CreateMeetup;
