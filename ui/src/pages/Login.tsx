import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../store/auth'
import { useToast } from '../store/toast'

type Mode = 'login' | 'register' | 'init'

/* ── Inline icons (no deps) ─────────────────── */
const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/>
  </svg>
)
const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)
const IconShield = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
)
const IconEye = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)
const IconEyeOff = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <path d="m14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)
const IconArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  </svg>
)
const IconLoader = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" style={{ animation:'spin .7s linear infinite' }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
)

/* ── Floating input component ────────────────── */
function FloatingInput({ icon, label, type = 'text', value, onChange, autoComplete, autoFocus, suffix }: {
  icon: React.ReactNode; label: string; type?: string;
  value: string; onChange: (v: string) => void;
  autoComplete?: string; autoFocus?: boolean; suffix?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false)
  const active = focused || value.length > 0

  return (
    <div style={{
      position:'relative',
      borderRadius:14,
      background: focused ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.015)',
      border: `1px solid ${focused ? 'rgba(129,140,248,0.5)' : 'rgba(255,255,255,0.07)'}`,
      transition:'all 0.25s cubic-bezier(0.4,0,0.2,1)',
      boxShadow: focused ? '0 0 0 3px rgba(129,140,248,0.08), 0 4px 20px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.1)',
    }}
      onMouseEnter={e => { if(!focused) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
      onMouseLeave={e => { if(!focused) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
    >
      {/* Icon */}
      <div style={{
        position:'absolute', left:16, top:'50%', transform:'translateY(-50%)',
        color: focused ? '#818cf8' : 'rgba(255,255,255,0.2)',
        transition:'color 0.2s', display:'flex', pointerEvents:'none',
      }}>{icon}</div>

      {/* Floating label */}
      <div style={{
        position:'absolute',
        left:42, top: active ? 8 : '50%',
        transform: active ? 'none' : 'translateY(-50%)',
        fontSize: active ? 10 : 14,
        fontWeight: active ? 600 : 400,
        color: focused ? '#818cf8' : 'rgba(255,255,255,0.25)',
        letterSpacing: active ? '0.06em' : '0',
        textTransform: active ? 'uppercase' as const : 'none' as const,
        transition:'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        pointerEvents:'none',
        fontFamily:"'DM Sans',sans-serif",
      }}>{label}</div>

      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required
        style={{
          width:'100%', background:'transparent', border:'none', outline:'none',
          color:'#e2e4f0', fontSize:14, fontFamily:"'DM Sans',sans-serif",
          padding: active ? '24px 44px 8px 42px' : '16px 44px 16px 42px',
          transition:'padding 0.2s',
        }}
      />

      {suffix && (
        <div style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)' }}>
          {suffix}
        </div>
      )}
    </div>
  )
}


export default function Login() {
  const [mode, setMode] = useState<Mode>('login')
  const [initChecked, setInitChecked] = useState(false)
  const [regEnabled, setRegEnabled] = useState(false)
  const [user, setUser] = useState('')
  const [pwd, setPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const { setAuth } = useAuth()
  const { toast } = useToast()
  const nav = useNavigate()
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    api.get('/user/init-status').then(r => {
      if (r?.data?.code === 0) {
        const d = r.data.data
        if (!d.initialized) setMode('init')
        else setRegEnabled(d.register_enabled)
      }
    }).catch(() => {}).finally(() => setInitChecked(true))
  }, [])

  const switchMode = (to: Mode) => {
    setTransitioning(true)
    setTimeout(() => {
      setMode(to)
      setPwd(''); setConfirmPwd('')
      setTimeout(() => setTransitioning(false), 30)
    }, 180)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'login') {
      setLoading(true)
      try {
        const r = await api.post('/user/login', { username: user, password: pwd })
        if (r.data.code === 0) {
          setAuth(r.data.data.token, { username: r.data.data.name, role_id: r.data.data.role_id })
          window.location.href = '/dashboard'
        } else toast('error', r.data.msg || '登录失败')
      } catch { toast('error', '服务器错误') }
      finally { setLoading(false) }
      return
    }

    if (!user.trim()) { toast('error', '请输入用户名'); return }
    if (user.trim().length < 3) { toast('error', '用户名至少3位'); return }
    if (!pwd) { toast('error', '请输入密码'); return }
    if (pwd.length < 6) { toast('error', '密码至少6位'); return }
    if (pwd !== confirmPwd) { toast('error', '两次密码不一致'); return }

    setLoading(true)
    try {
      const r = await api.post('/user/register', { user: user.trim(), pwd, confirmPwd })
      if (r.data.code === 0) {
        toast('success', mode === 'init' ? '管理员创建成功' : '注册成功')
        switchMode('login')
        if (mode === 'init') setRegEnabled(true)
      } else toast('error', r.data.msg || '注册失败')
    } catch { toast('error', '服务器错误') }
    finally { setLoading(false) }
  }

  const isReg = mode === 'register' || mode === 'init'

  /* ── Loading state ─────────────────────────── */
  if (!initChecked) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
        minHeight:'100vh', background:'#06070c' }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
          <div style={{ width:32, height:32, border:'2px solid rgba(129,140,248,0.15)',
            borderTopColor:'#818cf8', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
          <span style={{ color:'rgba(255,255,255,0.25)', fontSize:13, letterSpacing:'0.05em' }}>LOADING</span>
        </div>
      </div>
    )
  }

  const pwdToggle = (
    <button type="button" onClick={() => setShowPwd(p => !p)} style={{
      background:'none', border:'none', cursor:'pointer', padding:4,
      color:'rgba(255,255,255,0.2)', display:'flex', transition:'color 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
    >
      {showPwd ? <IconEyeOff/> : <IconEye/>}
    </button>
  )

  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      minHeight:'100vh', background:'#06070c', position:'relative', overflow:'hidden',
    }}>
      {/* ── Background effects ─────────────────── */}
      <div style={{
        position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none',
      }}>
        {/* Radial glow top-right */}
        <div style={{
          position:'absolute', top:'-20%', right:'-10%',
          width:700, height:700, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
        }}/>
        {/* Radial glow bottom-left */}
        <div style={{
          position:'absolute', bottom:'-20%', left:'-10%',
          width:600, height:600, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(56,189,248,0.04) 0%, transparent 70%)',
        }}/>
        {/* Grid overlay */}
        <div style={{
          position:'absolute', inset:0, opacity:0.03,
          backgroundImage:'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize:'60px 60px',
        }}/>
        {/* Subtle noise */}
        <div style={{
          position:'absolute', inset:0, opacity:0.015,
          backgroundImage:'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}/>
      </div>

      {/* ── Card ───────────────────────────────── */}
      <div style={{
        position:'relative', width:420, zIndex:1,
        opacity: transitioning ? 0 : 1,
        transform: transitioning ? 'translateY(8px) scale(0.98)' : 'none',
        transition:'all 0.2s cubic-bezier(0.4,0,0.2,1)',
      }}>

        {/* Logo + Title area */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          {/* Animated logo */}
          <div style={{
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            width:56, height:56, borderRadius:16,
            background:'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(56,189,248,0.08))',
            border:'1px solid rgba(99,102,241,0.15)',
            marginBottom:20, position:'relative',
          }}>
            <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
              <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#818cf8"/>
                  <stop offset="100%" stopColor="#38bdf8"/>
                </linearGradient>
              </defs>
              <polygon points="24,6 42,37 6,37" stroke="url(#lg)" strokeWidth="2.5" fill="none" strokeLinejoin="round"/>
            </svg>
            {/* Corner glow */}
            <div style={{
              position:'absolute', top:-1, right:-1, width:8, height:8,
              borderRadius:'50%', background:'#818cf8', opacity:0.6,
              boxShadow:'0 0 12px 2px rgba(129,140,248,0.4)',
              animation:'pulse 3s ease-in-out infinite',
            }}/>
          </div>

          <h1 style={{
            fontFamily:"'Sora',sans-serif", fontSize:24, fontWeight:700,
            color:'#fff', margin:'0 0 6px', letterSpacing:'-0.01em',
          }}>
            {mode === 'init' ? 'Prism Panel' : 'Prism Panel'}
          </h1>

          <p style={{
            fontSize:13, color:'rgba(255,255,255,0.35)', margin:0,
            fontFamily:"'DM Sans',sans-serif",
          }}>
            {mode === 'init' && '首次使用 — 创建管理员账号'}
            {mode === 'register' && '创建您的账号'}
            {mode === 'login' && '登录到控制台'}
          </p>
        </div>

        {/* Init admin badge */}
        {mode === 'init' && (
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            marginBottom:24, padding:'12px 16px', borderRadius:12,
            background:'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(56,189,248,0.05))',
            border:'1px solid rgba(99,102,241,0.15)',
          }}>
            <div style={{
              width:28, height:28, borderRadius:8, flexShrink:0,
              background:'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(56,189,248,0.15))',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#a5b4fc',
            }}><IconShield/></div>
            <span style={{ fontSize:12, color:'#a5b4fc', lineHeight:1.5 }}>
              第一个注册的用户将成为<strong style={{ color:'#c7d2fe' }}>系统管理员</strong>，拥有全部权限
            </span>
          </div>
        )}

        {/* ── Form card ────────────────────────── */}
        <form ref={formRef} onSubmit={submit} style={{
          background:'rgba(255,255,255,0.015)',
          border:'1px solid rgba(255,255,255,0.06)',
          borderRadius:20, padding:'32px 28px 28px',
          backdropFilter:'blur(20px)',
          boxShadow:'0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
        }}>

          {/* Mode tabs (only when not init) */}
          {mode !== 'init' && regEnabled && (
            <div style={{
              display:'flex', gap:4, marginBottom:28, padding:3,
              background:'rgba(255,255,255,0.03)', borderRadius:12,
              border:'1px solid rgba(255,255,255,0.04)',
            }}>
              {(['login', 'register'] as const).map(m => (
                <button key={m} type="button" onClick={() => mode !== m && switchMode(m)}
                  style={{
                    flex:1, padding:'9px 0', borderRadius:9, border:'none',
                    fontSize:13, fontWeight: mode === m ? 600 : 400,
                    fontFamily:"'DM Sans',sans-serif", cursor:'pointer',
                    color: mode === m ? '#fff' : 'rgba(255,255,255,0.3)',
                    background: mode === m
                      ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(79,70,229,0.15))'
                      : 'transparent',
                    boxShadow: mode === m ? '0 2px 8px rgba(99,102,241,0.15)' : 'none',
                    transition:'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                  }}>
                  {m === 'login' ? '登录' : '注册'}
                </button>
              ))}
            </div>
          )}

          {/* Fields */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <FloatingInput
              icon={<IconUser/>} label="用户名" value={user}
              onChange={setUser} autoComplete="username" autoFocus
            />

            <FloatingInput
              icon={<IconLock/>} label="密码"
              type={showPwd ? 'text' : 'password'}
              value={pwd} onChange={setPwd}
              autoComplete={isReg ? 'new-password' : 'current-password'}
              suffix={pwdToggle}
            />

            {isReg && (
              <FloatingInput
                icon={<IconShield/>} label="确认密码"
                type={showPwd ? 'text' : 'password'}
                value={confirmPwd} onChange={setConfirmPwd}
                autoComplete="new-password"
              />
            )}
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading} style={{
            width:'100%', marginTop:24, padding:'13px 24px',
            borderRadius:14, border:'none', cursor: loading ? 'wait' : 'pointer',
            background: loading
              ? 'rgba(99,102,241,0.3)'
              : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)',
            color:'#fff', fontSize:14, fontWeight:600,
            fontFamily:"'DM Sans',sans-serif",
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            transition:'all 0.25s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
            opacity: loading ? 0.7 : 1,
            position:'relative', overflow:'hidden',
          }}
            onMouseEnter={e => { if(!loading){ e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 8px 30px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.1)' }}}
            onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 20px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.1)' }}
          >
            {loading
              ? <IconLoader/>
              : <>
                  {mode === 'init' ? '创建管理员账号' : mode === 'register' ? '创建账号' : '登录'}
                  <IconArrowRight/>
                </>
            }
          </button>
        </form>

        {/* Bottom toggle (no tabs, register disabled) */}
        {mode !== 'init' && !regEnabled && (
          <div style={{ textAlign:'center', marginTop:20 }}>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.2)' }}>
              {mode === 'login' ? '' : ''}
            </span>
          </div>
        )}

        {/* Footer */}
        <div style={{
          textAlign:'center', marginTop:32,
          fontSize:11, color:'rgba(255,255,255,0.12)',
          letterSpacing:'0.08em',
        }}>
          PRISM PANEL
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:0.6 } 50% { opacity:0.2 } }
      `}</style>
    </div>
  )
}
