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
  const contentLength =
    Array.from(data.reflection || '').length +
    Array.from(data.completionMessage || '').length;
  const isDense = contentLength > 70 || data.activityName.length > 28;

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
        py: { xs: 2, sm: isDense ? 2 : 4 },
        textAlign: 'center',
        color: '#352b24',
        fontFamily: 'serif',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        boxShadow: '0 18px 48px rgba(92, 62, 40, 0.16)',
      }}
    >
      <Typography
        sx={{
          color: '#b14834',
          letterSpacing: { xs: 2, sm: 6 },
          fontSize: { xs: 7, sm: isDense ? 10 : 13 },
          lineHeight: 1.2,
        }}
      >
        COMPLETION CERTIFICATE
      </Typography>
      <Typography
        sx={{
          fontSize: { xs: 18, sm: isDense ? 25 : 32 },
          fontWeight: 700,
          mt: { xs: 0.5, sm: 0.75 },
          lineHeight: 1.2,
        }}
      >
        结 营 证 书
      </Typography>
      <Box
        sx={{
          mt: { xs: 0.75, sm: isDense ? 1.25 : 2 },
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: { xs: 0.5, sm: 1 },
          minHeight: { xs: 14, sm: isDense ? 22 : 28 },
        }}
      >
        <Typography
          sx={{
            color: '#6f5c4d',
            fontSize: { xs: 12, sm: isDense ? 18 : 22 },
            lineHeight: 1.25,
            overflowWrap: 'anywhere',
          }}
        >
          {data.activityName}
        </Typography>
        {data.activityEdition && (
          <Typography
            component="span"
            sx={{
              color: '#9a6f55',
              bgcolor: '#f5ede4',
              borderRadius: 999,
              px: { xs: 0.75, sm: 1.25 },
              py: 0.25,
              fontSize: { xs: 7, sm: isDense ? 9 : 11 },
              lineHeight: 1.4,
              whiteSpace: 'nowrap',
            }}
          >
            {data.activityEdition}
          </Typography>
        )}
      </Box>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: { xs: 0.5, sm: isDense ? 0.75 : 1.5 },
          py: { xs: 0.5, sm: isDense ? 1 : 2 },
        }}
      >
        <Box sx={{ width: '88%', mx: 'auto' }}>
          {summary && (
            <Typography
              sx={{
                color: '#ad9a87',
                fontSize: { xs: 7, sm: isDense ? 10 : 12 },
                lineHeight: 1.4,
                mb: { xs: 0.25, sm: 0.5 },
              }}
            >
              {summary}
            </Typography>
          )}
          <Typography
            sx={{
              color: '#6f5c4d',
              fontSize: { xs: 8, sm: isDense ? 12 : 14 },
              lineHeight: 1.45,
            }}
          >
            {data.completionMessage}
          </Typography>
        </Box>
        {data.reflection && (
          <Box sx={{ width: '88%', mx: 'auto' }}>
            <Typography
              sx={{
                color: '#b14834',
                fontSize: { xs: 11, sm: isDense ? 17 : 21 },
                lineHeight: isDense ? 1.4 : 1.5,
                whiteSpace: 'pre-line',
                overflowWrap: 'anywhere',
              }}
            >
              {data.reflection}
            </Typography>
          </Box>
        )}
      </Box>
      <Box
        sx={{
          textAlign: 'right',
          mt: { xs: 0.5, sm: isDense ? 0.75 : 1.25 },
          mb: { xs: 0.75, sm: isDense ? 1 : 1.5 },
          flexShrink: 0,
        }}
      >
        <Typography
          sx={{
            color: '#ad9a87',
            fontSize: { xs: 6, sm: isDense ? 8 : 9 },
            letterSpacing: 2,
          }}
        >
          结营留念
        </Typography>
        <Typography
          sx={{
            color: '#55463b',
            fontSize: { xs: 11, sm: isDense ? 16 : 19 },
            fontWeight: 700,
          }}
        >
          {data.participantName}
        </Typography>
        <Typography
          sx={{ color: '#8c735c', fontSize: { xs: 7, sm: isDense ? 9 : 11 } }}
        >
          {formatCertificateDate(data.completionDate)}
        </Typography>
      </Box>
      <Box
        sx={{
          pt: { xs: 0.75, sm: isDense ? 1 : 1.5 },
          display: 'grid',
          gridTemplateColumns: '1fr 1.4fr 1fr',
          alignItems: 'end',
          gap: 1,
          flexShrink: 0,
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
          {data.community}
        </Typography>
        <Typography
          sx={{
            textAlign: 'right',
            color: '#9a8879',
            fontSize: { xs: 6, sm: 11 },
          }}
        >
          {formatCertificateDate(data.startDate)} —{' '}
          {formatCertificateDate(data.endDate)}
        </Typography>
      </Box>
    </Box>
  );
};

export default CompletionCertificatePreview;
