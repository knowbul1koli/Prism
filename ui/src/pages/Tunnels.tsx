import { PageSpinner } from '../components/Spinner'
import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, GitBranch } from 'lucide-react'
import {
  getTunnels, getNodes, addTunnel, updateTunnel, deleteTunnel,
  type Tunnel, type Node,
} from '../api'
import { useToast } from '../store/toast'
import { CustomSelect } from '../components/CustomSelect'

const initForm = {
  name: '', type: 1, inNodeId: 0, outNodeId: 0,
  tcpListenAddr: '0.0.0.0', udpListenAddr: '0.0.0.0',
  protocol: 'tls', flow: 2, trafficRatio: 1.0,
}

export default function Tunnels() {
  const { toast } = useToast()
  const [tunnels, setTunnels] = useState<Tunnel[]>([])
  const [nodes,   setNodes]   = useState<Node[]>([])
  const [loading, setLoading] = useState(false)
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState<Tunnel | null>(null)
  const [form,    setForm]    = useState({ ...initForm })
  const [saving,  setSaving]  = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([getTunnels(), getNodes()])
      .then(([t, n]) => {
        if (t.data.code === 0) setTunnels(t.data.data)
        if (n.data.code === 0) setNodes(n.data.data)
      })
      .catch(() => toast('error', '加载数据失败'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const nodeName = (id?: number) => nodes.find(n => n.id === id)?.name || (id ? `节点${id}` : '—')

  const openAdd = () => { setEditing(null); setForm({ ...initForm }); setModal(true) }
  const openEdit = (t: Tunnel) => {
    setEditing(t)
    setForm({
      name: t.name, type: t.type, inNodeId: t.inNodeId, outNodeId: t.outNodeId ?? 0,
      tcpListenAddr: t.tcpListenAddr || '0.0.0.0', udpListenAddr: t.udpListenAddr || '0.0.0.0',
      protocol: t.protocol || 'tls', flow: t.flow, trafficRatio: Number(t.trafficRatio),
    })
    setModal(true)
  }

  const save = async () => {
    if (!form.name)     { toast('error', '请填写隧道名称'); return }
    if (!form.inNodeId) { toast('error', '请选择入口节点'); return }
    if (form.type === 2 && !form.outNodeId) { toast('error', '隧道转发模式请选择出口节点'); return }
    if (form.type === 2 && form.inNodeId === form.outNodeId) { toast('error', '入口和出口节点不能相同'); return }
    setSaving(true)
    try {
      if (editing) {
        // update 只能改：name, flow, trafficRatio, protocol, tcpListenAddr, udpListenAddr
        const r = await updateTunnel({
          id: editing.id, name: form.name, flow: form.flow,
          trafficRatio: form.trafficRatio, protocol: form.protocol,
          tcpListenAddr: form.tcpListenAddr, udpListenAddr: form.udpListenAddr,
        })
        if (r.data.code !== 0) { toast('error', r.data.msg || '更新失败'); return }
      } else {
        const r = await addTunnel({
          name: form.name, type: form.type, inNodeId: form.inNodeId,
          outNodeId: form.type === 1 ? null : form.outNodeId || null,
          flow: form.flow, trafficRatio: form.trafficRatio, protocol: form.protocol,
          tcpListenAddr: form.tcpListenAddr, udpListenAddr: form.udpListenAddr,
        })
        if (r.data.code !== 0) { toast('error', r.data.msg || '创建失败'); return }
      }
      toast('success', editing ? '隧道已更新' : '隧道已创建')
      setModal(false); load()
    } catch (e: any) { toast('error', e.response?.data?.msg || '操作失败') }
    finally { setSaving(false) }
  }

  const del = async (t: Tunnel) => {
    if (!confirm(`确认删除隧道「${t.name}」？`)) return
    const r = await deleteTunnel(t.id).catch(() => null)
    if (r?.data.code === 0) { toast('success', '已删除'); load() }
    else toast('error', r?.data.msg || '删除失败')
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 700, color: '#e2e4f0', margin: 0 }}>隧道管理</h1>
          <p style={{ color: '#6b7099', fontSize: 13, marginTop: 4 }}>共 {tunnels.length} 条隧道</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost btn-sm" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><RefreshCw size={13} /></button>
          <button className="btn-primary btn-sm" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={13} /> 新增隧道</button>
        </div>
      </div>

      <div className="glass-card" style={{ borderRadius: 14, overflow: 'hidden' }}>
        {loading ? <PageSpinner/> : tunnels.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#6b7099' }}>
              <GitBranch size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ margin: 0 }}>暂无隧道，点击「新增隧道」开始</p>
            </div>
          ) : (
            <table className="prism-table">
              <thead><tr>
                <th>隧道名称</th><th>类型</th><th>入口节点</th><th>出口节点</th>
                <th>监听地址</th><th>流量计费</th><th>倍率</th><th>操作</th>
              </tr></thead>
              <tbody>
                {tunnels.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#e2e4f0' }}>{t.name}</div>
                    </td>
                    <td><span className={`tag ${t.type === 2 ? 'tag-violet' : 'tag-cyan'}`}>{t.type === 2 ? '隧道转发' : '端口转发'}</span></td>
                    <td><span style={{ fontSize: 13 }}>{nodeName(t.inNodeId)}</span></td>
                    <td><span style={{ fontSize: 13, color: '#6b7099' }}>{t.type === 2 ? nodeName(t.outNodeId) : '—'}</span></td>
                    <td><span className="mono" style={{ fontSize: 12, color: '#6b7099' }}>{t.tcpListenAddr || '0.0.0.0'}</span></td>
                    <td><span className={`tag ${t.flow === 2 ? 'tag-amber' : 'tag-emerald'}`}>{t.flow === 2 ? '双向' : '单向'}</span></td>
                    <td><span className="mono" style={{ fontSize: 12, color: '#a78bfa' }}>×{Number(t.trafficRatio).toFixed(1)}</span></td>
                    <td><div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-ghost btn-sm" onClick={() => openEdit(t)} style={{ display: 'flex', alignItems: 'center' }}><Pencil size={12} /></button>
                      <button className="btn-danger btn-sm" onClick={() => del(t)} style={{ display: 'flex', alignItems: 'center' }}><Trash2 size={12} /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <span className="modal-title">{editing ? '编辑隧道' : '新增隧道'}</span>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7099', padding: 4 }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">隧道名称 *</label>
                <input className="prism-input" placeholder="如：香港→日本 隧道" autoFocus
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              {!editing && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-row">
                    <label className="form-label">隧道类型</label>
                    <CustomSelect
                      value={form.type}
                      options={[
                        { label: '端口转发 (单节点)', value: 1 },
                        { label: '隧道转发 (多级)', value: 2 },
                      ]}
                      onChange={v => setForm(f => ({ ...f, type: v, outNodeId: 0 }))}
                    />
                  </div>
                  <div className="form-row">
                    <label className="form-label">流量计算</label>
                    <CustomSelect
                      value={form.flow}
                      options={[
                        { label: '双向 (上传+下载)', value: 2 },
                        { label: '单向 (仅上传)', value: 1 },
                      ]}
                      onChange={v => setForm(f => ({ ...f, flow: v }))}
                    />
                  </div>
                </div>
              )}
              {editing && (
                <div className="form-row">
                  <label className="form-label">流量计算</label>
                  <CustomSelect
                    value={form.flow}
                    options={[
                      { label: '双向 (上传+下载)', value: 2 },
                      { label: '单向 (仅上传)', value: 1 },
                    ]}
                    onChange={v => setForm(f => ({ ...f, flow: v }))}
                  />
                </div>
              )}
              {!editing && (
                <div style={{ display: 'grid', gridTemplateColumns: form.type === 2 ? '1fr 1fr' : '1fr', gap: 12 }}>
                  <div className="form-row">
                    <label className="form-label">入口节点 *</label>
                    <CustomSelect
                      placeholder="— 选择节点 —"
                      value={form.inNodeId}
                      options={nodes.map(n => ({ label: `${n.name} ${n.status === 1 ? '🟢' : '⚫'}`, value: n.id }))}
                      onChange={v => setForm(f => ({ ...f, inNodeId: v }))}
                    />
                  </div>
                  {form.type === 2 && (
                    <div className="form-row">
                      <label className="form-label">出口节点 *</label>
                      <CustomSelect
                        placeholder="— 选择节点 —"
                        value={form.outNodeId}
                        options={nodes.filter(n => n.id !== form.inNodeId).map(n => ({ label: `${n.name} ${n.status === 1 ? '🟢' : '⚫'}`, value: n.id }))}
                        onChange={v => setForm(f => ({ ...f, outNodeId: v }))}
                      />
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-row">
                  <label className="form-label">TCP 监听地址</label>
                  <input className="prism-input mono" placeholder="0.0.0.0 或 [::]"
                    value={form.tcpListenAddr} onChange={e => setForm(f => ({ ...f, tcpListenAddr: e.target.value }))} />
                </div>
                <div className="form-row">
                  <label className="form-label">UDP 监听地址</label>
                  <input className="prism-input mono" placeholder="0.0.0.0 或 [::]"
                    value={form.udpListenAddr} onChange={e => setForm(f => ({ ...f, udpListenAddr: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {(form.type === 2 || editing?.type === 2) && (
                  <div className="form-row">
                    <label className="form-label">协议类型</label>
                    <CustomSelect
                      value={form.protocol}
                      options={[
                        { label: 'TLS (推荐)', value: 'tls' },
                        { label: 'TCP', value: 'tcp' },
                        { label: 'UDP', value: 'udp' },
                      ]}
                      onChange={v => setForm(f => ({ ...f, protocol: v }))}
                    />
                  </div>
                )}
                <div className="form-row">
                  <label className="form-label">流量倍率（0.1~100）</label>
                  <input className="prism-input" type="number" step="0.1" min="0.1" max="100"
                    value={form.trafficRatio} onChange={e => setForm(f => ({ ...f, trafficRatio: +e.target.value }))} />
                </div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 8,
                background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)',
                fontSize: 12, color: '#6b7099' }}>
                💡 监听地址：纯 IPv4 填 <code style={{ color: '#67e8f9' }}>0.0.0.0</code>，支持 IPv6 填 <code style={{ color: '#67e8f9' }}>[::] </code>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setModal(false)}>取消</button>
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
