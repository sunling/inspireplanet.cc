import React, { useEffect, useRef, useState } from 'react';
import './pomodoro.css';
import {
  Alert,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

const Pomodoro: React.FC = () => {
  const [durations, setDurations] = useState(['25', '5', '15']);
  const validDurations = durations.every(
    (value) => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 180
  );
  const modes = durations.map((value, index) => ({
    label: ['专注', '短休息', '长休息'][index],
    seconds: Number(value) * 60,
  }));
  const [mode, setMode] = useState(0);
  const [remaining, setRemaining] = useState(modes[0].seconds);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [completed, setCompleted] = useState(0);
  const [finished, setFinished] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const syncFullscreen = () =>
      setFullscreen(document.fullscreenElement === sceneRef.current);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () =>
      document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.fullscreenElement)
        setFullscreen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [fullscreen]);

  const toggleFullscreen = async () => {
    if (fullscreen) {
      if (document.fullscreenElement) await document.exitFullscreen();
      setFullscreen(false);
      return;
    }
    try {
      if (sceneRef.current?.requestFullscreen) {
        await sceneRef.current.requestFullscreen();
      }
      setFullscreen(true);
    } catch {
      setFullscreen(true);
    }
  };

  useEffect(() => {
    if (deadline === null) return;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) {
        setDeadline(null);
        setFinished(true);
        if (mode === 0) setCompleted((count) => count + 1);
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [deadline, mode]);

  const reset = (nextMode: number) => {
    setDeadline(null);
    setMode(nextMode);
    setRemaining(modes[nextMode].seconds);
    setFinished(false);
  };

  const toggle = () => {
    if (deadline !== null) {
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
      setDeadline(null);
    } else {
      const seconds = remaining || modes[mode].seconds;
      setRemaining(seconds);
      setFinished(false);
      setDeadline(Date.now() + seconds * 1000);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 4 },
          textAlign: 'center',
          borderRadius: 4,
          bgcolor: '#fffdf4',
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          番茄钟
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          一次只做一件事，给专注留一点时间。
        </Typography>
        <div
          ref={sceneRef}
          className={`pomodoro-scene ${deadline !== null ? 'is-running' : ''} ${fullscreen ? 'is-fullscreen' : ''}`}
        >
          <button
            type="button"
            className="pomodoro-fullscreen-toggle"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? '退出全屏' : '进入全屏'}
          >
            {fullscreen ? '退出全屏 ⤡' : '全屏 ⤢'}
          </button>
          {fullscreen && (
            <div className="pomodoro-fullscreen-controls">
              <button type="button" onClick={toggle} disabled={!validDurations}>
                {deadline !== null ? '暂停' : '开始 / 继续'}
              </button>
              <button
                type="button"
                onClick={() => reset(mode)}
                disabled={!validDurations}
              >
                重置
              </button>
            </div>
          )}
          <div className="pomodoro-canopy" aria-hidden="true" />
          <div
            className="pomodoro-forest pomodoro-forest-back"
            aria-hidden="true"
          />
          <div
            className="pomodoro-forest pomodoro-forest-front"
            aria-hidden="true"
          />
          <div className="pomodoro-display">
            <span className="pomodoro-caption">FOREST EXPRESS · 番茄专线</span>
            <div
              className="pomodoro-time"
              role="timer"
              aria-label={`${modes[mode].label}剩余时间`}
            >
              {String(Math.floor(remaining / 60)).padStart(2, '0')}:
              {String(remaining % 60).padStart(2, '0')}
            </div>
            <span className="pomodoro-status" role="status">
              {finished
                ? '到站啦'
                : deadline !== null
                  ? mode === 0
                    ? '行动中 · 向目标前进'
                    : '休息中 · 慢慢欣赏风景'
                  : '已停靠 · 准备好再出发'}
            </span>
          </div>
          <div className="pomodoro-train" aria-hidden="true">
            {Array.from({ length: 32 }, (_, index) => index).map((carriage) => (
              <div className="pomodoro-carriage" key={carriage}>
                <span className="pomodoro-passenger">
                  {['🌱', '🌼', '🍅', '🌻'][carriage % 4]}
                </span>
                <span />
                <span />
                <i className="pomodoro-wheel" />
                <i className="pomodoro-wheel" />
              </div>
            ))}
            <div className="pomodoro-engine">
              <div className="pomodoro-sign">
                {mode === 0 ? '行动' : '休息'}
              </div>
              <div className="pomodoro-tomato-body">
                <span className="pomodoro-tomato-leaf">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="pomodoro-tomato-hand pomodoro-tomato-hand-left" />
                <span className="pomodoro-tomato-hand pomodoro-tomato-hand-right" />
                <span className="pomodoro-tomato-face">
                  <i />
                  <b />
                  <i />
                </span>
                <span className="pomodoro-tomato-cheek pomodoro-tomato-cheek-left" />
                <span className="pomodoro-tomato-cheek pomodoro-tomato-cheek-right" />
              </div>
              <i className="pomodoro-wheel" />
              <i className="pomodoro-wheel" />
            </div>
          </div>
          <div className="pomodoro-track" aria-hidden="true">
            <svg width="100%" height="30" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern
                  id="pomodoro-ballast"
                  width="173"
                  height="30"
                  patternUnits="userSpaceOnUse"
                >
                  <path fill="#53675b" d="M0 0H173V30H0Z" />
                  <path
                    fill="#6d7e6b"
                    d="m3 15 7-3 5 5-6 4-7-2Zm34 9 6-4 7 4-3 5-8-1Zm38-12 7-2 5 5-8 4-5-3Zm44 10 9-4 6 5-4 5-10-1Zm33-11 8-2 4 6-7 3-5-2Z"
                  />
                  <path
                    fill="#435a50"
                    d="m20 23 6-3 5 5-4 4-7-1Zm37-6 6-3 4 4-4 4-5-1Zm41 9 5-5 8 3-1 5-9 1Zm44-6 5-3 6 4-4 4-6-1Z"
                  />
                </pattern>
                <pattern
                  id="pomodoro-sleepers"
                  width="96"
                  height="30"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    fill="#304c43"
                    opacity=".45"
                    d="M10 10h25v14H10Zm49 0h24v13H59Z"
                  />
                  <path
                    fill="#535d4e"
                    d="m10 8 23 1-1 11-23-1Zm49 0 22-1 1 12-23 1Z"
                  />
                  <path
                    stroke="#72806a"
                    strokeWidth="2"
                    d="m12 11 18 1m32-1 16-1"
                  />
                  <path stroke="#3f5145" d="m13 16 15 1m35-1 13-1" />
                </pattern>
              </defs>
              <path fill="url(#pomodoro-ballast)" d="M0 8H10000V30H0Z" />
              <path fill="url(#pomodoro-sleepers)" d="M0 0H10000V30H0Z" />
            </svg>
          </div>
          <div className="pomodoro-ground" aria-hidden="true" />
        </div>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          {modes.map((item, index) => (
            <TextField
              key={item.label}
              label={`${item.label}（分钟）`}
              type="number"
              size="small"
              fullWidth
              value={durations[index]}
              disabled={deadline !== null}
              error={
                !/^\d+$/.test(durations[index]) ||
                Number(durations[index]) < 1 ||
                Number(durations[index]) > 180
              }
              helperText="1–180 分钟"
              slotProps={{ htmlInput: { min: 1, max: 180, step: 1 } }}
              onChange={(event) => {
                const value = event.target.value;
                setDurations((current) =>
                  current.map((duration, position) =>
                    position === index ? value : duration
                  )
                );
                if (index === mode) {
                  setRemaining(
                    /^\d+$/.test(value) &&
                      Number(value) >= 1 &&
                      Number(value) <= 180
                      ? Number(value) * 60
                      : 0
                  );
                  setFinished(false);
                }
              }}
            />
          ))}
        </Stack>
        <Stack direction="row" spacing={1} justifyContent="center">
          {modes.map((item, index) => (
            <Button
              key={item.label}
              variant={mode === index ? 'contained' : 'outlined'}
              onClick={() => reset(index)}
              disabled={!validDurations}
            >
              {item.label}
            </Button>
          ))}
        </Stack>
        <Stack
          direction="row"
          spacing={2}
          justifyContent="center"
          sx={{ my: 3 }}
        >
          <Button
            variant="contained"
            size="large"
            onClick={toggle}
            disabled={!validDurations}
          >
            {deadline !== null
              ? '暂停'
              : remaining < modes[mode].seconds && remaining > 0
                ? '继续'
                : '开始'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => reset(mode)}
            disabled={!validDurations}
          >
            重置
          </Button>
        </Stack>
        {finished && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {mode === 0 ? '专注完成！休息一下吧。' : '休息结束，准备好再开始。'}
          </Alert>
        )}
        <Typography color="text.secondary">
          本次已完成 {completed} 个番茄
        </Typography>
      </Paper>
    </Container>
  );
};

export default Pomodoro;
