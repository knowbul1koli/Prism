import React, { useState, useRef, useEffect } from 'react'
import { Save, Upload, Lock, User as UserIcon } from 'lucide-react'
import { useAuth } from '../store/auth'
import { useToast } from '../store/toast'
import api, { isAdmin, getConfigs, updateConfigs } from '../api'
import { AVATAR_KEY, NAME_KEY, uKey, applyCustomSettings } from '../utils/theme'
import Users from './Users'

const SectionTitle = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div style={{ display:'flex', alignItems:'center', gap:8, margin:'28px 0 16px', paddingBottom:10, borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
    <span style={{ color:'#818cf8' }}>{icon}</span>
    <span style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.8)', letterSpacing:'0.02em' }}>{title}</span>
  </div>
)

export default function Profile() {
  const { user, setAuth } = useAuth()
  const { toast } = useToast()
  const admin = isAdmin()

  const [configs, setConfigs] = useState<Record<string,string>>({})
  const [original, setOriginal] = useState<Record<string,string>>({})
  const [newUsername, setNewUsername] = useState(user?.username || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const avatarRef = useRef<HTMLInputElement>(null)
  const uk = (k: string) => user?.username ? `${user.username}_${k}` : k

  useEffect(() => { load() }, [user?.username])

  const load = async () => {
    try {
      const r = await getConfigs()
      if (r.data.code === 0) {
        setConfigs(r.data.data || {})
        setOriginal(r.data.data || {})
      }
    } catch {}
  }

  const readFile = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader(); r.onload = e => res(e.target!.result as string); r.onerror = rej; r.readAsDataURL(file)
    })

  const saveProfile = async () => {
    if (!newUsername) { toast('error', '账号不能为空'); return }
    setSaving(true)
    try {
      // 1. 手术式筛选：仅提交当前用户的头像和显示名称，避免全量数据过大导致 413 错误
      const pfx = user?.username ? user.username + '_' : ''
      const filtered: Record<string, string> = {}
      
      const avatarFullKey = pfx + AVATAR_KEY
      const nameFullKey   = pfx + NAME_KEY
      
      if (configs[avatarFullKey] !== undefined) filtered[avatarFullKey] = configs[avatarFullKey]
      if (configs[nameFullKey] !== undefined)   filtered[nameFullKey]   = configs[nameFullKey]

      const rCfg = await updateConfigs(filtered)
      if (rCfg.data.code !== 0) { toast('error', rCfg.data.msg || '资料保存失败'); return }

      // 2. 同步本地存储
      Object.entries(filtered).forEach(([k, v]) => {
         const localKey = `u_${k}`
         if (v && v !== '') localStorage.setItem(localKey, v); 
         else localStorage.removeItem(localKey)
      })

      // 3. 处理账号/密码修改
      if (newUsername !== user?.username || newPassword) {
        if (!currentPassword) { toast('error', '修改账号或密码需要输入当前密码'); setSaving(false); return }
        const r = await api.post('/user/updatePassword', {
          newUsername, currentPassword,
          newPassword: newPassword || currentPassword,
          confirmPassword: confirmPassword || currentPassword
        })
        if (r.data.code !== 0) { toast('error', r.data.msg || '安全信息修改失败'); setSaving(false); return }
        setAuth(localStorage.getItem('token') || '', { username: newUsername, role_id: user?.role_id ?? 1 })
      }

      setOriginal({...configs})
      toast('success', '✅ 个人资料保存成功')
      window.dispatchEvent(new Event('prism-profile-change'))
      applyCustomSettings(user?.username)
      
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (e: any) {
      toast('error', '保存失败：数据过大或服务器拒绝请求')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = JSON.stringify(configs) !== JSON.stringify(original) || newUsername !== user?.username || newPassword !== ''

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: 900, margin: '0 auto', paddingBottom: 40 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e2e4f0', marginBottom: 24 }}>个人中心</h1>

      <div className="glass-card" style={{ borderRadius: 16, padding: '32px' }}>
        <SectionTitle icon={<UserIcon size={18}/>} title="基本资料"/>
        
        <div style={{ display:'flex', alignItems:'center', gap:24, marginBottom:32 }}>
          <div style={{ width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#0ea5e9)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:700, color:'#fff', overflow:'hidden', border:'4px solid rgba(255,255,255,0.05)' }}>
            {configs[uk(AVATAR_KEY)] ? <img src={configs[uk(AVATAR_KEY)]} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : user?.username?.[0].toUpperCase()}
          </div>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:14, color:'#fff', marginBottom:8 }}>账户头像</p>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn-primary btn-sm" onClick={()=>avatarRef.current?.click()}>选择图片</button>
              {configs[uk(AVATAR_KEY)] && <button onClick={()=>setConfigs({...configs, [uk(AVATAR_KEY)]: ''})} className="btn-danger btn-sm">重置</button>}
              <input ref={avatarRef} type="file" hidden onChange={async e => { const f=e.target.files?.[0]; if(f) setConfigs({...configs, [uk(AVATAR_KEY)]: await readFile(f)}) }}/>
            </div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div className="form-row">
            <label className="form-label">显示名称</label>
            <input className="prism-input" value={configs[uk(NAME_KEY)] || user?.username || ''} onChange={e => setConfigs({...configs, [uk(NAME_KEY)]: e.target.value})} />
          </div>
          <div className="form-row">
            <label className="form-label">登录账号</label>
            <input className="prism-input" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
          </div>
        </div>

        <SectionTitle icon={<Lock size={18}/>} title="安全设置"/>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20 }}>
          <div className="form-row"><label className="form-label">当前密码</label><input className="prism-input" type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} placeholder="必填以验证身份" /></div>
          <div className="form-row"><label className="form-label">新密码</label><input className="prism-input" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="不修改请留空" /></div>
          <div className="form-row"><label className="form-label">确认新密码</label><input className="prism-input" type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} /></div>
        </div>

        <div style={{ marginTop:32, display:'flex', justifyContent:'flex-end' }}>
          <button className="btn-primary" onClick={saveProfile} disabled={saving || !hasChanges} style={{ padding:'10px 32px' }}>
            <Save size={16}/> {saving ? '保存中...' : '保存所有修改'}
          </button>
        </div>
      </div>

      {admin && (
        <div style={{ marginTop: 40, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
          <Users />
        </div>
      )}
    </div>
  )
}
