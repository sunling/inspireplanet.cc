import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
} from '@mui/material';
import {
  ParticipationPeriod,
  validateParticipationPeriods,
} from '../../utils/participationPeriods';

interface Props {
  periods: ParticipationPeriod[];
  bulkCount?: number;
  bulkParticipants?: Array<{ name: string; periods: ParticipationPeriod[] }>;
  onSave: (periods: ParticipationPeriod[]) => Promise<void>;
}

export default function ParticipationPeriodsEditor({
  periods,
  onSave,
  bulkCount,
  bulkParticipants,
}: Props) {
  const [draft, setDraft] = useState<ParticipationPeriod[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sourceIndex, setSourceIndex] = useState(0);
  const hasDifferentPeriods = bulkParticipants?.some(
    (participant) =>
      JSON.stringify(participant.periods) !== JSON.stringify(periods)
  );
  const save = async () => {
    if (!draft) return;
    const validation = validateParticipationPeriods(draft);
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(draft);
      setDraft(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Box sx={{ width: bulkCount ? 'auto' : '100%', minWidth: 0 }}>
      {!bulkCount &&
        periods.map((period, index) => (
          <Typography
            key={index}
            variant="body2"
            sx={{ overflowWrap: 'anywhere', my: 0.5 }}
          >
            第 {index + 1} 次：{period.start_date} ～ {period.end_date}
          </Typography>
        ))}
      {!bulkCount && periods.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          未设置参与周期
        </Typography>
      )}
      <Button
        size="small"
        onClick={() => {
          setError('');
          setSourceIndex(0);
          setDraft(
            periods.length
              ? periods.map((period) => ({ ...period }))
              : [{ start_date: '', end_date: '' }]
          );
        }}
      >
        {bulkCount ? `批量编辑周期 (${bulkCount})` : '编辑参与周期'}
      </Button>
      <Dialog
        open={draft !== null}
        onClose={() => {
          if (!saving) {
            setDraft(null);
            setError('');
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {bulkCount ? `批量编辑 ${bulkCount} 位参与者的周期` : '编辑参与周期'}
        </DialogTitle>
        <DialogContent>
          {bulkCount && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              保存后将用以下周期替换所选 {bulkCount}{' '}
              人的全部已有周期；删除全部周期并保存将清空。仅影响勾选的参与者。
            </Alert>
          )}
          {hasDifferentPeriods && (
            <Box sx={{ mb: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                所选人员已有周期不同，当前带入第一位参与者的周期。可选择其他人员的周期作为编辑基础；保存后将统一应用到全部所选人员。
              </Alert>
              <TextField
                select
                fullWidth
                size="small"
                label="带入已有周期"
                value={sourceIndex}
                disabled={saving}
                onChange={(event) => {
                  const index = Number(event.target.value);
                  setSourceIndex(index);
                  setDraft(
                    bulkParticipants![index].periods.map((period) => ({
                      ...period,
                    }))
                  );
                  setError('');
                }}
              >
                {bulkParticipants?.map((participant, index) => (
                  <MenuItem key={index} value={index}>
                    {participant.name}（{participant.periods.length} 个周期）
                  </MenuItem>
                ))}
              </TextField>
              {bulkParticipants?.map((participant, index) => (
                <Typography
                  key={index}
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1, overflowWrap: 'anywhere' }}
                >
                  {participant.name}：
                  {participant.periods.length
                    ? participant.periods
                        .map(
                          (period) =>
                            `${period.start_date} ～ ${period.end_date}`
                        )
                        .join('；')
                    : '未设置参与周期'}
                </Typography>
              ))}
            </Box>
          )}
          {(draft || []).map((period, index) => (
            <Box
              key={index}
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  sm: 'repeat(2, minmax(0, 1fr))',
                },
                gap: 1.5,
                my: 1.5,
              }}
            >
              {draft ? (
                <>
                  {(['start_date', 'end_date'] as const).map((key) => (
                    <TextField
                      key={key}
                      type="date"
                      size="small"
                      label={`第 ${index + 1} 次${key === 'start_date' ? '开始' : '结束'}`}
                      value={period[key]}
                      disabled={saving}
                      InputLabelProps={{ shrink: true }}
                      onChange={(event) => {
                        setDraft(
                          draft.map((item, i) =>
                            i === index
                              ? { ...item, [key]: event.target.value }
                              : item
                          )
                        );
                        setError('');
                      }}
                      fullWidth
                      sx={{ minWidth: 0, '& input': { minWidth: 0 } }}
                    />
                  ))}
                  <Button
                    size="small"
                    color="error"
                    sx={{ justifySelf: 'start' }}
                    disabled={saving}
                    onClick={() =>
                      setDraft(draft.filter((_, i) => i !== index))
                    }
                  >
                    删除
                  </Button>
                </>
              ) : (
                <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                  第 {index + 1} 次：{period.start_date} ～ {period.end_date}
                </Typography>
              )}
            </Box>
          ))}

          {error && (
            <Alert severity="error" sx={{ my: 1 }}>
              {error}
            </Alert>
          )}
          <Button
            size="small"
            disabled={saving || (draft?.length || 0) >= 100}
            onClick={() =>
              setDraft([...(draft || []), { start_date: '', end_date: '' }])
            }
          >
            新增周期
          </Button>
        </DialogContent>
        <DialogActions>
          <Button
            disabled={saving}
            onClick={() => {
              setDraft(null);
              setError('');
            }}
          >
            取消
          </Button>
          <Button variant="contained" disabled={saving} onClick={save}>
            {saving ? '保存中…' : bulkCount ? '应用到所选参与者' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
