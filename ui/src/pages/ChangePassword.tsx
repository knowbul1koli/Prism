import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { updatePassword } from '../api'
import { useAuth } from '../store/auth'
import { useToast } from '../store/toast'

export default function ChangePassword() {
  const nav = useNavigate()
  const { clearAuth } = useAuth()
  const { toast } = useToast()
  const [newUsername,      setNewUsername]      = useState('')
  const [currentPassword,  setCurrentPassword]  = useState('')
  const [newPassword,      setNewPassword]      = useState('')
  const [confirmPassword,  setConfirmPassword]  = useState('')
  const [errors, setErrors] = useState<Record<string,string>>({})
  const [show,    setShow]    = useState(false)
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e: Record<string,string> = {}
    if (!newUsername.trim())         e.newUsername = '请输入新用户名'
    else if (newUsername.length < 3) e.newUsername = '用户名至少3位'
    else if (newUsername.length > 20)e.newUsername = '用户名不能超过20位'
    if (!currentPassword.trim())     e.currentPassword = '请输入当前密码'
    if (!newPassword.trim())         e.newPassword = '请输入新密码'
    else if (newPassword.length < 6) e.newPassword = '新密码至少6位'
    if (!confirmPassword.trim())     e.confirmPassword = '请再次输入新密码'
    else if (confirmPassword !== newPassword) e.confirmPassword = '两次密码不一致'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const r = await updatePassword({ newUsername, currentPassword, newPassword, confirmPassword })
      if (r.data.code !== 0) { toast('error', r.data.msg || '修改失败'); return }
      toast('success', '修改成功，请重新登录')
      setTimeout(() => { clearAuth(); nav('/login', { replace: true }) }, 1200)
    } catch (err: any) {
      toast('error', err.response?.data?.msg ?? '修改失败，请重试')
    } finally { setLoading(false) }
  }

  const inputType = show ? 'text' : 'password'

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'transparent', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%',
        background:'radial-gradient(circle,rgba(245,158,11,0.1) 0%,transparent 70%)',
        top:-80, left:-80, pointerEvents:'none' }}/>
      <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%',
        background:'radial-gradient(circle,rgba(244,63,94,0.08) 0%,transparent 70%)',
        bottom:-60, right:-60, pointerEvents:'none' }}/>

      <form onSubmit={submit} style={{ width:'100%', maxWidth:440, padding:'0 20px', zIndex:1 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
            width:56, height:56, borderRadius:14,
            background:'linear-gradient(135deg,rgba(245,158,11,0.2),rgba(244,63,94,0.15))',
            border:'1px solid rgba(245,158,11,0.3)', marginBottom:14 }}>
            <KeyRound size={24} color="#fbbf24"/>
          </div>
          <h1 style={{ fontFamily:"'Sora',sans-serif", fontSize:22, fontWeight:700,
            color:'#e2e4f0', margin:0 }}>安全提醒</h1>
          <p style={{ color:'#6b7099', fontSize:13, marginTop:6 }}>
            检测到默认账号密码，请立即修改
          </p>
          <div style={{ marginTop:10, padding:'8px 14px', borderRadius:8, display:'inline-block',
            background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)',
            fontSize:12, color:'#fbbf24' }}>
            ⚠️ 修改后需要重新登录
          </div>
        </div>

        <div className="glass-card" style={{ borderRadius:16, padding:'28px 28px' }}>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
            <button type="button" onClick={()=>setShow(p=>!p)}
              style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none',
                cursor:'pointer', color:'#6b7099', fontSize:12, padding:0 }}>
              {show ? <EyeOff size={13}/> : <Eye size={13}/>}
              {show ? '隐藏密码' : '显示密码'}
            </button>
          </div>

          <div className="form-row">
            <label className="form-label">新用户名</label>
            <input className="prism-input" type="text"
              placeholder="请输入新用户名（3-20位）"
              value={newUsername} onChange={e => setNewUsername(e.target.value)}
              style={{ borderColor: errors.newUsername ? '#f43f5e' : undefined }}/>
            {errors.newUsername && <p style={{ fontSize:11, color:'#f43f5e', marginTop:4 }}>{errors.newUsername}</p>}
          </div>

          <div className="form-row">
            <label className="form-label">当前密码</label>
            <input className="prism-input" type={inputType}
              placeholder="请输入当前密码（默认 admin_user）"
              value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
              style={{ borderColor: errors.currentPassword ? '#f43f5e' : undefined }}/>
            {errors.currentPassword && <p style={{ fontSize:11, color:'#f43f5e', marginTop:4 }}>{errors.currentPassword}</p>}
          </div>

          <div className="form-row">
            <label className="form-label">新密码</label>
            <input className="prism-input" type={inputType}
              placeholder="请输入新密码（至少6位）"
              value={newPassword} onChange={e => setNewPassword(e.target.value)}
              style={{ borderColor: errors.newPassword ? '#f43f5e' : undefined }}/>
            {errors.newPassword && <p style={{ fontSize:11, color:'#f43f5e', marginTop:4 }}>{errors.newPassword}</p>}
          </div>

          <div className="form-row" style={{ marginBottom:24 }}>
            <label className="form-label">确认新密码</label>
            <input className="prism-input" type={inputType}
              placeholder="请再次输入新密码"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              style={{ borderColor: errors.confirmPassword ? '#f43f5e' : undefined }}/>
            {errors.confirmPassword && <p style={{ fontSize:11, color:'#f43f5e', marginTop:4 }}>{errors.confirmPassword}</p>}
          </div>

          <button type="submit" disabled={loading} style={{
            width:'100%', padding:'10px', fontSize:14, border:'none', borderRadius:8,
            background:'linear-gradient(135deg,#f59e0b,#f43f5e)', color:'#fff', fontWeight:600,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            fontFamily:"'DM Sans',sans-serif" }}>
            {loading
              ? <span style={{ display:'inline-block', width:14, height:14,
                  border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff',
                  borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/>
              : <KeyRound size={15}/>}
            {loading ? '修改中...' : '立即修改账号密码'}
          </button>
        </div>
      </form>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  )
}
