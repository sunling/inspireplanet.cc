import React from 'react';
import {
  Box,
  Fab,
  SpeedDial,
  SpeedDialIcon,
  SpeedDialAction,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  CardMembership,
  CalendarToday,
  FileCopy,
  Share,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useResponsive } from '../../hooks/useResponsive';

interface FloatingActionsProps {
  showCopyLink?: boolean;
  showShare?: boolean;
  onCopyLink?: () => void;
  onShare?: () => void;
}

const FloatingActions: React.FC<FloatingActionsProps> = ({
  showCopyLink = false,
  showShare = false,
  onCopyLink,
  onShare,
}) => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [open, setOpen] = React.useState(false);

  const handleCreateCard = () => {
    navigate('/create-card');
  };

  const handleCreateMeetup = () => {
    navigate('/create-meetup');
  };

  const actions = [
    { icon: <CardMembership />, name: '创建卡片', onClick: handleCreateCard },
    { icon: <CalendarToday />, name: '创建活动', onClick: handleCreateMeetup },
  ];

  if (showCopyLink && onCopyLink) {
    actions.push({ icon: <FileCopy />, name: '复制链接', onClick: onCopyLink });
  }

  if (showShare && onShare) {
    actions.push({ icon: <Share />, name: '分享', onClick: onShare });
  }

  // 在移动端使用SpeedDial，在PC端使用固定位置的Fab
  if (isMobile || actions.length > 2) {
    return (
      <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999 }}>
        <SpeedDial
          ariaLabel="快速操作"
          icon={<SpeedDialIcon />}
          onClose={() => setOpen(false)}
          onOpen={() => setOpen(true)}
          open={open}
          direction="up"
          FabProps={{
            sx: {
              bgcolor: '#1976d2',
              '&:hover': {
                bgcolor: '#1565c0',
              },
            },
          }}
        >
          {actions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              tooltipOpen
              onClick={action.onClick}
            />
          ))}
        </SpeedDial>
      </Box>
    );
  }

  // PC端显示多个固定位置的Fab
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {actions.map((action, index) => (
        <Tooltip key={action.name} title={action.name} placement="left">
          <Fab
            color={index === 0 ? 'primary' : 'secondary'}
            aria-label={action.name}
            onClick={action.onClick}
            sx={{
              bgcolor: index === 0 ? '#1976d2' : '#7b1fa2',
              '&:hover': {
                bgcolor: index === 0 ? '#1565c0' : '#6a1b9a',
              },
            }}
          >
            {action.icon}
          </Fab>
        </Tooltip>
      ))}
    </Box>
  );
};

export default FloatingActions;
