import { PageSpinner } from '../components/Spinner'
import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, ArrowRightLeft, Pause, Play } from 'lucide-react'
import {
  getForwards, addForward, updateForward, deleteForward,
  pauseForward, resumeForward,
  getUserTunnelOptions,
  formatBytes,
  type Forward, type TunnelListItem,
} from '../api'
import { useToast } from '../store/toast'
import { CustomSelect } from '../components/CustomSelect'

const initForm = { name: '', tunnelId: 0, inPort: '' as string, remoteAddr: '', strategy: 'fifo' }

export default function Forwards() {
  const { toast } = useToast()
  const [forwards, setForwards] = useState<Forward[]>([])
  const [tunnels,  setTunnels]  = useState<TunnelListItem[]>([])
  const [loading,  setLoading]  = useState(false)
  const [modal,    setModal]    = useState(false)
  const [editing,  setEditing]  = useState<Forward | null>(null)
  const [form,     setForm]     = useState({ ...initForm })
  const [saving,   setSaving]   = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([getForwards(), getUserTunnelOptions()])
      .then(([f, t]) => {
        if (f.data.code === 0) setForwards(f.data.data)
        if (t.data.code === 0) setTunnels(t.data.data)
      })
      .catch(() => toast('error', '加载数据失败'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const selected = tunnels.find(t => t.id === form.tunnelId)

  const openAdd  = () => { setEditing(null); setForm({ ...initForm }); setModal(true) }
  const openEdit = (f: Forward) => {
    setEditing(f)
    setForm({ name: f.name, tunnelId: f.tunnelId, inPort: f.inPort != null ? String(f.inPort) : '', remoteAddr: f.remoteAddr, strategy: f.strategy || 'fifo' })
    setModal(true)
  }

  const save = async () => {
    if (!form.name)       { toast('error', '请填写转发名称'); return }
    if (!form.tunnelId)   { toast('error', '请选择隧道'); return }
    if (!form.remoteAddr) { toast('error', '请填写远程地址'); return }
    if (form.inPort !== '') {
      const p = parseInt(form.inPort)
      if (isNaN(p) || p < 1 || p > 65535) { toast('error', '端口须在 1–65535 之间'); return }
      if (selected?.inNodePortSta && selected?.inNodePortEnd) {
        if (p < selected.inNodePortSta || p > selected.inNodePortEnd) {
          toast('error', `端口须在隧道允许范围 ${selected.inNodePortSta}–${selected.inNodePortEnd} 内`); return
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

  const del = async (f: Forward) => {
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

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:"'Sora',sans-serif", fontSize:22, fontWeight:700, color:'#e2e4f0', margin:0 }}>转发管理</h1>
          <p style={{ color:'#6b7099', fontSize:13, marginTop:4 }}>共 {forwards.length} 条转发规则</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-ghost btn-sm" onClick={load} style={{ display:'flex', alignItems:'center', gap:5 }}><RefreshCw size={13}/></button>
          <button className="btn-primary btn-sm" onClick={openAdd} style={{ display:'flex', alignItems:'center', gap:6 }}><Plus size={13}/> 新增转发</button>
        </div>
      </div>

      <div className="glass-card" style={{ borderRadius:14, overflow:'hidden' }}>
        {loading ? <PageSpinner/> : forwards.length === 0 ? (
            <div style={{ padding:48, textAlign:'center', color:'#6b7099' }}>
              <ArrowRightLeft size={40} style={{ margin:'0 auto 12px', opacity:0.3 }}/>
              <p style={{ margin:0 }}>暂无转发规则</p>
            </div>
          ) : (
            <table className="prism-table">
              <thead><tr>
                <th>名称</th><th>隧道</th><th>入口端口</th><th>远程地址</th><th>策略</th><th>流量 (入/出)</th><th>状态</th><th>操作</th>
              </tr></thead>
              <tbody>
                {forwards.map(f => (
                  <tr key={f.id}>
                    <td>
                      <div style={{ fontWeight:600, color:'#e2e4f0' }}>{f.name}</div>
                    </td>
                    <td><span style={{ fontSize:13, color:'#67e8f9' }}>{f.tunnelName || `隧道${f.tunnelId}`}</span></td>
                    <td><span className="mono" style={{ fontSize:13, color:'#a78bfa', fontWeight:600 }}>
                      {f.inPort != null ? f.inPort : <span style={{ color:'#6b7099' }}>自动</span>}
                    </span></td>
                    <td style={{ maxWidth:180 }}>
                      <div className="mono" style={{ fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={f.remoteAddr}>{f.remoteAddr}</div>
                    </td>
                    <td><span className="tag tag-cyan">{f.strategy || 'fifo'}</span></td>
                    <td>
                      <div className="mono" style={{ fontSize:11 }}>
                        <span style={{ color:'#a78bfa' }}>↑{formatBytes(f.inFlow||0)}</span>
                        <span style={{ color:'#6b7099' }}> / </span>
                        <span style={{ color:'#67e8f9' }}>↓{formatBytes(f.outFlow||0)}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-dot ${f.status===1?'status-online':'status-warn'}`}>
                        {f.status===1?'运行中':'已暂停'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:5 }}>
                        <button className="btn-ghost btn-sm" onClick={()=>togglePause(f)} title={f.status===1?'暂停':'恢复'} style={{ display:'flex', alignItems:'center' }}>
                          {f.status===1?<Pause size={11}/>:<Play size={11}/>}
                        </button>
                        <button className="btn-ghost btn-sm" onClick={()=>openEdit(f)} style={{ display:'flex', alignItems:'center' }}><Pencil size={11}/></button>
                        <button className="btn-danger btn-sm" onClick={()=>del(f)} style={{ display:'flex', alignItems:'center' }}><Trash2 size={11}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

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
              <div style={{ display:'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-row">
                  <label className="form-label">入口端口 (可选)</label>
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
              <button className="btn-primary" onClick={save} disabled={saving||tunnels.length===0}>{saving?'保存中...':'保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
