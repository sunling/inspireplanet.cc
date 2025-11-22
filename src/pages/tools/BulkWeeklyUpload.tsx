import React, { useMemo, useState } from 'react'
import { Box, Container, Paper, Typography, TextField, Button, List, ListItem, ListItemText, Chip } from '@mui/material'
import { useGlobalSnackbar } from '@/context/app'

type InputItem = {
  name: string
  title: string
  quote: string
  detail: string
  episode: string
}

const BulkWeeklyUpload: React.FC = () => {
  const show = useGlobalSnackbar()
  const [raw, setRaw] = useState('')
  const [items, setItems] = useState<InputItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<Array<{ index: number; success: boolean; message: string; id?: any }>>([])
  const validCount = useMemo(() => items.length, [items])
  const parse = () => {
    try {
      const arr = JSON.parse(raw)
      if (!Array.isArray(arr)) throw new Error('JSON需为数组')
      const mapped: InputItem[] = arr.map((x: any) => ({
        name: String(x.name || ''),
        title: String(x.title || ''),
        quote: String(x.quote || ''),
        detail: String(x.detail || ''),
        episode: String(x.episode || ''),
      }))
      const filtered = mapped.filter(
        (r) => r.name && r.title && r.quote && r.detail && r.episode
      )
      setItems(filtered)
      setResults([])
      show.success(`解析成功：${filtered.length} 条`)
    } catch (e: any) {
      show.error(e.message || '解析失败')
    }
  }
  const upload = async () => {
    if (!items.length) return
    setSubmitting(true)
    const next: Array<{ index: number; success: boolean; message: string; id?: any }> = []
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      try {
        const res = await fetch('/.netlify/functions/uploadCard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ record: it }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          next.push({ index: i, success: false, message: data.error || '失败' })
        } else {
          next.push({ index: i, success: true, message: data.message || '成功', id: data.id })
        }
        setResults([...next])
      } catch (e: any) {
        next.push({ index: i, success: false, message: e.message || '网络错误' })
        setResults([...next])
      }
    }
    setSubmitting(false)
    const ok = next.filter((r) => r.success).length
    show.success(`完成：成功 ${ok} / 共 ${items.length}`)
  }
  return (
    <Box sx={{ minHeight: '100vh', py: 6, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>批量上传周刊卡片</Typography>
          <Typography variant="body2" color="text.secondary">粘贴 JSON 数组，包含 name、title、quote、detail、episode 字段</Typography>
          <TextField
            fullWidth
            multiline
            minRows={8}
            sx={{ mt: 2 }}
            placeholder={`[ { "name": "...", "title": "...", "quote": "...", "detail": "...", "episode": "EPxx" } ]`}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button variant="outlined" onClick={parse}>解析</Button>
            <Button variant="contained" onClick={upload} disabled={!validCount || submitting}>上传</Button>
            {!!validCount && <Chip size="small" label={`待上传：${validCount}`} />}
          </Box>
          <List sx={{ mt: 2 }}>
            {items.map((it, idx) => {
              const r = results.find((x) => x.index === idx)
              return (
                <ListItem key={idx} sx={{ borderBottom: '1px solid #eee' }}>
                  <ListItemText
                    primary={<Typography variant="subtitle2">{it.episode} · {it.name} · {it.title}</Typography>}
                    secondary={<Typography variant="caption" color="text.secondary">{it.quote.slice(0, 60)}{it.quote.length > 60 ? '…' : ''}</Typography>}
                  />
                  {r ? (
                    r.success ? <Chip size="small" color="success" label="成功" /> : <Chip size="small" color="error" label={r.message} />
                  ) : (
                    <Chip size="small" variant="outlined" label="待上传" />
                  )}
                </ListItem>
              )
            })}
          </List>
        </Paper>
      </Container>
    </Box>
  )
}

export default BulkWeeklyUpload