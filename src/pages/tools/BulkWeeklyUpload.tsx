import React from 'react';
import { Container, Link, Paper, Typography } from '@mui/material';

// Keep old bookmarks useful without offering writes to the archived table.
const BulkWeeklyUpload: React.FC = () => (
  <Container maxWidth="md" sx={{ py: 4 }}>
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        周刊内容维护
      </Typography>
      <Typography paragraph>
        旧的批量上传功能已停用。周刊页面现在直接读取 GitHub 仓库中的内容。
      </Typography>
      <Link
        href="https://github.com/sunling/inspire-planet"
        target="_blank"
        rel="noopener noreferrer"
      >
        前往周刊内容仓库
      </Link>
    </Paper>
  </Container>
);

export default BulkWeeklyUpload;
