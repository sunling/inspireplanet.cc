import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import { alpha } from '@mui/material/styles';
import { useEffect, useState } from 'react';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import { writingsApi } from '../../netlify/services/writings';

const dateFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const intensities = [0, 0.16, 0.3, 0.46, 0.65];
const pageSize = 50;

export default function MonthlyCheckins({ userId }: { userId: string }) {
  const currentMonth = dateFormatter.format(new Date()).slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [selectedDay, setSelectedDay] = useState<number>();
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    counts?: Record<number, number>;
  }>();
  const [year, monthNumber] = month.split('-').map(Number);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const key = [userId, month, retry].join(':');
  const counts = result?.key === key ? result.counts : undefined;

  useEffect(() => {
    let active = true;
    const load = async () => {
      const dateFrom = new Date(Date.UTC(year, monthNumber - 1, 0))
        .toISOString()
        .slice(0, 10);
      const counts: Record<number, number> = {};
      const seen = new Set<string>();
      for (let page = 1; active; page += 1) {
        const { success, data } = await writingsApi.list({
          scope: 'mine',
          date_from: dateFrom,
          date_to: month + '-' + days,
          page,
          page_size: pageSize,
        });
        if (!active) return;
        if (!success || !data) throw new Error('加载书写记录失败');
        for (const post of data.records) {
          const date = dateFormatter.format(new Date(post.created_at));
          if (
            post.status !== 'published' ||
            !date.startsWith(month + '-') ||
            seen.has(post.id)
          )
            continue;
          seen.add(post.id);
          const day = Number(date.slice(-2));
          counts[day] = (counts[day] || 0) + 1;
        }
        if (page * pageSize >= data.total || data.records.length === 0) break;
      }
      if (active) setResult({ key, counts });
    };
    void load().catch(() => {
      if (active) setResult({ key });
    });
    return () => {
      active = false;
    };
  }, [days, key, month, monthNumber, year]);

  const offset =
    (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const changeMonth = (step: number) => {
    setMonth(
      new Date(Date.UTC(year, monthNumber - 1 + step, 1))
        .toISOString()
        .slice(0, 7)
    );
    setSelectedDay(undefined);
  };

  const total = Object.values(counts || {}).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <Box
      component="section"
      aria-label="我的书写日历"
      sx={{
        boxSizing: 'border-box',
        alignSelf: 'stretch',
        minWidth: 0,
        width: '100%',
        maxWidth: 400,
        px: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.25,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        gap={1}
      >
        <Stack direction="row" alignItems="center">
          <IconButton
            size="small"
            aria-label="上个月"
            disabled={month === '1900-01'}
            onClick={() => changeMonth(-1)}
            sx={{ p: 0.25, boxShadow: 'none', bgcolor: 'transparent' }}
          >
            <ChevronLeft fontSize="inherit" />
          </IconButton>
          <Typography
            component="label"
            sx={{
              position: 'relative',
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              '&:focus-within': {
                outline: '2px solid',
                outlineColor: 'primary.main',
              },
            }}
          >
            {year}年{monthNumber}月
            <Box
              component="input"
              type="month"
              aria-label="查询书写月份"
              value={month}
              min="1900-01"
              max={currentMonth}
              onChange={(event) => {
                const value = event.target.value;
                if (
                  !/^\d{4}-(0[1-9]|1[0-2])$/.test(value) ||
                  value < '1900-01' ||
                  value > currentMonth
                )
                  return;
                setMonth(value);
                setSelectedDay(undefined);
              }}
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                opacity: 0,
                '&::-webkit-calendar-picker-indicator': {
                  position: 'absolute',
                  inset: 0,
                  width: 'auto',
                  height: 'auto',
                  cursor: 'pointer',
                },
              }}
            />
          </Typography>
          <IconButton
            size="small"
            aria-label="下个月"
            disabled={month >= currentMonth}
            onClick={() => changeMonth(1)}
            sx={{ p: 0.25, boxShadow: 'none', bgcolor: 'transparent' }}
          >
            <ChevronRight fontSize="inherit" />
          </IconButton>
        </Stack>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          flex: 1,
          minWidth: 0,
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gridTemplateRows: '14px repeat(6, minmax(18px, 1fr))',
          columnGap: '4px',
          rowGap: '2px',
        }}
      >
        {Array.from('一二三四五六日', (day) => (
          <Typography
            key={day}
            component="span"
            aria-label={'星期' + day}
            sx={{
              textAlign: 'center',
              fontSize: 10,
              lineHeight: '14px',
              color: 'text.secondary',
            }}
          >
            {day}
          </Typography>
        ))}
        {Array.from({ length: offset }, (_, index) => (
          <Box key={'empty-' + index} aria-hidden="true" />
        ))}
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1;
          const count = counts?.[day] || 0;
          const level = Math.min(count, 4);
          const label =
            month + '-' + String(day).padStart(2, '0') + '，' + count + ' 篇';
          return (
            <Box
              component="button"
              type="button"
              key={String(day)}
              disabled={!counts}
              aria-label={counts ? label : String(day)}
              title={counts ? label : undefined}
              aria-pressed={selectedDay === day}
              onClick={() => setSelectedDay(day)}
              sx={{
                padding: 0,
                fontSize: 10,
                fontWeight: 600,
                lineHeight: 1,
                color: level ? 'text.primary' : 'text.secondary',
                '&:disabled': { opacity: 1 },
                '&:focus-visible': {
                  outline: '2px solid currentColor',
                  outlineOffset: -2,
                },
                boxShadow: 'none',
                minWidth: 0,
                borderRadius: 1,
                border: '1px solid',
                borderColor:
                  selectedDay === day
                    ? 'text.primary'
                    : level
                      ? 'transparent'
                      : 'divider',
                bgcolor: (theme) =>
                  level
                    ? alpha(theme.palette.primary.main, intensities[level])
                    : 'transparent',
                cursor: counts ? 'pointer' : 'default',
              }}
            >
              {day}
            </Box>
          );
        })}
      </Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        gap={0.5}
      >
        <Typography
          variant="caption"
          role="status"
          sx={{
            fontSize: 10,
            color: 'text.secondary',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
          }}
        >
          {counts
            ? selectedDay
              ? monthNumber +
                '月' +
                selectedDay +
                '日' +
                ' · ' +
                (counts[selectedDay] || 0) +
                ' 篇'
              : Object.keys(counts).length + ' 天书写 · ' + total + ' 篇'
            : result?.key === key
              ? '加载书写记录失败'
              : '加载中…'}
        </Typography>
        {counts && (
          <Typography
            variant="caption"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              ml: 0.5,
              fontSize: 10,
              color: 'text.secondary',
            }}
          >
            <Box
              component="span"
              aria-hidden="true"
              sx={{
                width: 9,
                height: 9,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '2px',
              }}
            />
            无书写
          </Typography>
        )}
        {result?.key === key && !counts && (
          <Button
            size="small"
            sx={{ minWidth: 0, p: 0 }}
            onClick={() => setRetry(retry + 1)}
          >
            重试
          </Button>
        )}
      </Stack>
    </Box>
  );
}
