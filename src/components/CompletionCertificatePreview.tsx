import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  CompletionCertificateData,
  buildRecordSummary,
  formatCertificateDate,
} from '../utils/completionCertificate';

const CompletionCertificatePreview: React.FC<{
  data: CompletionCertificateData;
}> = ({ data }) => {
  const summary = buildRecordSummary(data.recordDays, data.recordCount);
  const meta = [data.activityEdition, data.certificateNumber]
    .filter(Boolean)
    .join(' · ');

  return (
    <Box
      sx={{
        aspectRatio: '1200 / 848',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: '#fffdf8',
        border: 'clamp(8px, 2.8vw, 24px) solid #f5efe4',
        outline: '1px solid #c95438',
        outlineOffset: 'clamp(-7px, -1vw, -3px)',
        px: { xs: 2.5, sm: 6 },
        py: { xs: 2, sm: 4 },
        textAlign: 'center',
        color: '#352b24',
        fontFamily: 'serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography
        sx={{
          color: '#b14834',
          letterSpacing: { xs: 2, sm: 6 },
          fontSize: { xs: 8, sm: 13 },
        }}
      >
        COMPLETION CERTIFICATE
      </Typography>
      <Typography
        sx={{ fontSize: { xs: 22, sm: 38 }, fontWeight: 700, mt: 0.5 }}
      >
        结 营 证 书
      </Typography>
      <Box
        sx={{
          width: '28%',
          borderTop: '1px solid #d9b778',
          mx: 'auto',
          my: { xs: 1, sm: 2 },
        }}
      />
      <Typography sx={{ color: '#6f5c4d', fontSize: { xs: 13, sm: 22 } }}>
        {data.activityName}
      </Typography>
      <Typography
        sx={{
          color: '#b14834',
          fontSize: { xs: 25, sm: 42 },
          fontWeight: 700,
          my: { xs: 0.5, sm: 1.5 },
        }}
      >
        {data.participantName}
      </Typography>
      <Typography
        sx={{ color: '#8c735c', fontSize: { xs: 9, sm: 15 }, letterSpacing: 1 }}
      >
        {formatCertificateDate(data.startDate)} —{' '}
        {formatCertificateDate(data.endDate)}
      </Typography>
      <Box sx={{ flex: 1, minHeight: { xs: 8, sm: 18 } }} />
      {summary && (
        <Typography
          sx={{ fontSize: { xs: 11, sm: 18 }, mb: { xs: 0.5, sm: 1.5 } }}
        >
          {summary}
        </Typography>
      )}
      <Typography sx={{ fontSize: { xs: 12, sm: 20 }, fontWeight: 700 }}>
        {data.completionMessage}
      </Typography>
      {data.reflection && (
        <Typography
          sx={{ color: '#8c735c', fontSize: { xs: 9, sm: 16 }, mt: 1 }}
        >
          「{data.reflection}」
        </Typography>
      )}
      <Box sx={{ flex: 1, minHeight: { xs: 8, sm: 18 } }} />
      <Box
        sx={{
          borderTop: '1px solid #eadfce',
          pt: { xs: 1, sm: 2 },
          display: 'grid',
          gridTemplateColumns: '1fr 1.4fr 1fr',
          alignItems: 'end',
          gap: 1,
        }}
      >
        <Typography
          sx={{
            textAlign: 'left',
            color: '#6f5c4d',
            fontSize: { xs: 7, sm: 13 },
          }}
        >
          活动发起人 · {data.organizer}
        </Typography>
        <Typography sx={{ color: '#6f5c4d', fontSize: { xs: 7, sm: 13 } }}>
          {data.community} · {formatCertificateDate(data.completionDate)}
        </Typography>
        <Typography
          sx={{
            textAlign: 'right',
            color: '#9a8879',
            fontSize: { xs: 6, sm: 11 },
          }}
        >
          {meta}
        </Typography>
      </Box>
    </Box>
  );
};

export default CompletionCertificatePreview;
