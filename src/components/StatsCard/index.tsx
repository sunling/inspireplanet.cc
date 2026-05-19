import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';

export interface ParticipantStats {
  total: number;
  confirmed: number;
  cancelled: number;
  pending?: number;
  approved?: number;
  rejected?: number;
}

interface StatsCardProps {
  stats: ParticipantStats;
  showApprovalStats?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({ stats, showApprovalStats = false }) => {
  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <StatItem label="总报名人数" value={stats.total} />
          <StatItem label="已报名" value={stats.confirmed} />
          
          {showApprovalStats && stats.pending !== undefined && (
            <StatItem label="待处理" value={stats.pending} color="warning" />
          )}
          {showApprovalStats && stats.approved !== undefined && (
            <StatItem label="已通过" value={stats.approved} color="success" />
          )}
          {showApprovalStats && stats.rejected !== undefined && (
            <StatItem label="已拒绝" value={stats.rejected} color="error" />
          )}
          
          {!showApprovalStats && (
            <StatItem label="已取消" value={stats.cancelled} />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

interface StatItemProps {
  label: string;
  value: number;
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

const StatItem: React.FC<StatItemProps> = ({ label, value, color = 'default' }) => {
  const getColorStyle = () => {
    switch (color) {
      case 'success':
        return { color: 'success.main' };
      case 'warning':
        return { color: 'warning.main' };
      case 'error':
        return { color: 'error.main' };
      default:
        return {};
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" sx={getColorStyle()}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
};

export default StatsCard;