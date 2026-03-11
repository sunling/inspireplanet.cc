import React, { useEffect, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import { notificationsApi } from '../../netlify/config';
import { useGlobalSnackbar } from '@/context/app';
import { dateTime, react } from '@/utils/helpers';

const Notifications: React.FC = () => {
  const show = useGlobalSnackbar();
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const timeZone = dateTime.getTimeZone();

  const load = async () => {
    const res = await notificationsApi.list(
      filter === 'unread' ? { status: 'unread' } : undefined
    );
    react.handleApiResponse(
      res,
      (data) => setItems(data?.notifications || []),
      (error) => show.error(error || '加载失败')
    );
  };

  useEffect(() => {
    load();
  }, [filter]);

  const markRead = async (id: string) => {
    const res = await notificationsApi.markRead(id);
    react.handleApiResponse(res, load, (error) =>
      show.error(error || '操作失败')
    );
  };

  const markAll = async () => {
    const res = await notificationsApi.markAllRead();
    react.handleApiResponse(res, load, (error) =>
      show.error(error || '操作失败')
    );
  };
  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: 6,
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      }}
    >
      <Container maxWidth="md">
        <Paper sx={{ p: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="h5">通知中心</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant={filter === 'all' ? 'contained' : 'outlined'}
                onClick={() => setFilter('all')}
              >
                全部
              </Button>
              <Button
                variant={filter === 'unread' ? 'contained' : 'outlined'}
                onClick={() => setFilter('unread')}
              >
                未读
              </Button>
              <Button variant="outlined" onClick={markAll}>
                全部标记已读
              </Button>
            </Box>
          </Box>
          <List>
            {items.map((n) => (
              <ListItem key={n.id} sx={{ borderBottom: '1px solid #eee' }}>
                <ListItemText
                  primary={
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                      }}
                    >
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <Typography variant="subtitle1">{n.title}</Typography>
                        {n.status === 'unread' ? (
                          <Chip size="small" color="warning" label="未读" />
                        ) : (
                          <Chip size="small" variant="outlined" label="已读" />
                        )}
                      </Box>
                      {!!n.created_at && (
                        <Typography variant="caption" color="text.secondary">
                          {(() => {
                            try {
                              const local = DateTime.fromISO(
                                String(n.created_at),
                                { zone: 'utc' }
                              ).toLocal();
                              return (
                                local.toRelative() ||
                                local.toFormat('yyyy/MM/dd HH:mm')
                              );
                            } catch {
                              return String(n.created_at);
                            }
                          })()}
                        </Typography>
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {renderContent(String(n.content || ''))}
                    </Typography>
                  }
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {n.status === 'unread' && (
                    <Button size="small" onClick={() => markRead(n.id)}>
                      标记已读
                    </Button>
                  )}
                  {n.path && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => window.location.assign(n.path)}
                    >
                      前往
                    </Button>
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        </Paper>
      </Container>
    </Box>
  );
};

export default Notifications;
const renderContent = (text: string) => {
  const isoRegex = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)/g;
  return text.replace(isoRegex, (m) => {
    try {
      const dt = DateTime.fromISO(m, { zone: 'utc' }).toLocal();
      return dt.toFormat('yyyy/MM/dd HH:mm');
    } catch {
      return m;
    }
  });
};
