import React, { useState, useEffect } from 'react';
import {
  Box,
  CircularProgress,
  Container,
  Grid,
  Paper,
  IconButton,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowBack } from '@mui/icons-material';
import { useGlobalSnackbar } from '../../context/app';
import { meetupsApi } from '../../netlify/services/meetups';
import participantsApi from '../../netlify/services/participants';
import { Meetup } from '../../netlify/functions/meetup';
import { MeetupCard } from '../../components/MeetupCard';

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
        const meetupsWithStats = await Promise.all(
          response.data.meetups.map(async (meetup) => {
            try {
              const participantsResponse =
                await participantsApi.getParticipants({
                  meetup_id: Number(meetup.id),
                  stats_only: true,
                });
              if (participantsResponse.success && participantsResponse.data) {
                const stats = participantsResponse.data;
                return {
                  ...meetup,
                  rsvpCount: stats.total || 0,
                  pendingCount: stats.pendingCount || 0,
                  approvedCount: stats.approvedCount || 0,
                  cancelledCount: stats.cancelledCount || 0,
                };
              }
            } catch (err) {
              console.error(`获取活动 ${meetup.id} 的参与者失败:`, err);
            }
            return {
              ...meetup,
              rsvpCount: 0,
              pendingCount: 0,
              approvedCount: 0,
              cancelledCount: 0,
            };
          })
        );
        setMeetups(
          meetupsWithStats.sort((left, right) => {
            const leftTime = new Date(left.datetime).getTime();
            const rightTime = new Date(right.datetime).getTime();
            if (!Number.isFinite(leftTime)) return 1;
            if (!Number.isFinite(rightTime)) return -1;
            return rightTime - leftTime;
          })
        );
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
                <MeetupCard
                  meetup={meetup}
                  showApprovalStats={!!meetup.survey_id}
                />
              </Grid>
            ))}
        </Grid>
      )}
    </Container>
  );
};

export default MeetupParticipantsList;
