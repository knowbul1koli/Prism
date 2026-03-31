import React, { useEffect, useState, useRef } from 'react'
import { Save, RefreshCw, Upload, X, AlertCircle } from 'lucide-react'
import api, { isAdmin, getConfigs, updateConfigs } from '../api'
import { useAuth } from '../store/auth'
import { useToast } from '../store/toast'
import { useNavigate } from 'react-router-dom'
import { PageSpinner } from '../components/Spinner'
import { LOGO_KEY, FAVICON_KEY, BG_KEY, uKey, applyCustomSettings } from '../utils/theme'
import { CustomSelect } from '../components/CustomSelect'

export default function Config() {
  const { user } = useAuth()
  const { toast } = useToast()
  const nav = useNavigate()
  
  const [configs,  setConfigs]  = useState<Record<string,string>>({})
  const [original, setOriginal] = useState<Record<string,string>>({})
  const [loading,  setLoading]  = useState(false)
  const [saving,   setSaving]   = useState(false)

  const logoRef    = useRef<HTMLInputElement>(null)
  const faviconRef = useRef<HTMLInputElement>(null)
  const bgImgRef   = useRef<HTMLInputElement>(null)

  const [bgMode, setBgModeState] = useState<'default'|'color'|'gradient'|'image'>('default')
  const [bgColor,  setBgColor]  = useState('#0d0f1a')
  const [bgGrad1,  setBgGrad1]  = useState('#0d0d1a')
  const [bgGrad2,  setBgGrad2]  = useState('#0a0b13')

  // 关键：后端数据库存储的真实 Key
  const realKey = (k: string) => user?.username ? `${user.username}_${k}` : k

  useEffect(() => {
    if (!isAdmin()) { toast('error', '权限不足'); nav('/dashboard'); return }
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const r = await getConfigs()
      if (r.data.code === 0) {
        const d = r.data.data || {}
        setConfigs({...d}); setOriginal({...d})
        
        const bg = d[realKey(BG_KEY)] || d[BG_KEY] || ''
        if (!bg || bg === 'default') setBgModeState('default')
        else if (bg.startsWith('data:image') || bg.startsWith('http')) setBgModeState('image')
        else if (bg.startsWith('linear-gradient')) setBgModeState('gradient')
        else { setBgModeState('color'); setBgColor(bg) }
      }
    } catch { toast('error', '加载配置失败') }
    finally { setLoading(false) }
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      const pfx = user?.username ? user.username + '_' : ''
      const filtered: Record<string, string> = {}

      // 仅处理属于当前用户的 key 或全局 key
      Object.entries(configs).forEach(([k, v]) => {
        if (k === 'app_name' || k === LOGO_KEY || k === FAVICON_KEY || k === BG_KEY || k.startsWith(pfx)) {
          filtered[k] = v
        }
      })

      const r = await updateConfigs(filtered)
      if (r.data.code !== 0) { toast('error', r.data.msg||'保存失败'); return }

      // 写入本地存储
      Object.entries(filtered).forEach(([k, v]) => {
        const isUserKey = user?.username && k.startsWith(user.username + '_')
        const finalLocalKey = isUserKey ? `u_${k}` : (k === 'app_name' ? 'vite_config_app_name' : k)

        if (v && v !== '') localStorage.setItem(finalLocalKey, v); 
        else localStorage.removeItem(finalLocalKey);
      })

      setOriginal({...configs})
      toast('success', '✅ 配置保存成功')

      window.dispatchEvent(new Event('prism-config-change'))
      window.dispatchEvent(new Event('prism-profile-change'))
      window.dispatchEvent(new CustomEvent('prism-logo-change', { detail: configs[realKey(LOGO_KEY)] || configs[LOGO_KEY] || '' }))

      applyCustomSettings(user?.username)
      if (configs.app_name) document.title = configs.app_name
    } catch { toast('error', '保存失败：数据过大或网络异常') }
    finally { setSaving(false) }
  }

  const readFile = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader(); r.onload = e => res(e.target!.result as string); r.onerror = rej; r.readAsDataURL(file)
    })

  const setVal = (k: string, v: string) => setConfigs(p => ({...p, [k]: v}))

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out', maxWidth: 800, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>网站配置</h1>
          <p style={{ color: '#6b7099', fontSize: 13, marginTop: 4 }}>点击保存后，新配置将永久同步到服务器</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-ghost" onClick={load}><RefreshCw size={16} /></button>
          <button className="btn-primary" onClick={saveAll} disabled={saving || JSON.stringify(configs) === JSON.stringify(original)} style={{ padding: '8px 24px' }}>
            <Save size={16}/> {saving ? '正在保存...' : '保存修改'}
          </button>
        </div>
      </div>

      {loading ? <PageSpinner text="同步中..."/> : (
        <div className="glass-card" style={{ borderRadius: 20, padding: '32px 40px' }}>
          
          <div className="form-row">
            <label className="form-label">应用名称</label>
            <input className="prism-input" value={configs.app_name || ''} 
              onChange={e => setVal('app_name', e.target.value)} placeholder="Prism Panel" />
          </div>

          <div style={{ margin:'32px 0 20px', borderBottom:'1px solid rgba(255,255,255,0.05)', paddingBottom:10, fontSize:13, color:'rgba(255,255,255,0.4)', fontWeight:600 }}>视觉资产管理</div>
          
          {/* Favicon */}
          <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:24 }}>
            <div style={{ width:56, height:56, borderRadius:12, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
              {configs[realKey(FAVICON_KEY)] ? <img src={configs[realKey(FAVICON_KEY)]} style={{ width:32, height:32 }}/> : <span>🌐</span>}
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:14, color:'#fff', margin:'0 0 6px' }}>浏览器图标 (Favicon)</p>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn-primary btn-sm" onClick={()=>faviconRef.current?.click()}>选择图片</button>
                {(configs[realKey(FAVICON_KEY)] || configs[FAVICON_KEY]) && <button onClick={()=>{setVal(realKey(FAVICON_KEY), ''); setVal(FAVICON_KEY, '')}} className="btn-danger btn-sm">恢复默认</button>}
              </div>
              <input ref={faviconRef} type="file" hidden onChange={async e => { const f=e.target.files?.[0]; if(f) setVal(realKey(FAVICON_KEY), await readFile(f)) }}/>
            </div>
          </div>

          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:32 }}>
            <div style={{ width:56, height:56, borderRadius:12, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
              {configs[realKey(LOGO_KEY)] ? <img src={configs[realKey(LOGO_KEY)]} style={{ width:40, height:40 }}/> : <div style={{width:24, height:24, border:'2px solid #818cf8', borderRadius:4}}/>}
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:14, color:'#fff', margin:'0 0 6px' }}>侧边栏 Logo</p>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn-primary btn-sm" onClick={()=>logoRef.current?.click()}>选择图片</button>
                {(configs[realKey(LOGO_KEY)] || configs[LOGO_KEY]) && <button onClick={()=>{setVal(realKey(LOGO_KEY), ''); setVal(LOGO_KEY, '')}} className="btn-danger btn-sm">恢复默认</button>}
              </div>
              <input ref={logoRef} type="file" hidden onChange={async e => { const f=e.target.files?.[0]; if(f) setVal(realKey(LOGO_KEY), await readFile(f)) }}/>
            </div>
          </div>

          <div style={{ margin:'32px 0 20px', borderBottom:'1px solid rgba(255,255,255,0.05)', paddingBottom:10, fontSize:13, color:'rgba(255,255,255,0.4)', fontWeight:600 }}>个性化背景</div>
          <CustomSelect
            value={bgMode}
            options={[
              { label: '深邃黑 (默认)', value: 'default' },
              { label: '简约纯色', value: 'color' },
              { label: '高级渐变', value: 'gradient' },
              { label: '壁纸图片', value: 'image' },
            ]}
            onChange={v => {
              setBgModeState(v)
              if (v === 'default') { setVal(realKey(BG_KEY), ''); setVal(BG_KEY, '') }
            }}
          />

          <div style={{ marginTop: 20, padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
            {bgMode === 'default' && <div style={{ textAlign:'center', color:'#6b7099', fontSize:13 }}>预览：系统默认深邃黑</div>}
            {bgMode === 'color' && <div style={{ display:'flex', alignItems:'center', gap:16, justifyContent:'center' }}>
                <input type="color" value={bgColor} onChange={e=>setBgColor(e.target.value)} style={{ width:40, height:40, cursor:'pointer' }}/>
                <button className="btn-primary btn-sm" onClick={() => setVal(realKey(BG_KEY), bgColor)}>应用预览</button>
            </div>}
            {bgMode === 'gradient' && <div style={{ display:'flex', flexDirection:'column', gap:12, alignItems:'center' }}>
                <div style={{ display:'flex', gap:10 }}>
                  <input type="color" value={bgGrad1} onChange={e=>setBgGrad1(e.target.value)} />
                  <input type="color" value={bgGrad2} onChange={e=>setBgGrad2(e.target.value)} />
                </div>
                <button className="btn-primary btn-sm" onClick={() => setVal(realKey(BG_KEY), `linear-gradient(135deg,${bgGrad1},${bgGrad2})`)}>应用预览</button>
            </div>}
            {bgMode === 'image' && <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ width:100, height:60, borderRadius:8, background: configs[realKey(BG_KEY)] ? `url(${configs[realKey(BG_KEY)]}) center/cover` : '#333' }}/>
                <button className="btn-primary btn-sm" onClick={()=>bgImgRef.current?.click()}>选择壁纸</button>
                <input ref={bgImgRef} type="file" hidden onChange={async e => { const f=e.target.files?.[0]; if(f) setVal(realKey(BG_KEY), await readFile(f)) }}/>
            </div>}
          </div>
        </div>
      )}

      {JSON.stringify(configs) !== JSON.stringify(original) && (
        <div style={{ marginTop:24, padding:'16px', borderRadius:12, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)', color:'#fbbf24', display:'flex', alignItems:'center', gap:10 }}>
          <AlertCircle size={16}/>
          <span>您有未保存的更改，请点击右上角「保存修改」以生效。</span>
        </div>
      )}
    </div>
  )
}
