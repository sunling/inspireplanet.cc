import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Paper,
  IconButton,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useGlobalSnackbar } from '../../context/app';
import { ArrowBack } from '@mui/icons-material';
import { formatDateCN } from '../../utils/date';
import { meetupsApi } from '../../netlify/services/meetups';
import participantsApi from '../../netlify/services/participants';
import { Meetup } from '../../netlify/functions/meetup';
import { RSVPStatus, ApprovalStatus } from '../../netlify/types/rsvp';

// 简单的状态转换函数
const getStatusLabel = (status?: string): string => {
  if (!status) {
    return '-';
  }
  const statusMap: Record<string, string> = {
    published: '已发布',
    draft: '草稿',
    cancelled: '已取消',
  };
  return statusMap[status] || status;
};

interface MeetupWithRsvpCount extends Meetup {
  rsvpCount: number;
  pendingCount: number;
  approvedCount: number;
  cancelledCount: number;
}

const MeetupParticipantsList: React.FC = () => {
  const navigate = useNavigate();
  const showSnackbar = useGlobalSnackbar();
  const [meetups, setMeetups] = useState<MeetupWithRsvpCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllMeetups();
  }, []);

  const loadAllMeetups = async () => {
    try {
      const response = await meetupsApi.getAll();
      if (response.success && response.data) {
        // 为每个活动获取参与者统计数据
        const meetupsWithStats = await Promise.all(
          response.data.meetups.map(async (meetup) => {
            let stats = {
              rsvpCount: 0,
              pendingCount: 0,
              approvedCount: 0,
              cancelledCount: 0,
            };
            try {
              const participantsResponse =
                await participantsApi.getParticipants({
                  meetup_id: Number(meetup.id),
                  limit: 9999,
                });
              if (
                participantsResponse.success &&
                participantsResponse.data?.participants
              ) {
                const participants = participantsResponse.data.participants;
                stats.rsvpCount = participants.length;
                stats.pendingCount = participants.filter(
                  (p: any) => p.application_status === ApprovalStatus.PENDING
                ).length;
                stats.approvedCount = participants.filter(
                  (p: any) => p.application_status === ApprovalStatus.APPROVED
                ).length;
                stats.cancelledCount = participants.filter(
                  (p: any) => p.status === RSVPStatus.CANCELLED
                ).length;
              }
            } catch (err) {
              console.error(`获取活动 ${meetup.id} 的参与者失败:`, err);
            }
            return {
              ...meetup,
              ...stats,
            };
          })
        );
        setMeetups(meetupsWithStats);
      } else {
        showSnackbar.error(response.error || '加载失败');
      }
    } catch (error) {
      console.error('加载活动列表失败:', error);
      showSnackbar.error('加载活动列表失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status?: string): 'success' | 'default' | 'error' => {
    if (!status) {
      return 'default';
    }
    switch (status) {
      case 'published':
        return 'success';
      case 'draft':
        return 'default';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
            报名管理
          </Typography>
          <Typography variant="body1" color="text.secondary">
            管理所有活动的报名情况
          </Typography>
        </Box>
      </Box>

      {meetups.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            暂无活动
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {meetups
            .filter((meetup) => meetup.status != null)
            .map((meetup) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={meetup.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {meetup.cover && (
                    <CardMedia
                      component="img"
                      height="180"
                      image={meetup.cover}
                      alt={meetup.title}
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mb: 1,
                      }}
                    >
                      <Typography
                        variant="h6"
                        component="h2"
                        sx={{ fontSize: '1rem' }}
                      >
                        {meetup.title}
                      </Typography>
                      <Chip
                        label={getStatusLabel(meetup.status)}
                        color={getStatusColor(meetup.status) as any}
                        size="small"
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      📅 {formatDateCN(meetup.datetime)}
                    </Typography>
                    {meetup.location && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        📍 {meetup.location}
                      </Typography>
                    )}
                    <Box
                      sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}
                    >
                      {/* 判断是否需要审批：有问题或问卷的活动需要审批 */}
                      {meetup.survey_id ? (
                        <>
                          <Chip
                            label={`总报名 ${meetup.rsvpCount}`}
                            size="small"
                            color="primary"
                          />
                          <Chip
                            label={`待处理 ${meetup.pendingCount}`}
                            size="small"
                            color="warning"
                          />
                          <Chip
                            label={`已通过 ${meetup.approvedCount}`}
                            size="small"
                            color="success"
                          />
                          <Chip
                            label={`已拒绝 ${meetup.cancelledCount}`}
                            size="small"
                            color="error"
                          />
                        </>
                      ) : (
                        <Chip
                          label={`总报名 ${meetup.rsvpCount}`}
                          size="small"
                          color="primary"
                        />
                      )}
                    </Box>
                  </CardContent>
                  <Box sx={{ p: 2, pt: 0 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() =>
                        navigate(`/meetup-participants?id=${meetup.id}`)
                      }
                    >
                      管理报名
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
        </Grid>
      )}
    </Container>
  );
};

export default MeetupParticipantsList;
