import React, { useEffect, useMemo, useState } from 'react'
import { Box, Container, Typography, TextField, Button, Paper, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Grid, Chip, Tooltip, IconButton, Avatar } from '@mui/material'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import useResponsive from '@/hooks/useResponsive'
import { api } from '@/netlify/configs'
import { useGlobalSnackbar } from '@/context/app'

type Slot = { datetime_iso: string; mode: 'online' | 'offline' }

const InviteDialog: React.FC<{ open: boolean; onClose: () => void; inviteeId: string }> = ({ open, onClose, inviteeId }) => {
  const show = useGlobalSnackbar()
  const [message, setMessage] = useState('')
  const [slots, setSlots] = useState<Slot[]>([{ datetime_iso: '', mode: 'online' }])
  const canSubmit = useMemo(() => slots.filter(s => s.datetime_iso && s.mode).length > 0, [slots])
  const setSlot = (idx: number, next: Partial<Slot>) => {
    setSlots(prev => prev.map((s, i) => (i === idx ? { ...s, ...next } : s)))
  }
  const addSlot = () => {
    if (slots.length < 3) setSlots(prev => [...prev, { datetime_iso: '', mode: 'online' }])
  }
  const removeSlot = (idx: number) => {
    setSlots(prev => prev.filter((_, i) => i !== idx))
  }
  const submit = async () => {
    try {
      const payload = { invitee_id: inviteeId, message, proposed_slots: slots.filter(s => s.datetime_iso) }
      const res = await api.oneonone.invites.create(payload)
      if (!res.success) throw new Error(res.error || '邀请失败')
      show.success('邀请已发送')
      onClose()
    } catch (e: any) {
      show.error(e.message || '网络错误')
    }
  }
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>发起邀请</DialogTitle>
      <DialogContent>
        <TextField fullWidth margin="normal" label="邀请语" value={message} onChange={e => setMessage(e.target.value)} multiline minRows={2} />
        <Box sx={{ mt: 2 }}>
          {slots.map((s, idx) => (
            <Grid container spacing={2} key={idx} alignItems="center">
              <Grid item xs={7}>
                <TextField fullWidth type="datetime-local" value={s.datetime_iso} onChange={e => setSlot(idx, { datetime_iso: e.target.value })} />
              </Grid>
              <Grid item xs={3}>
                <TextField select fullWidth value={s.mode} onChange={e => setSlot(idx, { mode: e.target.value as any })}>
                  <MenuItem value="online">线上</MenuItem>
                  <MenuItem value="offline">线下</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={2}>
                <Button variant="outlined" color="error" onClick={() => removeSlot(idx)}>删除</Button>
              </Grid>
            </Grid>
          ))}
          <Box sx={{ mt: 2 }}>
            <Button onClick={addSlot} disabled={slots.length >= 3}>添加时间</Button>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={submit} disabled={!canSubmit} variant="contained">发送</Button>
      </DialogActions>
    </Dialog>
  )
}

const BioDialog: React.FC<{ open: boolean; onClose: () => void; user: { name: string; username: string; profile?: any } | null }> = ({ open, onClose, user }) => {
  const p = user?.profile || {}
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>个人简介</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle1">{user?.name} @{user?.username}</Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>{p.bio || '暂无简介'}</Typography>
        {!!(p.topics || []).length && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {(p.topics || []).map((t: string) => (<Chip key={t} label={t} />))}
          </Box>
        )}
        {!!(p.offerings || []).length && (
          <Typography variant="body2" sx={{ mt: 2 }}>可提供：{(p.offerings || []).join('、')}</Typography>
        )}
        {!!(p.seeking || []).length && (
          <Typography variant="body2" sx={{ mt: 1 }}>寻找帮助：{(p.seeking || []).join('、')}</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  )
}

const Directory: React.FC = () => {
  const show = useGlobalSnackbar()
  const [users, setUsers] = useState<Array<{ id: string | number; name: string; username: string; profile?: any }>>([])
  const [q, setQ] = useState('')
  const [themeFilter, setThemeFilter] = useState<string>('')
  const [openInvite, setOpenInvite] = useState<{ open: boolean; inviteeId: string | null }>({ open: false, inviteeId: null })
  const { isMobile } = useResponsive()
  const [bioState, setBioState] = useState<{ open: boolean; user: { id: string | number; name: string; username: string; profile?: any } | null }>({ open: false, user: null })
  useEffect(() => {
    const refresh = async () => {
      if (bioState.open && bioState.user) {
        const res = await api.people.getById(bioState.user.id)
        if (res.success) {
          const u = res.data?.users?.[0]
          if (u) setBioState(prev => ({ open: prev.open, user: { id: u.id, name: u.name, username: u.username, profile: u.profile } }))
        }
      }
    }
    refresh()
  }, [bioState.open])
  useEffect(() => {
    const load = async () => {
      const res = await api.people.list({ q: q || undefined, theme: themeFilter || undefined })
      if (res.success) setUsers(res.data?.users || [])
      else show.error(res.error || '加载失败')
    }
    load()
  }, [q, themeFilter])
  useEffect(() => {
    const hydrate = async () => {
      const withoutProfile = users.filter(u => !u.profile)
      if (withoutProfile.length === 0) return
      const updates = await Promise.all(withoutProfile.map(async (u) => {
        const r = await api.people.getById(u.id)
        if (r.success && r.data?.users?.[0]) return r.data.users[0]
        return null
      }))
      const byId: Record<string, any> = {}
      updates.forEach(u => { if (u) byId[String(u.id)] = u })
      setUsers(prev => prev.map(u => byId[String(u.id)] ? byId[String(u.id)] : u))
    }
    hydrate()
  }, [users])
  const toggleTheme = (t: string) => {
    setThemeFilter(prev => (prev === t ? '' : t))
  }
  const getInitials = (name: string) => {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    const a = parts[0] || ''
    const b = parts[1] || ''
    const init = (a[0] || '') + (b[0] || '')
    return init || name[0]
  }
  return (
    <Box sx={{ minHeight: '100vh', py: 6, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 3 }}>
          {/* <Typography variant="h5" sx={{ mb: 2 }}>用户目录</Typography> */}
          <TextField fullWidth placeholder="搜索姓名或用户名" value={q} onChange={e => setQ(e.target.value)} sx={{ mb: 2 }} />
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              在这里你可以找到已注册的伙伴，基于主题进行匹配，发起一对一邀请，确认线上或线下会面。
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              <Chip size="small" label="完善资料" onClick={() => window.location.assign('/profile')} />
              <Chip size="small" label="选择主题筛选" />
              <Chip size="small" label="发起邀请" />
              <Chip size="small" label="在“我的连接”处理" onClick={() => window.location.assign('/connections')} />
              <Chip size="small" label="确认会面" />
            </Box>
          </Box>
          {/* 已移除自定义 topics 筛选（数据库已删除该列） */}
          <Typography variant="subtitle1" sx={{ mb: 1 }}>按主题筛选</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {presetTopics.map(t => (
              <Chip key={t} label={t} clickable color={themeFilter === t ? 'primary' : 'default'} variant={themeFilter === t ? 'filled' : 'outlined'} onClick={() => toggleTheme(t)} />
            ))}
          </Box>
          {users.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">暂时没有匹配的用户，尝试更换筛选或关键词。</Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {users.map(u => (
                <Grid item xs={12} sm={6} md={4} key={u.id}>
                  <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ width: 48, height: 48 }}>{getInitials(String(u.name))}</Avatar>
                      <Box sx={{ flex: 1 }}>
                        {u.profile?.bio ? (
                          <Tooltip title={u.profile.bio} placement="top-start" arrow>
                            <Typography variant="subtitle1" sx={{ cursor: 'help' }}>{u.name}</Typography>
                          </Tooltip>
                        ) : (
                          <Typography variant="subtitle1">{u.name}</Typography>
                        )}
                        <Typography variant="body2" color="text.secondary">@{u.username}</Typography>
                      </Box>
                      <IconButton size="small" onClick={() => setBioState({ open: true, user: { id: u.id, name: u.name, username: u.username, profile: u.profile } })}>
                        <InfoOutlined fontSize="small" />
                      </IconButton>
                    </Box>
                    {u.profile && (
                      <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {(u.profile.interests || []).slice(0, 6).map((t: string) => (
                          <Chip key={t} label={t} size="small" variant="outlined" />
                        ))}
                        {(u.profile.expertise || []).slice(0, 6).map((t: string) => (
                          <Chip key={t} label={t} size="small" color="primary" />
                        ))}
                      </Box>
                    )}
                    {u.profile && (
                      <Box sx={{ mt: 1 }}>
                        {!!(u.profile.offerings || []).length && (
                          <Typography variant="caption" color="text.secondary">可提供：{(u.profile.offerings || []).slice(0,3).join('、')}{(u.profile.offerings || []).length>3?'…':''}</Typography>
                        )}
                        {!!(u.profile.seeking || []).length && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>寻找帮助：{(u.profile.seeking || []).slice(0,3).join('、')}{(u.profile.seeking || []).length>3?'…':''}</Typography>
                        )}
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                      <Button size="small" variant="contained" onClick={() => setOpenInvite({ open: true, inviteeId: String(u.id) })}>邀请</Button>
                      <Button size="small" variant="outlined" onClick={() => setBioState({ open: true, user: { id: u.id, name: u.name, username: u.username, profile: u.profile } })}>简介</Button>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      </Container>
      {openInvite.inviteeId && (
        <InviteDialog open={openInvite.open} onClose={() => setOpenInvite({ open: false, inviteeId: null })} inviteeId={openInvite.inviteeId} />
      )}
      {bioState.open && (
        <BioDialog open={bioState.open} onClose={() => setBioState({ open: false, user: null })} user={bioState.user} />
      )}
    </Box>
  )
}

export default Directory
const presetTopics = [
  'AI Agents',
  'LLM 应用',
  'Prompt 工程',
  '产品增长',
  '出海与本地化',
  '个人品牌',
  '知识管理',
  'Notion/Obsidian',
  '云原生/DevOps',
  '开放源码协作',
  'Web3/区块链',
  '数字游民',
  '远程协作',
  '创业与募资',
  'PMF/产品市场契合',
  '低代码/无代码',
  '移动开发',
  '前端工程化',
  'UI/UX 设计',
  '摄影/短视频',
  '播客制作',
  '内容运营',
  '社区共创',
]