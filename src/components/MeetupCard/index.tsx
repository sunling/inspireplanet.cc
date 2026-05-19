import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { formatDateCN } from '../../utils/date';
import { Meetup } from '../../netlify/functions/meetup';

interface MeetupWithRsvpCount extends Meetup {
  rsvpCount: number;
  pendingCount: number;
  approvedCount: number;
  cancelledCount: number;
}

interface MeetupCardProps {
  meetup: MeetupWithRsvpCount;
  showApprovalStats?: boolean;
}

export const MeetupCard: React.FC<MeetupCardProps> = ({ meetup, showApprovalStats = false }) => {
  const navigate = useNavigate();

  return (
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
        <Typography variant="h6" component="h2" sx={{ fontSize: '1rem', mb: 1 }}>
          {meetup.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          📅 {formatDateCN(meetup.datetime)}
        </Typography>
        {meetup.location && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            📍 {meetup.location}
          </Typography>
        )}
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`总报名 ${meetup.rsvpCount}`}
            size="small"
            color="primary"
          />
          {showApprovalStats && meetup.survey_id ? (
            <>
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
              label={`已报名 ${meetup.rsvpCount}`}
              size="small"
              color="default"
            />
          )}
        </Box>
      </CardContent>
      <Box sx={{ p: 2, pt: 0 }}>
        <Button
          fullWidth
          variant="contained"
          onClick={() => navigate(`/meetup-participants?id=${meetup.id}`)}
        >
          管理报名
        </Button>
      </Box>
    </Card>
  );
};