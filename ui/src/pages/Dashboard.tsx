import { PageSpinner } from '../components/Spinner'
import React, { useEffect, useState } from 'react'
import {
  RefreshCw, Copy, Check, Server, GitBranch, ArrowRightLeft, Users, Activity,
  Plus, Pencil, Trash2, Pause, Play
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { CustomSelect } from '../components/CustomSelect'
import {
  getPackage, getNodes, getTunnels, getForwards, getUsers,
  addForward, updateForward, deleteForward, pauseForward, resumeForward,
  getUserTunnelOptions,
  formatBytes, formatGB, formatDate, isAdmin,
  type UserPackage, type Forward, type TunnelListItem
} from '../api'
import { useToast } from '../store/toast'

// 格式化：99999 = 无限制
const fmtNum  = (v?: number) => v === 99999 ? '无限制' : String(v ?? 0)
const fmtFlow = (v?: number) => v === 99999 ? '无限制' : formatGB(v ?? 0)
const pct     = (used: number, total: number) => total === 0 || total === 99999 ? 0 : Math.min(100, (used / total) * 100)

function PBar({ value, max, unlimited }: { value: number; max: number; unlimited?: boolean }) {
  const p = unlimited ? 100 : pct(value, max)
  const color = p >= 90 ? '#f43f5e' : p >= 70 ? '#f59e0b' : '#7c3aed'
  return (
    <div style={{ height:4, borderRadius:2, background:'#1e2133', overflow:'hidden', marginTop:4 }}>
      <div style={{ height:'100%', borderRadius:2, width:`${unlimited ? 100 : p}%`,
        background: unlimited ? 'linear-gradient(90deg,#7c3aed,#06b6d4)' : color,
        opacity: unlimited ? 0.5 : 1, transition:'width 0.4s' }}/>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="glass-card" style={{ borderRadius:14, padding:'18px 20px' }}>
      <div style={{ width:36, height:36, borderRadius:9, marginBottom:12,
        background:`linear-gradient(135deg,${color}28,${color}12)`,
        border:`1px solid ${color}30`,
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={16} color={color}/>
      </div>
      <div style={{ fontFamily:"'Sora',sans-serif", fontSize:22, fontWeight:700, color:'#e2e4f0', lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:12, color:'#6b7099', marginTop:5 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color, marginTop:3 }}>{sub}</div>}
    </div>
  )
}

const initForm = { name: '', tunnelId: 0, inPort: '' as string, remoteAddr: '', strategy: 'fifo' }

export default function Dashboard() {
  const { toast } = useToast()
  const [loading,  setLoading]  = useState(false)
  const [pkg,      setPkg]      = useState<UserPackage | null>(null)
  const [adminStats, setAdminStats] = useState({ nodes:0, online:0, tunnels:0, forwards:0, users:0 })
  const [copied,   setCopied]   = useState<number | null>(null)
  const admin = isAdmin()

  // 转发管理相关状态
  const [forwards, setForwards] = useState<Forward[]>([])
  const [tunnels,  setTunnels]  = useState<TunnelListItem[]>([])
  const [modal,    setModal]    = useState(false)
  const [editing,  setEditing]  = useState<Forward | null>(null)
  const [form,     setForm]     = useState({ ...initForm })
  const [saving,   setSaving]   = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [rPkg, rFwd, rTun] = await Promise.all([
        getPackage(),
        getForwards(),
        getUserTunnelOptions()
      ])

      if (rPkg.data.code === 0) setPkg(rPkg.data.data)
      if (rFwd.data.code === 0) setForwards(rFwd.data.data)
      if (rTun.data.code === 0) setTunnels(rTun.data.data)

      if (admin) {
        const [n, t, u] = await Promise.all([getNodes(), getTunnels(), getUsers()])
        setAdminStats({
          nodes:   n.data.code===0 ? n.data.data.length : 0,
          online:  n.data.code===0 ? n.data.data.filter((x:any)=>x.status===1).length : 0,
          tunnels: t.data.code===0 ? t.data.data.length : 0,
          forwards:rFwd.data.code===0 ? rFwd.data.data.length : 0,
          users:   u.data.code===0 ? u.data.data.length : 0,
        })
      }
    } catch { toast('error','加载数据失败') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // 到期提醒
  useEffect(() => {
    if (!pkg) return
    const warn = (name: string, ts: number) => {
      if (!ts) return
      const days = Math.ceil((ts - Date.now()) / 86400000)
      if (days <= 0) toast('error', `${name} 已过期`)
      else if (days <= 7) toast('info', `${name} 将在 ${days} 天后过期`)
    }
    warn('账户', pkg.userInfo.expTime)
    pkg.tunnelPermissions.forEach(tp => warn(`隧道「${tp.tunnelName}」`, tp.expTime))
  }, [pkg])

  const copyAddr = async (text: string, id: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id); setTimeout(()=>setCopied(null), 1500)
    } catch { toast('error','复制失败') }
  }

  const fmtInAddr = (ip: string, port: number) => {
    if (!ip || !port) return ''
    const ips = ip.split(',').map(s=>s.trim()).filter(Boolean)
    const fmt = (i: string) => i.includes(':') && !i.startsWith('[') ? `[${i}]:${port}` : `${i}:${port}`
    return ips.length===1 ? fmt(ips[0]) : `${fmt(ips[0])} (+${ips.length-1})`
  }

  // 转发管理动作
  const selectedTunnel = tunnels.find(t => t.id === form.tunnelId)
  const openAdd  = () => { setEditing(null); setForm({ ...initForm }); setModal(true) }
  const openEdit = (f: Forward) => {
    setEditing(f)
    setForm({ name: f.name, tunnelId: f.tunnelId, inPort: f.inPort != null ? String(f.inPort) : '', remoteAddr: f.remoteAddr, strategy: f.strategy || 'fifo' })
    setModal(true)
  }

  const saveFwd = async () => {
    if (!form.name)       { toast('error', '请填写转发名称'); return }
    if (!form.tunnelId)   { toast('error', '请选择隧道'); return }
    if (!form.remoteAddr) { toast('error', '请填写远程地址'); return }
    if (form.inPort !== '') {
      const p = parseInt(form.inPort)
      if (isNaN(p) || p < 1 || p > 65535) { toast('error', '端口须在 1–65535 之间'); return }
      if (selectedTunnel?.inNodePortSta && selectedTunnel?.inNodePortEnd) {
        if (p < selectedTunnel.inNodePortSta || p > selectedTunnel.inNodePortEnd) {
          toast('error', `端口须在隧道允许范围 ${selectedTunnel.inNodePortSta}–${selectedTunnel.inNodePortEnd} 内`); return
        }
      }
    }
    setSaving(true)
    try {
      const inPort = form.inPort !== '' ? parseInt(form.inPort) : undefined
      if (editing) {
        const r = await updateForward({ id: editing.id, userId: editing.userId || 0, name: form.name, tunnelId: form.tunnelId, remoteAddr: form.remoteAddr, strategy: form.strategy, inPort: inPort ?? null })
        if (r.data.code !== 0) { toast('error', r.data.msg || '更新失败'); return }
      } else {
        const r = await addForward({ name: form.name, tunnelId: form.tunnelId, remoteAddr: form.remoteAddr, strategy: form.strategy, inPort })
        if (r.data.code !== 0) { toast('error', r.data.msg || '创建失败'); return }
      }
      toast('success', editing ? '转发已更新' : '转发已创建')
      setModal(false); load()
    } catch (e: any) { toast('error', e.response?.data?.msg || '操作失败') }
    finally { setSaving(false) }
  }

  const delFwd = async (f: Forward) => {
    if (!confirm(`确认删除转发「${f.name}」？`)) return
    const r = await deleteForward(f.id).catch(() => null)
    if (r?.data.code === 0) { toast('success', '已删除'); load() }
    else toast('error', r?.data.msg || '删除失败')
  }

  const togglePause = async (f: Forward) => {
    try {
      const r = f.status === 1 ? await pauseForward(f.id) : await resumeForward(f.id)
      if (r.data.code === 0) { toast('success', f.status === 1 ? '已暂停' : '已恢复'); load() }
      else toast('error', r.data.msg || '操作失败')
    } catch { toast('error', '操作失败') }
  }

  const flowChart = Array.from({length:24},(_,i)=>{
    const d=new Date(); d.setHours(d.getHours()-23+i)
    const h = d.getHours().toString().padStart(2,'0')+':00'
    const flow = pkg?.statisticsFlows?.find((s:any)=>s.time===h)?.flow || 0
    return { time:h, flow }
  })

  const ui = pkg?.userInfo
  const hasTunnels = admin || (pkg && pkg.tunnelPermissions.length > 0)
  const usedFlow    = ((ui?.inFlow||0)+(ui?.outFlow||0)) / (1024**3)
  const flowUsedPct = pct(usedFlow, ui?.flow||0)
  const fwdUsedPct  = pct(forwards.length||0, ui?.num||0)

  return (
    <div style={{ animation:'fadeIn 0.3s ease' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:"'Sora',sans-serif", fontSize:22, fontWeight:700, color:'#e2e4f0', margin:0 }}>仪表盘</h1>
          <p style={{ color:'#6b7099', fontSize:13, marginTop:3 }}>{admin ? '系统总览' : '我的套餐'}</p>
        </div>
        <button className="btn-ghost btn-sm" onClick={load} style={{ display:'flex', alignItems:'center', gap:5 }}>
          <RefreshCw size={13}/> 刷新
        </button>
      </div>

      {loading ? <PageSpinner text="加载中"/> : (
        <>
          {/* ── 引导横幅 (无隧道权限时) ────────────────── */}
          {!admin && pkg && pkg.tunnelPermissions.length === 0 && (
            <div style={{ 
              marginBottom: 24, padding: '20px 24px', borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(6,182,212,0.1) 100%)',
              border: '1px solid rgba(99,102,241,0.2)',
              animation: 'fadeInUp 0.5s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>🚀</span>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>欢迎使用 Prism Panel</h3>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                检测到您目前尚未获得任何中转隧道授权，暂时无法创建转发规则。
                <br />
                请联系系统管理员为您 “分配隧道及流量资源” ，开启您的高速转发之旅。
              </p>
            </div>
          )}

          {/* ── 管理员统计卡 ─────────────────────── */}
          {admin && (
            <div style={{ 
              display:'grid', 
              gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', 
              gap:14, 
              marginBottom:24,
              width: '100%'
            }}>
              <StatCard icon={Server}         label="节点总数" color="#7c3aed" value={adminStats.nodes}   sub={`${adminStats.online} 在线`}/>
              <StatCard icon={GitBranch}      label="隧道总数" color="#06b6d4" value={adminStats.tunnels} sub={null}/>
              <StatCard icon={ArrowRightLeft} label="转发规则" color="#10b981" value={adminStats.forwards}sub={null}/>
              <StatCard icon={Users}          label="用户数量" color="#f59e0b" value={adminStats.users}  sub={null}/>
              <StatCard icon={Activity}       label="总已用流量" color="#f43f5e"
                value={formatBytes((ui?.inFlow||0)+(ui?.outFlow||0))} sub={null}/>
            </div>
          )}

          {/* ── 用户流量/转发概览 (普通用户) ────────────────── */}
          {!admin && ui && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14, marginBottom:24 }}>
              {/* 总流量 */}
              <div className="glass-card" style={{ borderRadius:14, padding:'16px 18px', opacity: hasTunnels ? 1 : 0.6 }}>
                <div style={{ fontSize:12, color:'#6b7099', marginBottom:6 }}>总流量</div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:20, fontWeight:700, color: hasTunnels ? '#e2e4f0' : '#6b7099' }}>
                  {hasTunnels ? fmtFlow(ui.flow) : '无'}
                </div>
              </div>
              {/* 已用流量 */}
              <div className="glass-card" style={{ borderRadius:14, padding:'16px 18px', opacity: hasTunnels ? 1 : 0.6 }}>
                <div style={{ fontSize:12, color:'#6b7099', marginBottom:4 }}>已用流量</div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:20, fontWeight:700, color: hasTunnels ? '#e2e4f0' : '#6b7099' }}>
                  {hasTunnels ? formatBytes((ui.inFlow||0)+(ui.outFlow||0)) : '无'}
                </div>
                {hasTunnels && <PBar value={usedFlow} max={ui.flow} unlimited={ui.flow===99999}/>}
                {hasTunnels && <div style={{ fontSize:11, color:'#6b7099', marginTop:4 }}>
                  {ui.flow===99999 ? '无限制' : `${flowUsedPct.toFixed(1)}%`}
                </div>}
              </div>
              {/* 转发配额 */}
              <div className="glass-card" style={{ borderRadius:14, padding:'16px 18px', opacity: hasTunnels ? 1 : 0.6 }}>
                <div style={{ fontSize:12, color:'#6b7099', marginBottom:6 }}>转发配额</div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:20, fontWeight:700, color: hasTunnels ? '#e2e4f0' : '#6b7099' }}>
                  {hasTunnels ? fmtNum(ui.num) : '无'}
                </div>
              </div>
              {/* 已用转发 */}
              <div className="glass-card" style={{ borderRadius:14, padding:'16px 18px', opacity: hasTunnels ? 1 : 0.6 }}>
                <div style={{ fontSize:12, color:'#6b7099', marginBottom:4 }}>已用转发</div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:20, fontWeight:700, color: hasTunnels ? '#e2e4f0' : '#6b7099' }}>
                  {hasTunnels ? forwards.length : '无'}
                </div>
                {hasTunnels && <PBar value={forwards.length||0} max={ui.num} unlimited={ui.num===99999}/>}
                {hasTunnels && <div style={{ fontSize:11, color:'#6b7099', marginTop:4 }}>
                  {ui.num===99999 ? '无限制' : `${fwdUsedPct.toFixed(1)}%`}
                </div>}
              </div>
            </div>
          )}

          {/* ── 流量趋势图 ────────────────────────── */}
          <div className="glass-card" style={{ borderRadius:14, padding:'20px 22px', marginBottom:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <h3 style={{ fontFamily:"'Sora',sans-serif", fontSize:14, fontWeight:600, color:'#e2e4f0', margin:0 }}>24小时流量统计</h3>
              </div>
              <span className="tag tag-violet">实时</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={flowChart} margin={{top:4,right:4,left:0,bottom:0}}>
                <defs>
                  <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{fill:'#6b7099',fontSize:10}} axisLine={{stroke:'#1e2133'}} tickLine={false}/>
                <YAxis tickFormatter={v=>formatBytes(v,0)} tick={{fill:'#6b7099',fontSize:9}} axisLine={false} tickLine={false} width={65}/>
                <Tooltip content={({active,payload,label}:any)=>{
                  if(!active||!payload?.length) return null
                  return <div style={{background:'#13151f',border:'1px solid #1e2133',borderRadius:8,padding:'7px 11px',fontSize:12}}>
                    <div style={{color:'#6b7099',marginBottom:3}}>{label}</div>
                    <div style={{color:'#a78bfa',fontFamily:"'JetBrains Mono',monospace"}}>{formatBytes(payload[0].value)}</div>
                  </div>
                }}/>
                <Area type="monotone" dataKey="flow" stroke="#7c3aed" strokeWidth={2}
                  fill="url(#fg)" dot={false} activeDot={{r:3,fill:'#a78bfa'}}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ── 转发管理 ──────────────────────────── */}
          <div style={{ marginBottom:24 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <h3 style={{ fontFamily:"'Sora',sans-serif", fontSize:14, fontWeight:600, color:'#e2e4f0', margin:0 }}>
                转发管理 <span style={{ fontSize:12, color:'#6b7099', fontWeight:400 }}>({forwards.length})</span>
              </h3>
              <button className="btn-primary btn-sm" onClick={openAdd} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <Plus size={13}/> 新增转发
              </button>
            </div>
            <div className="glass-card" style={{ borderRadius:14, overflow:'hidden' }}>
              {forwards.length === 0 ? (
                <div style={{ padding:48, textAlign:'center', color:'#6b7099' }}>
                  <ArrowRightLeft size={40} style={{ margin:'0 auto 12px', opacity:0.3 }}/>
                  <p style={{ margin:0 }}>暂无转发规则</p>
                </div>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table className="prism-table">
                    <thead><tr>
                      <th>名称</th><th>隧道</th><th>入口端口</th><th>远程地址</th><th>策略</th><th>流量 (入/出)</th><th>状态</th><th>操作</th>
                    </tr></thead>
                    <tbody>
                      {forwards.map(f => (
                        <tr key={f.id}>
                          <td>
                            <div style={{ fontWeight:600, color:'#e2e4f0', fontSize:13 }}>{f.name}</div>
                            <div className="mono" style={{ color:'#6b7099', fontSize:11 }}>#{f.id}</div>
                          </td>
                          <td><span style={{ fontSize:12, color:'#67e8f9' }}>{f.tunnelName || `隧道${f.tunnelId}`}</span></td>
                          <td><span className="mono" style={{ fontSize:12, color:'#a78bfa', fontWeight:600 }}>
                            {f.inPort != null ? f.inPort : <span style={{ color:'#6b7099' }}>自动</span>}
                          </span></td>
                          <td style={{ maxWidth:150 }}>
                            <div className="mono" style={{ fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={f.remoteAddr}>{f.remoteAddr}</div>
                          </td>
                          <td><span className="tag tag-cyan" style={{ fontSize:10 }}>{f.strategy || 'fifo'}</span></td>
                          <td>
                            <div className="mono" style={{ fontSize:10 }}>
                              <div style={{ color:'#a78bfa' }}>↑{formatBytes(f.inFlow||0)}</div>
                              <div style={{ color:'#67e8f9' }}>↓{formatBytes(f.outFlow||0)}</div>
                            </div>
                          </td>
                          <td>
                            <span className={`status-dot ${f.status===1?'status-online':'status-warn'}`} style={{ fontSize:11 }}>
                              {f.status===1?'运行中':'已暂停'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display:'flex', gap:5 }}>
                              <button className="btn-ghost btn-sm" onClick={()=>togglePause(f)} title={f.status===1?'暂停':'恢复'}>
                                {f.status===1?<Pause size={11}/>:<Play size={11}/>}
                              </button>
                              <button className="btn-ghost btn-sm" onClick={()=>openEdit(f)}><Pencil size={11}/></button>
                              <button className="btn-danger btn-sm" onClick={()=>delFwd(f)}><Trash2 size={11}/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── 隧道权限（普通用户）─────────────── */}
          {!admin && pkg && pkg.tunnelPermissions.length > 0 && (
            <div className="glass-card" style={{ borderRadius:14, padding:'20px 22px', marginBottom:24 }}>
              <h3 style={{ fontFamily:"'Sora',sans-serif", fontSize:14, fontWeight:600, color:'#e2e4f0', margin:'0 0 16px' }}>
                隧道权限 <span style={{ fontSize:12, color:'#6b7099', fontWeight:400 }}>({pkg.tunnelPermissions.length})</span>
              </h3>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {pkg.tunnelPermissions.map(tp => {
                  const used = ((tp.inFlow||0)+(tp.outFlow||0)) / (1024**3)
                  return (
                    <div key={tp.id} style={{ padding:'14px 16px', borderRadius:10,
                      background:'rgba(255,255,255,0.02)', border:'1px solid #1e2133' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                        <span style={{ fontWeight:600, color:'#e2e4f0', fontSize:13 }}>{tp.tunnelName}</span>
                        <div style={{ display:'flex', gap:6 }}>
                          <span className={`tag ${tp.tunnelFlow===1?'tag-cyan':'tag-amber'}`}>
                            {tp.tunnelFlow===1?'单向计费':'双向计费'}
                          </span>
                          <span className={`tag ${!tp.expTime||tp.expTime>Date.now()?'tag-emerald':'tag-rose'}`}>
                            {formatDate(tp.expTime)}
                          </span>
                        </div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, fontSize:12 }}>
                        {[['流量配额',fmtFlow(tp.flow)],['已用流量',formatBytes((tp.inFlow||0)+(tp.outFlow||0))],
                          ['转发配额',fmtNum(tp.num)],['已用转发',String(forwards.filter(f=>f.tunnelId===tp.tunnelId).length)]
                        ].map(([k,v])=>(
                          <div key={k}>
                            <div style={{ color:'#6b7099', marginBottom:3 }}>{k}</div>
                            <div style={{ fontWeight:600, color:'#c8cde8' }}>{v}</div>
                          </div>
                        ))}
                      </div>
                      <PBar value={used} max={tp.flow} unlimited={tp.flow===99999}/>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── 转发地址快捷复制（原 转发配置）─────────── */}
          {!admin && pkg && forwards.length > 0 && (
            <div className="glass-card" style={{ borderRadius:14, padding:'20px 22px' }}>
              <h3 style={{ fontFamily:"'Sora',sans-serif", fontSize:14, fontWeight:600, color:'#e2e4f0', margin:'0 0 16px' }}>
                转发地址快捷复制
              </h3>
              {/* 按隧道分组 */}
              {Object.entries(
                forwards.reduce((acc: Record<string,typeof forwards>, f) => {
                  const k = f.tunnelName||`隧道${f.tunnelId}`
                  ;(acc[k]||=[]).push(f); return acc
                }, {})
              ).map(([tname, fwds]) => (
                <div key={tname} style={{ marginBottom:16 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                    <span style={{ fontWeight:600, color:'#c8cde8', fontSize:13 }}>{tname}</span>
                    <span className="tag tag-violet">{fwds.length} 个地址</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:10 }}>
                    {fwds.map(f => {
                      const inAddr  = fmtInAddr(f.inIp||'', f.inPort||0)
                      return (
                        <div key={f.id} style={{ background:'rgba(255,255,255,0.02)',
                          border:'1px solid #1e2133', borderRadius:9, padding:'12px 14px' }}>
                          <div style={{ fontWeight:600, color:'#e2e4f0', fontSize:13, marginBottom:8,
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {f.name}
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <code style={{ flex:1, padding:'4px 8px', borderRadius:5, fontSize:11,
                              background:'rgba(16,185,129,0.1)', color:'#6ee7b7',
                              fontFamily:"'JetBrains Mono',monospace",
                              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
                              title={inAddr}>{inAddr||'—'}</code>
                            <button onClick={()=>copyAddr(inAddr, f.id)} style={{
                              background:'none', border:'none', cursor:'pointer',
                              color: copied===f.id ? '#10b981' : '#6b7099',
                              padding:2, display:'flex', alignItems:'center', flexShrink:0 }}>
                              {copied===f.id ? <Check size={12}/> : <Copy size={12}/>}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── 转发管理模态框 ──────────────────── */}
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <span className="modal-title">{editing?'编辑转发':'新增转发'}</span>
              <button onClick={()=>setModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#6b7099', padding:4 }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">转发名称 *</label>
                <input className="prism-input" placeholder="如：游戏加速" autoFocus
                  value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
              </div>
              <div className="form-row">
                <label className="form-label">选择隧道 *</label>
                {tunnels.length === 0 ? (
                  <div style={{ padding:'10px 12px', borderRadius:8, background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)', fontSize:12, color:'#fbbf24' }}>
                    ⚠️ 暂无可用隧道，请联系管理员分配隧道权限
                  </div>
                ) : (
                  <CustomSelect 
                    placeholder="— 选择隧道 —"
                    value={form.tunnelId}
                    options={tunnels.map(t => ({
                      label: `${t.name}（${t.type===2?'隧道':'端口'}）${t.inNodePortSta?` ${t.inNodePortSta}–${t.inNodePortEnd}`:''}`,
                      value: t.id
                    }))}
                    onChange={v => setForm(f => ({...f, tunnelId: v}))}
                  />
                )}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="form-row">
                  <label className="form-label">入口端口（可选）</label>
                  <input className="prism-input mono" placeholder="自动分配"
                    value={form.inPort} onChange={e=>setForm(f=>({...f,inPort:e.target.value}))}/>
                </div>
                <div className="form-row">
                  <label className="form-label">负载均衡策略</label>
                  <CustomSelect 
                    value={form.strategy}
                    options={[
                      { label: 'fifo (顺序)', value: 'fifo' },
                      { label: 'random (随机)', value: 'random' },
                      { label: 'round (轮询)', value: 'round' },
                      { label: 'hash (哈希)', value: 'hash' },
                    ]}
                    onChange={v => setForm(f => ({...f, strategy: v}))}
                  />
                </div>
              </div>
              <div className="form-row">
                <label className="form-label">远程地址 *（多个地址换行分隔）</label>
                <textarea className="prism-input" rows={3} placeholder={'192.168.1.100:8080\nexample.com:443'}
                  value={form.remoteAddr} onChange={e=>setForm(f=>({...f,remoteAddr:e.target.value}))}
                  style={{ resize:'vertical', fontFamily:"'JetBrains Mono',monospace", fontSize:12 }}/>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={()=>setModal(false)}>取消</button>
              <button className="btn-primary" onClick={saveFwd} disabled={saving||tunnels.length===0}>{saving?'保存中...':'保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
