import { PageSpinner } from '../components/Spinner'
import React, { useEffect, useState } from 'react'
import { Plus, Trash2, RefreshCw, Gauge, Pencil, Check, X, AlertCircle } from 'lucide-react'
import {
  getSpeedRules, getTunnels, addSpeedRule, updateSpeedRule, deleteSpeedRule,
  type SpeedRule, type Tunnel,
} from '../api'
import { useToast } from '../store/toast'
import { CustomSelect } from '../components/CustomSelect'

// SpeedLimitDto: name(必填), speed(必填,>=1), tunnelId(必填), tunnelName(必填)
const initForm = { name: '', speed: 100, tunnelId: 0, tunnelName: '' }

export default function Speed() {
  const { toast } = useToast()
  const [rules,   setRules]   = useState<SpeedRule[]>([])
  const [tunnels, setTunnels] = useState<Tunnel[]>([])
  const [loading, setLoading] = useState(false)
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState<SpeedRule | null>(null)
  const [form,    setForm]    = useState({ ...initForm })
  const [saving,  setSaving]  = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([getSpeedRules(), getTunnels()])
      .then(([r, t]) => {
        if (r.data.code === 0) setRules(r.data.data)
        if (t.data.code === 0) setTunnels(t.data.data)
      })
      .catch(() => toast('error', '加载失败'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  // 选隧道时同步 tunnelName
  const selectTunnel = (id: number) => {
    const t = tunnels.find(t => t.id === id)
    setForm(f => ({ ...f, tunnelId: id, tunnelName: t?.name || '' }))
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ ...initForm })
    setModal(true)
  }

  const openEdit = (r: SpeedRule) => {
    setEditing(r)
    setForm({ name: r.name, speed: r.speed, tunnelId: r.tunnelId, tunnelName: r.tunnelName })
    setModal(true)
  }

  const save = async () => {
    if (!form.name)     { toast('error', '请填写规则名称'); return }
    if (!form.speed)    { toast('error', '请填写速度限制'); return }
    if (!form.tunnelId) { toast('error', '请选择绑定隧道'); return }
    setSaving(true)
    try {
      if (editing) {
        // 后端接口 update 可能需要 id 和其他字段
        const r = await updateSpeedRule({
          id: editing.id,
          name: form.name, speed: form.speed,
          tunnelId: form.tunnelId, tunnelName: form.tunnelName,
        })
        if (r.data.code !== 0) { toast('error', r.data.msg || '更新失败'); return }
        toast('success', '限速规则已更新')
      } else {
        const r = await addSpeedRule({
          name: form.name, speed: form.speed,
          tunnelId: form.tunnelId, tunnelName: form.tunnelName,
        })
        if (r.data.code !== 0) { toast('error', r.data.msg || '创建失败'); return }
        toast('success', '限速规则已创建')
      }
      setModal(false); load()
    } catch (e: any) {
      toast('error', e.response?.data?.msg || '操作失败')
    } finally { setSaving(false) }
  }

  const del = async (r: SpeedRule) => {
    if (!confirm(`确认删除「${r.name}」？`)) return
    const res = await deleteSpeedRule(r.id).catch(() => null)
    if (res?.data.code === 0) { toast('success', '已删除'); load() }
    else toast('error', res?.data.msg || '删除失败')
  }

  const speedLabel = (s: number) => s >= 1000 ? `${(s / 1000).toFixed(1)} Gbps` : `${s} Mbps`

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 700, color: '#e2e4f0', margin: 0 }}>限速规则</h1>
          <p style={{ color: '#6b7099', fontSize: 13, marginTop: 4 }}>配置转发带宽上限 · 实时生效</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost btn-sm" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn-primary btn-sm" onClick={openAdd}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={13} /> 新增限速</button>
        </div>
      </div>

      <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <AlertCircle size={16} color="#60a5fa" />
        <p style={{ fontSize: 12, color: '#93c5fd', margin: 0 }}>提示：限速规则创建后，需在「用户管理 → 权限分配」中为特定用户绑定后方可生效。</p>
      </div>

      {loading ? <PageSpinner text="加载中"/> : rules.length === 0 ? (
        <div className="glass-card" style={{ borderRadius: 14, padding: 48, textAlign: 'center', color: '#6b7099' }}>
          <Gauge size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} /><p style={{ margin: 0 }}>暂无限速规则</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px, 1fr))', gap: 16 }}>
          {rules.map(r => (
            <div key={r.id} className="glass-card" style={{ borderRadius: 14, padding: '20px 22px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, position: 'relative', zIndex: 1 }}>
                <div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 600, color: '#e2e4f0' }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: '#6b7099', marginTop: 3 }}>
                    绑定: <span style={{ color: '#818cf8' }}>{r.tunnelName || `隧道${r.tunnelId}`}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                   <button className="btn-ghost btn-sm" onClick={() => openEdit(r)} style={{ padding: 4 }}><Pencil size={12} /></button>
                   <button className="btn-danger btn-sm" onClick={() => del(r)} style={{ padding: 4 }}><Trash2 size={12} /></button>
                </div>
              </div>
              <div style={{ textAlign: 'center', margin: '20px 0', position: 'relative', zIndex: 1 }}>
                <div style={{
                  fontFamily: "'Sora',sans-serif", fontSize: 32, fontWeight: 800,
                  background: 'linear-gradient(135deg,#a78bfa,#22d3ee)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.02em'
                }}>{speedLabel(r.speed)}</div>
                <div style={{ fontSize: 10, color: '#6b7099', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Max Bandwidth</div>
              </div>
              <div className="progress-bar" style={{ height: 6, background: 'rgba(255,255,255,0.03)' }}>
                <div className="progress-fill" style={{ 
                  width: `${Math.min(100, (r.speed / 1000) * 100)}%`,
                  background: 'linear-gradient(90deg, #7c3aed, #06b6d4)',
                  boxShadow: '0 0 10px rgba(124,58,237,0.3)'
                }} />
              </div>
              {/* 背景装饰 */}
              <div style={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.03 }}>
                <Gauge size={100} />
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box" style={{ maxWidth: 420, animation: 'slideUp 0.2s ease' }}>
            <div className="modal-header">
              <span className="modal-title">{editing ? '编辑限速规则' : '新增限速规则'}</span>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7099', padding: 4 }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">规则名称 *</label>
                <input className="prism-input" placeholder="如：VIP 线路 500M 限速"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-row">
                <label className="form-label">关联隧道 *</label>
                <CustomSelect
                  placeholder="— 选择隧道 —"
                  value={form.tunnelId}
                  options={tunnels.map(t => ({ label: `${t.name} (${t.type === 2 ? '隧道' : '端口'})`, value: t.id }))}
                  onChange={v => selectTunnel(v)}
                />
                <p style={{ fontSize: 11, color: '#6b7099', marginTop: 4 }}>规则必须绑定在特定隧道上才能正确应用 Ratelimit 参数。</p>
              </div>
              <div className="form-row">
                <label className="form-label">带宽限制 (Mbps) *</label>
                <div style={{ position: 'relative' }}>
                  <input className="prism-input mono" type="number" min={1} placeholder="100"
                    value={form.speed} onChange={e => setForm(f => ({ ...f, speed: +e.target.value }))} style={{ paddingRight: 60 }} />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7099', fontSize: 12 }}>Mbps</span>
                </div>
                {form.speed > 0 && <p style={{ fontSize: 11, color: '#a78bfa', marginTop: 6, fontWeight: 500 }}>当前限制: {speedLabel(form.speed)}</p>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setModal(false)}>取消</button>
              <button className="btn-primary" onClick={save} disabled={saving}>
                {saving ? '保存中...' : (editing ? '保存修改' : '创建规则')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

