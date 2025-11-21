import React, { useEffect, useMemo, useState } from 'react'
import { Box, Container, Typography, Paper, Tabs, Tab, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Grid, Chip } from '@mui/material'
import { api } from '@/netlify/configs'
import { useGlobalSnackbar } from '@/context/app'

type SelectSlot = { datetime_iso: string; mode: 'online' | 'offline'; meeting_url?: string; location_text?: string }

  const AcceptDialog: React.FC<{ open: boolean; onClose: () => void; inviteId: string }> = ({ open, onClose, inviteId }) => {
  const show = useGlobalSnackbar()
  const [slot, setSlot] = useState<SelectSlot>({ datetime_iso: '', mode: 'online' })
  const canSubmit = useMemo(() => !!slot.datetime_iso && !!slot.mode, [slot])
    const submit = async () => {
      try {
      const iso = new Date(slot.datetime_iso).toISOString()
      const createRes = await api.oneonone.meetings.create({ invite_id: inviteId, final_datetime_iso: iso, mode: slot.mode, meeting_url: slot.meeting_url || null, location_text: slot.location_text || null })
      if (!createRes.success) throw new Error(createRes.error || '确认失败')
      show.success('已确认日程')
      onClose()
      } catch (e: any) {
      show.error(e.message || '网络错误')
      }
    }
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>选择时间并确认</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={8}>
            <TextField fullWidth type="datetime-local" value={slot.datetime_iso} onChange={e => setSlot(prev => ({ ...prev, datetime_iso: e.target.value }))} />
          </Grid>
          <Grid item xs={4}>
            <TextField select fullWidth value={slot.mode} onChange={e => setSlot(prev => ({ ...prev, mode: e.target.value as any }))}>
              <MenuItem value="online">线上</MenuItem>
              <MenuItem value="offline">线下</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="会议链接（线上）" value={slot.meeting_url || ''} onChange={e => setSlot(prev => ({ ...prev, meeting_url: e.target.value }))} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="地点（线下）" value={slot.location_text || ''} onChange={e => setSlot(prev => ({ ...prev, location_text: e.target.value }))} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={submit} disabled={!canSubmit} variant="contained">确认</Button>
      </DialogActions>
    </Dialog>
  )
}

const MyConnections: React.FC = () => {
  const show = useGlobalSnackbar()
  const [tab, setTab] = useState<'received' | 'sent' | 'meetings'>('received')
  const [invitesReceived, setInvitesReceived] = useState<any[]>([])
  const [invitesSent, setInvitesSent] = useState<any[]>([])
  const [meetings, setMeetings] = useState<any[]>([])
  const [acceptState, setAcceptState] = useState<{ open: boolean; inviteId: string | null }>({ open: false, inviteId: null })
  const [peopleMap, setPeopleMap] = useState<Record<string, { name: string; username: string }>>({})
  const loadInvites = async () => {
    const [recv, sent] = await Promise.all([
      api.oneonone.invites.list('invitee'),
      api.oneonone.invites.list('inviter'),
    ])
    if (recv.success) setInvitesReceived(recv.data?.invites || [])
    else show.error(recv.error || '加载收到的邀请失败')
    if (sent.success) setInvitesSent(sent.data?.invites || [])
    else show.error(sent.error || '加载发出的邀请失败')
  }
  const loadMeetings = async () => {
    const res = await api.oneonone.meetings.list()
    if (res.success) {
      const all = res.data?.meetings || []
      const visible = all.filter((m: any) => m.status !== 'cancelled')
      setMeetings(visible)
    }
    else show.error(res.error || '加载会面失败')
  }
  useEffect(() => {
    loadInvites()
    loadMeetings()
  }, [])
  useEffect(() => {
    const hydrate = async () => {
      const ids = new Set<string>([] as any)
      invitesReceived.forEach(i => ids.add(String(i.inviter_id)))
      invitesSent.forEach(i => ids.add(String(i.invitee_id)))
      const missing = Array.from(ids).filter(id => !peopleMap[id])
      if (missing.length === 0) return
      const results = await Promise.all(missing.map(async (id) => {
        const r = await api.people.getById(id)
        if (r.success && r.data?.users?.[0]) {
          const u = r.data.users[0]
          return { id: String(u.id), name: u.name, username: u.username }
        }
        return null
      }))
      const next = { ...peopleMap }
      results.forEach(r => { if (r) next[r.id] = { name: r.name, username: r.username } })
      setPeopleMap(next)
    }
    hydrate()
  }, [invitesReceived, invitesSent])
  const displayName = (id: string | number) => {
    const u = peopleMap[String(id)]
    if (!u) return String(id)
    return u.name || `@${u.username}`
  }
  const decline = async (id: string) => {
    const res = await api.oneonone.invites.update(id, { status: 'declined' })
    if (res.success) {
      show.success('已拒绝')
      loadInvites()
    } else show.error(res.error || '操作失败')
  }
  const [updateState, setUpdateState] = useState<{ open: boolean; meeting: any | null }>({ open: false, meeting: null })
  const UpdateDialog: React.FC<{ open: boolean; onClose: () => void; meeting: any }> = ({ open, onClose, meeting }) => {
    const [time, setTime] = useState<string>(meeting?.final_datetime_iso || '')
    const [mode, setMode] = useState<'online' | 'offline'>(meeting?.mode || 'online')
    const [url, setUrl] = useState<string>(meeting?.meeting_url || '')
    const [loc, setLoc] = useState<string>(meeting?.location_text || '')
    const save = async () => {
      const iso = time ? new Date(time).toISOString() : undefined
      const res = await api.oneonone.meetings.update(meeting.id, { final_datetime_iso: iso, mode, meeting_url: url || null, location_text: loc || null })
      if (res.success) {
        show.success('会面信息已更新')
        onClose()
        loadMeetings()
      } else show.error(res.error || '更新失败')
    }
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>修改会面信息</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={8}>
              <TextField fullWidth type="datetime-local" value={time} onChange={e => setTime(e.target.value)} />
            </Grid>
            <Grid item xs={4}>
              <TextField select fullWidth value={mode} onChange={e => setMode(e.target.value as any)}>
                <MenuItem value="online">线上</MenuItem>
                <MenuItem value="offline">线下</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="会议链接（线上）" value={url} onChange={e => setUrl(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="地点（线下）" value={loc} onChange={e => setLoc(e.target.value)} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>取消</Button>
          <Button onClick={save} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>
    )
  }
  const cancelSent = async (id: string) => {
    const res = await api.oneonone.invites.update(id, { status: 'cancelled' })
    if (res.success) {
      show.success('已取消邀请')
      loadInvites()
    } else show.error(res.error || '操作失败')
  }
  return (
    <Box sx={{ minHeight: '100vh', py: 6, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>我的连接</Typography>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab value="received" label="收到的邀请" />
            <Tab value="sent" label="我发出的邀请" />
            <Tab value="meetings" label="会面" />
          </Tabs>
          {tab === 'received' && (
            <Box>
              {invitesReceived.map((i) => (
                <Box key={i.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid #eee', opacity: (i.status === 'cancelled' || i.status === 'declined') ? 0.6 : 1 }}>
                  <Box>
                    <Typography variant="subtitle1">邀请来自 {displayName(i.inviter_id)}</Typography>
                    <Typography variant="body2" color="text.secondary">状态：{i.status}</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {i.status === 'accepted' ? (
                        <Chip size="small" color="success" label="已接受" />
                      ) : i.status === 'declined' ? (
                        <Chip size="small" variant="outlined" label="已拒绝" />
                      ) : i.status === 'cancelled' ? (
                        <Chip size="small" variant="outlined" label="已取消" />
                      ) : (
                        <Chip size="small" variant="outlined" label="待处理" />
                      )}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {i.status === 'pending' ? (
                      <>
                        <Button variant="contained" onClick={() => setAcceptState({ open: true, inviteId: i.id })}>接受</Button>
                        <Button variant="outlined" color="error" onClick={() => decline(i.id)}>拒绝</Button>
                      </>
                    ) : i.status === 'accepted' ? (
                      <Button variant="outlined" onClick={() => setTab('meetings')}>查看会面</Button>
                    ) : null}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
          {tab === 'sent' && (
            <Box>
              {invitesSent.map((i) => (
                <Box key={i.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid #eee', opacity: (i.status === 'cancelled' || i.status === 'declined') ? 0.6 : 1 }}>
                  <Box>
                    <Typography variant="subtitle1">邀请给 {displayName(i.invitee_id)}</Typography>
                    <Typography variant="body2" color="text.secondary">状态：{i.status}</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {i.status === 'accepted' ? (
                        <Chip size="small" color="success" label="已接受" />
                      ) : i.status === 'declined' ? (
                        <Chip size="small" variant="outlined" label="已拒绝" />
                      ) : i.status === 'cancelled' ? (
                        <Chip size="small" variant="outlined" label="已取消" />
                      ) : (
                        <Chip size="small" variant="outlined" label="待处理" />
                      )}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {i.status === 'pending' ? (
                      <Button variant="outlined" color="error" onClick={() => cancelSent(i.id)}>取消邀请</Button>
                    ) : i.status === 'accepted' ? (
                      <Button variant="outlined" onClick={() => setTab('meetings')}>查看会面</Button>
                    ) : null}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
          {tab === 'meetings' && (
            <Box>
              {meetings.map((m) => (
                <Box key={m.id} sx={{ py: 1.5, borderBottom: '1px solid #eee' }}>
                  <Typography variant="subtitle1">时间 {m.final_datetime_iso}</Typography>
                  <Typography variant="body2" color="text.secondary">形式 {m.mode}</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {m.status === 'completed' ? (
                      <Chip size="small" color="success" label="已完成" />
                    ) : (
                      <Chip size="small" variant="outlined" label="已安排" />
                    )}
                  </Box>
                  {m.one_on_one_invites && (
                    <Typography variant="body2" color="text.secondary">对方：{displayName(m.one_on_one_invites.inviter_id === peopleMap[String(m.one_on_one_invites.inviter_id)] ? m.one_on_one_invites.invitee_id : m.one_on_one_invites.inviter_id)}</Typography>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Button size="small" variant="outlined" onClick={() => setUpdateState({ open: true, meeting: m })}>修改会面信息</Button>
                    <Button size="small" variant="outlined" onClick={async () => { const res = await api.oneonone.meetings.update(m.id, { status: 'completed' }); if (res.success) { show.success('已标记完成'); loadMeetings() } else show.error(res.error || '操作失败') }}>标记完成</Button>
                    <Button size="small" color="error" variant="outlined" onClick={async () => {
                      const res = await api.oneonone.meetings.update(m.id, { status: 'cancelled' })
                      if (res.success) { show.success('会面已取消'); loadMeetings() } else show.error(res.error || '取消失败')
                    }}>取消会面</Button>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
          {updateState.open && updateState.meeting && (
            <UpdateDialog open={updateState.open} onClose={() => setUpdateState({ open: false, meeting: null })} meeting={updateState.meeting} />
          )}
        </Paper>
      </Container>
      {acceptState.inviteId && (
        <AcceptDialog open={acceptState.open} onClose={() => { setAcceptState({ open: false, inviteId: null }); loadInvites(); loadMeetings(); }} inviteId={acceptState.inviteId} />
      )}
    </Box>
  )
}

export default MyConnections