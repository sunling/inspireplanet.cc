import React, { useEffect, useState } from 'react'
import { Box, Container, Paper, Typography, TextField, Button, Chip, Stepper, Step, StepLabel, Grid } from '@mui/material'
import { api } from '@/netlify/configs'
import { useGlobalSnackbar } from '@/context/app'

const Profile: React.FC = () => {
  const show = useGlobalSnackbar()
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [expertise, setExpertise] = useState<string[]>([])
  const [customInput, setCustomInput] = useState('')
  const [availability, setAvailability] = useState('')
  
  const [wechatId, setWechatId] = useState('')
  const [city, setCity] = useState('')
  const [offeringsInput, setOfferingsInput] = useState('')
  const [offerings, setOfferings] = useState<string[]>([])
  const [seekingInput, setSeekingInput] = useState('')
  const [seeking, setSeeking] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const steps = ['个人简介', '感兴趣的主题', '擅长的主题', '时间与联系方式', '提供与寻求', '确认与保存']

  useEffect(() => {
    const load = async () => {
      const res = await api.profile.getMy()
      if (res.success && res.data?.profile) {
        const p = res.data.profile
        setBio(p.bio || '')
        setInterests(Array.isArray(p.interests) ? p.interests : [])
        setExpertise(Array.isArray(p.expertise) ? p.expertise : [])
        setAvailability(p.availability_text || '')
        setWechatId(p.wechat_id || '')
        setCity(p.city || '')
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
      const res = await api.profile.upsert({ bio, interests, expertise, availability_text: availability, wechat_id: wechatId, city, offerings, seeking })
      if (!res.success) throw new Error(res.error || '保存失败')
      show.success('已保存')
    } catch (e: any) {
      show.error(e.message || '网络错误')
    } finally {
      setLoading(false)
    }
  }
  const next = () => { setStep(prev => Math.min(prev + 1, steps.length - 1)) }
  const back = () => { setStep(prev => Math.max(prev - 1, 0)) }
  const proceedNext = () => {
    if (step === 4) {
      const o = offeringsInput.trim()
      if (o && !offerings.includes(o)) setOfferings(prev => [...prev, o])
      setOfferingsInput('')
      const s = seekingInput.trim()
      if (s && !seeking.includes(s)) setSeeking(prev => [...prev, s])
      setSeekingInput('')
    }
    next()
  }

  return (
    <Box sx={{ minHeight: '100vh', py: 6, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', display: 'flex', alignItems: 'center' }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>让更多人看见你</Typography>
          <Stepper activeStep={step} alternativeLabel sx={{ mb: 2 }}>
            {steps.map((label) => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>
          {step === 0 && (
            <Box>
              <TextField fullWidth label="个人简介" value={bio} onChange={e => setBio(e.target.value)} multiline minRows={3} sx={{ mb: 2 }} />
            </Box>
          )}
          {step === 1 && (
            <Box>
              <Typography variant="h6" sx={{ mt: 1, mb: 1 }}>感兴趣的主题</Typography>
              <Box sx={{ display: '柔性', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {presetTopics.map((t) => (
                  <Chip key={t} label={t} clickable color={interests.includes(t) ? 'primary' : 'default'} variant={interests.includes(t) ? 'filled' : 'outlined'} onClick={() => toggleInterest(t)} />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {interests.map(t => (<Chip key={t} label={t} onDelete={() => toggleInterest(t)} />))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <TextField fullWidth label="输入主题" value={customInput} onChange={e => setCustomInput(e.target.value)} />
                <Button variant="outlined" onClick={addCustomInterest}>添加到感兴趣</Button>
              </Box>
            </Box>
          )}
          {step === 2 && (
            <Box>
              <Typography variant="h6" sx={{ mt: 1, mb: 1 }}>擅长的主题</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {presetTopics.map((t) => (
                  <Chip key={t} label={t} clickable color={expertise.includes(t) ? 'primary' : 'default'} variant={expertise.includes(t) ? 'filled' : 'outlined'} onClick={() => toggleExpertise(t)} />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {expertise.map(t => (<Chip key={t} label={t} onDelete={() => toggleExpertise(t)} />))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <TextField fullWidth label="输入主题" value={customInput} onChange={e => setCustomInput(e.target.value)} />
                <Button variant="outlined" onClick={addCustomExpertise}>添加到擅长</Button>
              </Box>
            </Box>
          )}
          {step === 3 && (
            <Box>
              <TextField fullWidth label="可约时间描述" value={availability} onChange={e => setAvailability(e.target.value)} sx={{ mb: 2 }} />
              <TextField fullWidth label="所在城市" value={city} onChange={e => setCity(e.target.value)} sx={{ mb: 2 }} />
              <TextField fullWidth label="微信号（可选）" value={wechatId} onChange={e => setWechatId(e.target.value)} sx={{ mb: 2 }} />
            </Box>
          )}
          {step === 4 && (
            <Box>
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>我可以提供</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField fullWidth label="添加条目" value={offeringsInput} onChange={e => setOfferingsInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOffering() } }} />
                <Button variant="outlined" onClick={addOffering}>添加</Button>
              </Box>
              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {offerings.map(t => (<Chip key={t} label={t} onDelete={() => removeOffering(t)} />))}
              </Box>
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>我正在寻找帮助</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField fullWidth label="添加条目" value={seekingInput} onChange={e => setSeekingInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSeeking() } }} />
                <Button variant="outlined" onClick={addSeeking}>添加</Button>
              </Box>
              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {seeking.map(t => (<Chip key={t} label={t} onDelete={() => removeSeeking(t)} />))}
              </Box>
            </Box>
          )}
          {step === 5 && (
            <Box>
              <Typography variant="subtitle1">请确认信息后保存</Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">个人简介</Typography>
                <Typography variant="body2" color="text.secondary">{bio || '未填写'}</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>感兴趣</Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>{interests.map(t => (<Chip key={t} label={t} />))}</Box>
                <Typography variant="body2" sx={{ mt: 1 }}>擅长</Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>{expertise.map(t => (<Chip key={t} label={t} />))}</Box>
                <Typography variant="body2" sx={{ mt: 1 }}>可约时间</Typography>
                <Typography variant="body2" color="text.secondary">{availability || '未填写'}</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>所在城市</Typography>
                <Typography variant="body2" color="text.secondary">{city || '未填写'}</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>微信号</Typography>
                <Typography variant="body2" color="text.secondary">{wechatId || '未填写'}</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>可提供</Typography>
                <Typography variant="body2" color="text.secondary">{offerings.length ? offerings.join('、') : '未填写'}</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>寻找帮助</Typography>
                <Typography variant="body2" color="text.secondary">{seeking.length ? seeking.join('、') : '未填写'}</Typography>
              </Box>
            </Box>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button onClick={back} disabled={step === 0}>上一步</Button>
            {step < steps.length - 1 ? (
              <Button variant="contained" onClick={proceedNext}>下一步</Button>
            ) : (
              <Button variant="contained" onClick={save} disabled={loading}>保存</Button>
            )}
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}

export default Profile

const presetTopics = [
  '职业发展与求职',
  '个人品牌与表达',
  '内容运营与增长',
  '学习与知识管理',
  '高效协作与远程',
  '产品与创新创业',
  '工具与低代码',
  '心理健康与自我',
  '财商与生活规划',
  '社区与人脉连接',
]
