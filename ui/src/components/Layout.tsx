import React, { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LogOut, User as UserIcon, ChevronDown } from 'lucide-react'
import { useAuth } from '../store/auth'
import { useToast } from '../store/toast'
import { isAdmin, getConfigs } from '../api'

// ── 图标（线条风格，18px 视觉）───────────────────────────────
const Icons = {
  Dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  Forward: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M5 12h14"/>
      <path d="M13 6l6 6-6 6"/>
    </svg>
  ),
  Tunnel: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <circle cx="5" cy="12" r="2"/>
      <circle cx="19" cy="12" r="2"/>
      <path d="M7 12h10"/>
      <path d="M7 9c0-3 10-3 10 0"/>
      <path d="M7 15c0 3 10 3 10 0"/>
    </svg>
  ),
  Node: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <rect x="2" y="4" width="20" height="5.5" rx="1.5"/>
      <rect x="2" y="11.5" width="20" height="5.5" rx="1.5"/>
      <circle cx="18.5" cy="6.75" r="0.9" fill="currentColor" stroke="none"/>
      <circle cx="18.5" cy="14.25" r="0.9" fill="currentColor" stroke="none"/>
      <path d="M6 6.75h8M6 14.25h8"/>
    </svg>
  ),
  Speed: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M5.1 16.5A8 8 0 1 1 18.9 16.5"/>
      <path d="M12 12l-3-4.5" strokeWidth="2"/>
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>
    </svg>
  ),
  Users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <circle cx="9" cy="7" r="3.5"/>
      <path d="M2 20c0-3.5 3.1-6 7-6s7 2.5 7 6"/>
      <path d="M17 11c1.7 0 3 1.2 3 2.8V20" opacity="0.6"/>
      <circle cx="16" cy="5.5" r="2.5" opacity="0.6"/>
    </svg>
  ),
  Config: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <line x1="4" y1="6" x2="20" y2="6"/>
      <line x1="4" y1="12" x2="20" y2="12"/>
      <line x1="4" y1="18" x2="20" y2="18"/>
      <circle cx="9" cy="6" r="2.2" fill="#0a0b13" strokeWidth="1.5"/>
      <circle cx="15" cy="12" r="2.2" fill="#0a0b13" strokeWidth="1.5"/>
      <circle cx="9" cy="18" r="2.2" fill="#0a0b13" strokeWidth="1.5"/>
    </svg>
  ),
}

const NAV = [
  { to: '/dashboard', label: '概览',   adminOnly: false, icon: Icons.Dashboard },
  { to: '/forwards',  label: '转发',   adminOnly: false, icon: Icons.Forward   },
  { to: '/tunnels',   label: '隧道',   adminOnly: true,  icon: Icons.Tunnel    },
  { to: '/nodes',     label: '节点',   adminOnly: true,  icon: Icons.Node      },
  { to: '/speed',     label: '限速',   adminOnly: true,  icon: Icons.Speed     },
  { to: '/users',     label: '用户',   adminOnly: true,  icon: Icons.Users     },
  { to: '/config',    label: '配置',   adminOnly: true,  icon: Icons.Config    },
]

import { LOGO_KEY, FAVICON_KEY, BG_KEY, AVATAR_KEY, NAME_KEY, uKey, applyCustomSettings } from '../utils/theme'

export default function Layout() {
  const { user, clearAuth } = useAuth()
  const { toast } = useToast()
  const nav = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [logoSrc, setLogoSrc] = useState(localStorage.getItem(uKey(user?.username, LOGO_KEY)) || localStorage.getItem(LOGO_KEY) || '')
  const [avatarSrc, setAvatarSrc] = useState(localStorage.getItem(uKey(user?.username, AVATAR_KEY)) || '')
  const [displayName, setDisplayName] = useState(localStorage.getItem(uKey(user?.username, NAME_KEY)) || user?.username || '')
  const [appName, setAppName] = useState(localStorage.getItem('vite_config_app_name') || 'Prism')

  useEffect(() => {
    // 监听实时变更
    const handleLogo = (e: Event) => setLogoSrc((e as CustomEvent).detail || '')
    const handleProfile = () => {
      setAvatarSrc(localStorage.getItem(uKey(user?.username, AVATAR_KEY)) || '')
      setDisplayName(localStorage.getItem(uKey(user?.username, NAME_KEY)) || user?.username || '')
      setAppName(localStorage.getItem('vite_config_app_name') || 'Prism')
    }
    const handleConfig = handleProfile
    
    window.addEventListener('prism-logo-change', handleLogo)
    window.addEventListener('prism-profile-change', handleProfile)
    window.addEventListener('prism-config-change', handleConfig)

    // 加载全局及用户专属配置
    const loadUserConfig = async () => {
      try {
        const r = await getConfigs()
        if (r.data.code === 0) {
          const d = r.data.data || {}
          
          // 1. 同步 App Name
          if (d['app_name']) {
            localStorage.setItem('vite_config_app_name', d['app_name'])
            setAppName(d['app_name'])
          } else {
            localStorage.removeItem('vite_config_app_name')
            setAppName('Prism')
          }

          if (user) {
            const uk = (k: string) => user.username + '_' + k
            const lk = (k: string) => uKey(user.username, k)
            
            // 2. 同步 Logo
            const logo = d[uk(LOGO_KEY)] || d[LOGO_KEY] || ''
            setLogoSrc(logo)
            if (d[uk(LOGO_KEY)]) localStorage.setItem(lk(LOGO_KEY), d[uk(LOGO_KEY)])
            else localStorage.removeItem(lk(LOGO_KEY))

            // 3. 同步背景和 Favicon
            const syncAsset = (k: string) => {
              if (d[uk(k)]) localStorage.setItem(lk(k), d[uk(k)])
              else localStorage.removeItem(lk(k))
              if (d[k]) localStorage.setItem(k, d[k])
              else localStorage.removeItem(k)
            }
            syncAsset(BG_KEY); syncAsset(FAVICON_KEY)

            // 4. 同步头像和名称
            if (d[uk(AVATAR_KEY)]) {
              localStorage.setItem(lk(AVATAR_KEY), d[uk(AVATAR_KEY)]); setAvatarSrc(d[uk(AVATAR_KEY)])
            } else {
              localStorage.removeItem(lk(AVATAR_KEY)); setAvatarSrc('')
            }
            if (d[uk(NAME_KEY)]) {
              localStorage.setItem(lk(NAME_KEY), d[uk(NAME_KEY)]); setDisplayName(d[uk(NAME_KEY)])
            } else {
              localStorage.removeItem(lk(NAME_KEY)); setDisplayName(user.username)
            }
          }
        }
      } catch (e) {}
      applyCustomSettings(user?.username)
    }
    loadUserConfig()

    return () => {
      window.removeEventListener('prism-logo-change', handleLogo)
      window.removeEventListener('prism-profile-change', handleProfile)
      window.removeEventListener('prism-config-change', handleConfig)
    }
  }, [user])
  const admin = isAdmin()
  const W = collapsed ? 60 : 220

  const handleLogout = () => {
    clearAuth(); nav('/login'); toast('info', '已退出登录')
  }

  const visibleNav = NAV.filter(n => !n.adminOnly || admin)

  return (
    <div style={{ display:'flex', height:'100vh', background:'transparent', overflow:'hidden' }}
      >

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside style={{
        width:W, minWidth:W, flexShrink:0,
        display:'flex', flexDirection:'column',
        background:'#08090f',
        borderRight:'1px solid rgba(255,255,255,0.04)',
        transition:'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s',
        zIndex:10, overflow:'hidden',
      }}>

        {/* Logo - 完全居中 */}
        <div style={{ 
          height: collapsed ? 80 : 110, 
          display:'flex', 
          flexDirection: 'column',
          alignItems:'center', 
          justifyContent: 'center',
          padding: '0 10px',
          borderBottom:'1px solid rgba(255,255,255,0.03)',
          gap: 12, 
          flexShrink:0,
          transition: 'all 0.3s'
        }}>
          <div style={{ 
            flexShrink:0,
            transform: collapsed ? 'scale(1.2)' : 'scale(1.5)',
            transition: 'transform 0.3s'
          }}>
            {logoSrc ? (
              <img src={logoSrc} style={{ width: 32, height: 32, objectFit: 'contain' }} />
            ) : (
              <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
                <defs><linearGradient id="sl" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#38bdf8"/>
                </linearGradient></defs>
                <polygon points="24,5 43,38 5,38"
                  stroke="url(#sl)" strokeWidth="2.5" fill="none" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          {!collapsed && (
            <span style={{
              fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:19,
              letterSpacing:'0.04em',
              background:'linear-gradient(135deg,#fff 0%,#a5b4fc 100%)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              whiteSpace:'nowrap',
              marginTop: 4
            }}>{appName}</span>
          )}
        </div>

        {/* 导航 - 对称居中布局 */}
        <nav style={{ flex:1, padding:'20px 10px', overflowY:'auto', overflowX:'hidden', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {visibleNav.map(({ to, icon: IconElement, label }) => (
            <NavLink key={to} to={to} end={to === '/dashboard'}
              style={({ isActive }) => ({
                display:'flex', 
                flexDirection: 'column',
                alignItems:'center',
                justifyContent: 'center',
                gap: 4,
                padding: '12px 6px',
                borderRadius: 14, 
                marginBottom: 2,
                textDecoration:'none', 
                position:'relative',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.3)',
                background: isActive
                  ? 'rgba(255,255,255,0.03)'
                  : 'transparent',
                fontFamily:"'DM Sans',sans-serif",
                fontSize: 14, 
                fontWeight: isActive ? 600 : 400,
                whiteSpace:'nowrap', 
                overflow:'hidden',
                transition:'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              })}>
              {({ isActive }) => (<>
                <div style={{ 
                  transform: isActive ? 'scale(1.25)' : 'scale(1.15)',
                  transition: 'transform 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isActive ? 1 : 0.6
                }}>
                  {IconElement}
                </div>
                {!collapsed && (
                  <span style={{ 
                    marginTop: 2,
                    fontSize: 14,
                    letterSpacing: '0.01em',
                    opacity: isActive ? 1 : 0.8
                  }}>{label}</span>
                )}
                {isActive && (
                   <div style={{
                     position: 'absolute',
                     left: '50%',
                     bottom: 4,
                     transform: 'translateX(-50%)',
                     width: 4,
                     height: 4,
                     borderRadius: '50%',
                     background: '#818cf8',
                     boxShadow: '0 0 10px #818cf8'
                   }} />
                )}
              </>)}
            </NavLink>
          ))}
        </nav>

        {/* 收起/展开按钮 */}
        <div style={{ padding:'8px 10px 12px',
          borderTop:'1px solid rgba(255,255,255,0.03)', flexShrink:0 }}>
          <button onClick={() => setCollapsed(p => !p)} style={{
            width:'100%', display:'flex', alignItems:'center',
            justifyContent: 'center',
            gap:4, padding:'8px 4px',
            borderRadius:10, border:'none', background:'transparent',
            color:'rgba(255,255,255,0.2)', cursor:'pointer', fontSize:11,
            letterSpacing:'0.04em', transition:'all 0.2s',
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.02)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.2)';
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}>
            {collapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
          </button>
        </div>
      </aside>

      {/* ── 主内容区 ──────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>

        {/* 悬浮用户中心 */}
        <div style={{ 
          position:'absolute', top:24, right:24, zIndex:50,
        }} 
             onMouseEnter={() => { 
               if ((window as any)._menuTimer) clearTimeout((window as any)._menuTimer); 
               setShowUserMenu(true); 
             }} 
             onMouseLeave={() => { 
               (window as any)._menuTimer = setTimeout(() => setShowUserMenu(false), 150); 
             }}>
          <button
            onClick={() => nav('/profile')}
            style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'6px 14px 6px 6px', borderRadius:40,
              border:'1px solid rgba(255,255,255,0.08)',
              background: showUserMenu ? 'rgba(255,255,255,0.08)' : 'rgba(13,14,24,0.6)',
              backdropFilter: 'blur(10px)',
              cursor:'pointer', transition:'all 0.25s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}>
            {/* 头像 */}
            <div style={{
              width:32, height:32, borderRadius:'50%', flexShrink:0,
              background:'linear-gradient(135deg,#6366f1,#0ea5e9)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:12, fontWeight:700, color:'#fff', overflow:'hidden',
              boxShadow: '0 0 10px rgba(99,102,241,0.3)'
            }}>
              {avatarSrc ? (
                <img src={avatarSrc} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              ) : (
                user?.username?.[0]?.toUpperCase()
              )}
            </div>
            {/* 名称 */}
            <div style={{ textAlign:'left', lineHeight:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>
                {displayName}
              </div>
            </div>
            <ChevronDown size={14} style={{ 
              color:'rgba(255,255,255,0.3)',
              transform: showUserMenu ? 'rotate(180deg)' : 'none',
              transition:'transform 0.3s',
            }}/>
          </button>

          {/* 下拉菜单 (优化动画与居中对齐) */}
          <div style={{
            position:"absolute", top:"calc(100% + 8px)", right:0,
            background:"rgba(19,20,31,0.95)", border:"1px solid rgba(255,255,255,0.08)",
            borderRadius:16, padding:"8px",
            backdropFilter: 'blur(20px)',
            boxShadow:"0 20px 50px rgba(0,0,0,0.5)",
            minWidth:160, zIndex:100,
            opacity: showUserMenu ? 1 : 0,
            transform: showUserMenu ? "translateY(0) scale(1)" : "translateY(-12px) scale(0.95)",
            pointerEvents: showUserMenu ? "auto" : "none",
            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            transformOrigin: "top right",
          }}>
            <div style={{ padding: '8px 12px 12px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 6 }}>
               <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account</div>
               <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 2 }}>{displayName}</div>
            </div>
            <button
              onClick={() => { setShowUserMenu(false); nav("/profile"); }}
              style={{
                width:"100%", display:"flex", flexDirection: 'column', alignItems:"center", justifyContent: 'center', gap:4,
                padding:"10px 0", borderRadius:12,
                color:"rgba(255,255,255,0.7)", fontSize:13, fontWeight:600,
                background:"transparent", cursor:"pointer", border:"none",
                transition:"all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              onMouseEnter={e => { e.currentTarget.style.color="#000"; e.currentTarget.style.background="#fff"; e.currentTarget.style.transform="scale(1.02)" }}
              onMouseLeave={e => { e.currentTarget.style.color="rgba(255,255,255,0.7)"; e.currentTarget.style.background="transparent"; e.currentTarget.style.transform="scale(1)" }}>
              <UserIcon size={16}/>
              控制台
            </button>
            <button
              onClick={() => { setShowUserMenu(false); handleLogout(); }}
              style={{
                width:"100%", display:"flex", flexDirection: 'column', alignItems:"center", justifyContent: 'center', gap:4,
                padding:"10px 0", borderRadius:12,
                color:"#f87171", fontSize:13, fontWeight:600,
                background:"transparent", cursor:"pointer", border:"none",
                transition:"all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                marginTop: 4
              }}
              onMouseEnter={e => { e.currentTarget.style.color="#fff"; e.currentTarget.style.background="#ef4444"; e.currentTarget.style.transform="scale(1.02)" }}
              onMouseLeave={e => { e.currentTarget.style.color="#f87171"; e.currentTarget.style.background="transparent"; e.currentTarget.style.transform="scale(1)" }}>
              <LogOut size={16}/>
              退出登录
            </button>
          </div>
        </div>

        {/* 页面内容 - 保持原位 (原 60px 顶栏空间 + 28px 基础边距 = 88px) */}
        <main style={{ flex:1, overflow:'auto', padding:'88px 28px 28px' }}>
          <Outlet/>
        </main>
      </div>
    </div>
  )
}
