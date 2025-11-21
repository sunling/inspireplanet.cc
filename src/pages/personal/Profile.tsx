import React, { useEffect, useState } from 'react'
import { Box, Container, Paper, Typography, TextField, Button, Chip } from '@mui/material'
import { api } from '@/netlify/configs'
import { useGlobalSnackbar } from '@/context/app'

const Profile: React.FC = () => {
  const show = useGlobalSnackbar()
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [expertise, setExpertise] = useState<string[]>([])
  const [customInput, setCustomInput] = useState('')
  const [availability, setAvailability] = useState('')
  const [timezone, setTimezone] = useState('')
  const [wechatId, setWechatId] = useState('')
  const [offeringsInput, setOfferingsInput] = useState('')
  const [offerings, setOfferings] = useState<string[]>([])
  const [seekingInput, setSeekingInput] = useState('')
  const [seeking, setSeeking] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      const res = await api.profile.getMy()
      if (res.success && res.data?.profile) {
        const p = res.data.profile
        setBio(p.bio || '')
        setInterests(Array.isArray(p.interests) ? p.interests : [])
        setExpertise(Array.isArray(p.expertise) ? p.expertise : [])
        setAvailability(p.availability_text || '')
        setTimezone(p.timezone || '')
        setWechatId(p.wechat_id || '')
        setOfferings(Array.isArray(p.offerings) ? p.offerings : [])
        setSeeking(Array.isArray(p.seeking) ? p.seeking : [])
      }
    }
    load()
  }, [])

  const addCustomInterest = () => {
    const t = customInput.trim()
    if (t && !interests.includes(t)) setInterests(prev => [...prev, t])
    setCustomInput('')
  }
  const addCustomExpertise = () => {
    const t = customInput.trim()
    if (t && !expertise.includes(t)) setExpertise(prev => [...prev, t])
    setCustomInput('')
  }
  const toggleInterest = (t: string) => {
    setInterests(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }
  const toggleExpertise = (t: string) => {
    setExpertise(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  const addOffering = () => {
    const t = offeringsInput.trim()
    if (t && !offerings.includes(t)) setOfferings(prev => [...prev, t])
    setOfferingsInput('')
  }
  const removeOffering = (t: string) => setOfferings(prev => prev.filter(x => x !== t))

  const addSeeking = () => {
    const t = seekingInput.trim()
    if (t && !seeking.includes(t)) setSeeking(prev => [...prev, t])
    setSeekingInput('')
  }
  const removeSeeking = (t: string) => setSeeking(prev => prev.filter(x => x !== t))

  const save = async () => {
    setLoading(true)
    try {
      const res = await api.profile.upsert({ bio, interests, expertise, availability_text: availability, timezone, wechat_id: wechatId, offerings, seeking })
      if (!res.success) throw new Error(res.error || '保存失败')
      show.success('已保存')
    } catch (e: any) {
      show.error(e.message || '网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', py: 6, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center' }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>完善资料</Typography>
          <TextField fullWidth label="个人简介" value={bio} onChange={e => setBio(e.target.value)} multiline minRows={3} sx={{ mb: 2 }} />
          <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ mt: 1, mb: 1 }}>感兴趣的主题</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {presetTopics.map((t) => (
              <Chip key={t} label={t} clickable color={interests.includes(t) ? 'primary' : 'default'} variant={interests.includes(t) ? 'filled' : 'outlined'} onClick={() => toggleInterest(t)} />
            ))}
          </Box>
          <Typography variant="h6" sx={{ mt: 1, mb: 1 }}>擅长的主题</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {presetTopics.map((t) => (
              <Chip key={t} label={t} clickable color={expertise.includes(t) ? 'primary' : 'default'} variant={expertise.includes(t) ? 'filled' : 'outlined'} onClick={() => toggleExpertise(t)} />
            ))}
          </Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>自定义主题</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField fullWidth label="输入主题" value={customInput} onChange={e => setCustomInput(e.target.value)} />
            <Button variant="outlined" onClick={addCustomInterest}>添加到感兴趣</Button>
            <Button variant="outlined" onClick={addCustomExpertise}>添加到擅长</Button>
          </Box>
          <Typography variant="subtitle2">已选（感兴趣）</Typography>
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {interests.map(t => (
              <Chip key={t} label={t} onDelete={() => toggleInterest(t)} />
            ))}
          </Box>
          <Typography variant="subtitle2" sx={{ mt: 2 }}>已选（擅长）</Typography>
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {expertise.map(t => (
              <Chip key={t} label={t} onDelete={() => toggleExpertise(t)} />
            ))}
          </Box>
          </Box>
          <TextField fullWidth label="可约时间描述" value={availability} onChange={e => setAvailability(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="时区" value={timezone} onChange={e => setTimezone(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="微信号（可选）" value={wechatId} onChange={e => setWechatId(e.target.value)} sx={{ mb: 2 }} />

          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>我可以提供</Typography>
          <TextField fullWidth label="添加条目" value={offeringsInput} onChange={e => setOfferingsInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOffering() } }} />
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {offerings.map(t => (
              <Chip key={t} label={t} onDelete={() => removeOffering(t)} />
            ))}
          </Box>

          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>我正在寻找帮助</Typography>
          <TextField fullWidth label="添加条目" value={seekingInput} onChange={e => setSeekingInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSeeking() } }} />
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {seeking.map(t => (
              <Chip key={t} label={t} onDelete={() => removeSeeking(t)} />
            ))}
          </Box>
          <Button variant="contained" onClick={save} disabled={loading}>保存</Button>
        </Paper>
      </Container>
    </Box>
  )
}

export default Profile

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