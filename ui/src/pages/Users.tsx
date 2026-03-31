import { PageSpinner } from '../components/Spinner'
import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, Users as UsersIcon, Shield, Eye, EyeOff, RotateCcw, X } from 'lucide-react'
import {
  getUsers, addUser, updateUser, deleteUser,
  getUserTunnels, assignUserTunnel, removeUserTunnel, updateUserTunnel,
  getTunnels, getSpeedRules, resetFlow,
  formatGB, formatBytes, formatDate,
  userStatusLabel, userStatusOnline,
  type User, type UserTunnel, type Tunnel, type SpeedRule
} from '../api'
import { useToast } from '../store/toast'
import { CustomSelect } from '../components/CustomSelect'
import { ConfirmModal } from '../components/ConfirmModal'

// User.status: 1=正常 0=禁用
const initForm = { user: '', pwd: '', status: 1, flow: 100, num: 10, expTime: 0, flowResetTime: 0 }
const initAssign = { tunnelId: 0, flow: 100, num: 10, flowResetTime: 0, expTime: 0, speedId: null as number | null }

// 流量重置日期选项
const RESET_OPTIONS = [
  { label: '不重置', value: 0 },
  ...Array.from({ length: 31 }, (_, i) => ({ label: `每月 ${i + 1} 日`, value: i + 1 }))
]

export default function Users() {
  const { toast } = useToast()
  const [users,      setUsers]      = useState<User[]>([])
  const [tunnels,    setTunnels]    = useState<Tunnel[]>([])
  const [speedRules, setSpeedRules] = useState<SpeedRule[]>([])
  const [loading,    setLoading]    = useState(false)

  // 新增/编辑用户弹窗
  const [modal,      setModal]      = useState(false)
  const [editing,    setEditing]    = useState<User | null>(null)
  const [form,       setForm]       = useState({ ...initForm })
  const [expStr,     setExpStr]     = useState('')
  const [showPwd,    setShowPwd]    = useState(false)
  const [saving,     setSaving]     = useState(false)

  // 权限管理弹窗
  const [tModal,     setTModal]     = useState(false)
  const [tgtUser,    setTgtUser]    = useState<User | null>(null)
  const [utList,     setUtList]     = useState<UserTunnel[]>([])
  const [utLoading,  setUtLoading]  = useState(false)
  const [assign,     setAssign]     = useState({ ...initAssign })
  const [assignExpStr, setAssignExpStr] = useState('')
  const [assigning,  setAssigning]  = useState(false)

  // 编辑已有权限
  const [editUt,     setEditUt]     = useState<UserTunnel | null>(null)
  const [editForm,   setEditForm]   = useState({ flow: 0, num: 0, flowResetTime: 0, expTime: 0, status: 1, speedId: null as number | null })
  const [editExpStr, setEditExpStr] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // 重置流量确认弹窗
  const [resetModal, setResetModal] = useState(false)
  const [resetTarget, setResetTarget] = useState<User | null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([getUsers(), getTunnels(), getSpeedRules()])
      .then(([u, t, s]) => {
        if (u.data.code === 0) setUsers(u.data.data)
        if (t.data.code === 0) setTunnels(t.data.data)
        if (s.data.code === 0) setSpeedRules(s.data.data)
      })
      .catch(() => toast('error', '加载数据失败'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const dateToTs = (s: string) => s ? new Date(s).getTime() : 0

  // ── 用户 CRUD ─────────────────────────────────────
  const openAdd = () => { setEditing(null); setForm({ ...initForm }); setExpStr(''); setShowPwd(false); setModal(true) }
  const openEdit = (u: User) => {
    setEditing(u)
    setForm({ user: u.user, pwd: '', status: u.status, flow: u.flow, num: u.num, expTime: u.expTime || 0, flowResetTime: u.flowResetTime || 0 })
    setExpStr(u.expTime ? new Date(u.expTime).toISOString().split('T')[0] : '')
    setShowPwd(false); setModal(true)
  }

  const save = async () => {
    if (!form.user) { toast('error', '请填写用户名'); return }
    if (!editing && !form.pwd) { toast('error', '请填写密码'); return }
    setSaving(true)
    try {
      const expTime = dateToTs(expStr)
      if (editing) {
        const payload: any = { id: editing.id, user: form.user, flow: form.flow, num: form.num, expTime, flowResetTime: form.flowResetTime, status: form.status }
        if (form.pwd) payload.pwd = form.pwd
        const r = await updateUser(payload)
        if (r.data.code !== 0) { toast('error', r.data.msg || '更新失败'); return }
      } else {
        const r = await addUser({ user: form.user, pwd: form.pwd, flow: form.flow, num: form.num, expTime, flowResetTime: form.flowResetTime, status: form.status })
        if (r.data.code !== 0) { toast('error', r.data.msg || '创建失败'); return }
      }
      toast('success', editing ? '用户已更新' : '用户已创建')
      setModal(false); load()
    } catch (e: any) { toast('error', e.response?.data?.msg || '操作失败') }
    finally { setSaving(false) }
  }

  const del = async (u: User) => {
    if (!confirm(`确认删除用户「${u.user}」？此操作不可恢复。`)) return
    const r = await deleteUser(u.id).catch(() => null)
    if (r?.data.code === 0) { toast('success', '已删除'); load() }
    else toast('error', r?.data.msg || '删除失败')
  }

  // ── 权限弹窗 ──────────────────────────────────────
  const refreshUtList = async (uid: number) => {
    setUtLoading(true)
    const r = await getUserTunnels(uid).catch(() => null)
    setUtList(r?.data.code === 0 ? r.data.data : [])
    setUtLoading(false)
  }

  const openTModal = async (u: User) => {
    setTgtUser(u); setAssign({ ...initAssign }); setAssignExpStr('')
    setEditUt(null); setTModal(true)
    await refreshUtList(u.id)
  }

  const doAssign = async () => {
    if (!assign.tunnelId || !tgtUser) { toast('error', '请选择隧道'); return }
    setAssigning(true)
    try {
      const r = await assignUserTunnel({
        userId: tgtUser.id, tunnelId: assign.tunnelId,
        flow: assign.flow, num: assign.num,
        flowResetTime: assign.flowResetTime, expTime: dateToTs(assignExpStr),
        speedId: assign.speedId,
      })
      if (r.data.code !== 0) { toast('error', r.data.msg || '分配失败'); return }
      toast('success', '权限已分配')
      setAssign({ ...initAssign }); setAssignExpStr('')
      await refreshUtList(tgtUser.id)
    } catch { toast('error', '分配失败') }
    finally { setAssigning(false) }
  }

  const doRemove = async (ut: UserTunnel) => {
    if (!confirm(`确认移除隧道「${tunnels.find(t => t.id === ut.tunnelId)?.name || ut.tunnelId}」的权限？`)) return
    const r = await removeUserTunnel(ut.id).catch(() => null)
    if (r?.data.code === 0 && tgtUser) { toast('success', '已移除'); await refreshUtList(tgtUser.id) }
    else toast('error', r?.data.msg || '移除失败')
  }

  const openEditUt = (ut: UserTunnel) => {
    setEditUt(ut)
    setEditForm({ flow: ut.flow, num: ut.num, flowResetTime: ut.flowResetTime || 0, expTime: ut.expTime || 0, status: ut.status ?? 1, speedId: ut.speedId ?? null })
    setEditExpStr(ut.expTime ? new Date(ut.expTime).toISOString().split('T')[0] : '')
  }

  const saveEditUt = async () => {
    if (!editUt) return
    setEditSaving(true)
    try {
      const r = await updateUserTunnel({
        id: editUt.id, flow: editForm.flow, num: editForm.num,
        flowResetTime: editForm.flowResetTime, expTime: dateToTs(editExpStr),
        status: editForm.status, speedId: editForm.speedId,
      })
      if (r.data.code !== 0) { toast('error', r.data.msg || '更新失败'); return }
      toast('success', '权限已更新'); setEditUt(null)
      if (tgtUser) await refreshUtList(tgtUser.id)
    } catch { toast('error', '更新失败') }
    finally { setEditSaving(false) }
  }

  const doResetFlow = async (u: User) => {
    setResetTarget(u)
    setResetModal(true)
  }

  const confirmResetFlow = async () => {
    if (!resetTarget) return
    const r = await resetFlow(resetTarget.id, 1).catch(() => null)
    if (r?.data.code === 0) { toast('success', '流量已重置'); load() }
    else toast('error', r?.data.msg || '重置失败')
  }

  const tunnelName = (id: number) => tunnels.find(t => t.id === id)?.name || `隧道${id}`

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 700, color: '#e2e4f0', margin: 0 }}>用户管理</h1>
          <p style={{ color: '#6b7099', fontSize: 13, marginTop: 4 }}>共 {users.length} 个用户</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost btn-sm" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn-primary btn-sm" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={13} /> 新增用户</button>
        </div>
      </div>

      <div className="glass-card" style={{ borderRadius: 14, overflow: 'hidden' }}>
        {loading ? <PageSpinner/> : users.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#6b7099' }}>
              <UsersIcon size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} /><p style={{ margin: 0 }}>暂无用户</p>
            </div>
          ) : (
            <table className="prism-table">
              <thead><tr>
                <th>用户名</th><th>流量配额</th><th>已用流量</th><th>转发数</th><th>到期时间</th><th>状态</th><th>操作</th>
              </tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                          background: 'linear-gradient(135deg,#6366f1,#0ea5e9)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, color: '#fff' }}>
                          {u.user[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#e2e4f0', fontSize: 13 }}>{u.user}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="mono" style={{ fontSize: 12 }}>{formatGB(u.flow)}</span></td>
                    <td><span className="mono" style={{ fontSize: 12, color: '#6ee7b7' }}>{formatBytes((u.inFlow || 0) + (u.outFlow || 0))}</span></td>
                    <td><span className="mono" style={{ fontSize: 13 }}>{u.num}</span></td>
                    <td><span style={{ fontSize: 12, color: '#6b7099' }}>{formatDate(u.expTime)}</span></td>
                    <td>
                      <span className={`status-dot ${userStatusOnline(u.status) ? 'status-online' : 'status-offline'}`}>
                        {userStatusLabel(u.status)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        {/* 权限分配 — 最显眼 */}
                        <button onClick={() => openTModal(u)} style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 11px', borderRadius: 7, border: 'none', cursor: 'pointer',
                          background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
                          fontSize: 12, fontWeight: 500, fontFamily: "'DM Sans',sans-serif",
                          whiteSpace: 'nowrap', transition: 'background 0.15s',
                        }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.28)'}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.15)'}>
                          <Shield size={12} /> 权限分配
                        </button>
                        {/* 重置流量 */}
                        <button onClick={() => doResetFlow(u)} title="重置账号流量" style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '5px 9px', borderRadius: 7, border: 'none', cursor: 'pointer',
                          background: 'rgba(245,158,11,0.12)', color: '#fbbf24',
                          fontSize: 12, fontWeight: 500, fontFamily: "'DM Sans',sans-serif",
                          whiteSpace: 'nowrap', transition: 'background 0.15s',
                        }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,158,11,0.25)'}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,158,11,0.12)'}>
                          <RotateCcw size={11} /> 重置流量
                        </button>
                        <button className="btn-ghost btn-sm" onClick={() => openEdit(u)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Pencil size={11} /></button>
                        <button className="btn-danger btn-sm" onClick={() => del(u)} style={{ display: 'flex', alignItems: 'center' }}><Trash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {/* ── 新增/编辑用户 ─────────────────────────────── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <span className="modal-title">{editing ? '编辑用户' : '新增用户'}</span>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7099', padding: 4 }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">用户名 *</label>
                <input className="prism-input" placeholder="登录用户名" autoFocus
                  value={form.user} onChange={e => setForm(f => ({ ...f, user: e.target.value }))} />
              </div>
              <div className="form-row">
                <label className="form-label">密码{editing ? '（留空不修改）' : ' *'}</label>
                <div style={{ position: 'relative' }}>
                  <input className="prism-input" type={showPwd ? 'text' : 'password'}
                    placeholder={editing ? '留空不修改' : '登录密码'} value={form.pwd}
                    onChange={e => setForm(f => ({ ...f, pwd: e.target.value }))} style={{ paddingRight: 38 }} />
                  <button type="button" onClick={() => setShowPwd(p => !p)} style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#6b7099', padding: 0, display: 'flex' }}>
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-row">
                  <label className="form-label">流量配额 (GB)</label>
                  <input className="prism-input" type="number" min={0}
                    value={form.flow} onChange={e => setForm(f => ({ ...f, flow: +e.target.value }))} />
                </div>
                <div className="form-row">
                  <label className="form-label">转发数量上限</label>
                  <input className="prism-input" type="number" min={0}
                    value={form.num} onChange={e => setForm(f => ({ ...f, num: +e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-row">
                  <label className="form-label">到期时间（留空=永久）</label>
                  <input className="prism-input" type="date" value={expStr} onChange={e => setExpStr(e.target.value)} />
                </div>
                <div className="form-row">
                  <label className="form-label">流量重置日期</label>
                  <CustomSelect
                    value={form.flowResetTime}
                    options={RESET_OPTIONS}
                    onChange={v => setForm(f => ({ ...f, flowResetTime: v }))}
                  />
                </div>
              </div>
              <div className="form-row">
                <label className="form-label">状态</label>
                <CustomSelect
                  value={form.status}
                  options={[
                    { label: '正常', value: 1 },
                    { label: '禁用', value: 0 },
                  ]}
                  onChange={v => setForm(f => ({ ...f, status: v }))}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setModal(false)}>取消</button>
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 权限分配弹窗 ──────────────────────────────── */}
      {tModal && tgtUser && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && (setTModal(false), setEditUt(null))}>
          <div className="modal-box" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <span className="modal-title"><Shield size={14} style={{ marginRight: 7, verticalAlign: 'middle' }} />权限分配 · {tgtUser.user}</span>
              <button onClick={() => { setTModal(false); setEditUt(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7099', padding: 4 }}><X size={16} /></button>
            </div>
            <div className="modal-body">

              {/* ── 分配新权限 ── */}
              <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '16px', marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#a5b4fc', marginBottom: 14 }}>分配新隧道权限</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-row">
                    <label className="form-label">选择隧道 *</label>
                    <CustomSelect
                      placeholder="— 选择隧道 —"
                      value={assign.tunnelId}
                      options={tunnels.map(t => ({ label: t.name, value: t.id }))}
                      onChange={v => setAssign(a => ({ ...a, tunnelId: v }))}
                    />
                  </div>
                  <div className="form-row">
                    <label className="form-label">限速规则</label>
                    <CustomSelect
                      value={assign.speedId ?? ''}
                      options={[
                        { label: '不限速', value: '' },
                        ...speedRules.map(s => ({ label: `${s.name} (${s.speed} Mbps)`, value: s.id }))
                      ]}
                      onChange={v => setAssign(a => ({ ...a, speedId: v === '' ? null : v }))}
                    />
                  </div>
                  <div className="form-row">
                    <label className="form-label">流量配额 (GB)</label>
                    <input className="prism-input" type="number" min={0}
                      value={assign.flow} onChange={e => setAssign(a => ({ ...a, flow: +e.target.value }))} />
                  </div>
                  <div className="form-row">
                    <label className="form-label">转发数量上限</label>
                    <input className="prism-input" type="number" min={0}
                      value={assign.num} onChange={e => setAssign(a => ({ ...a, num: +e.target.value }))} />
                  </div>
                  <div className="form-row">
                    <label className="form-label">到期时间（留空=永久）</label>
                    <input className="prism-input" type="date" value={assignExpStr} onChange={e => setAssignExpStr(e.target.value)} />
                  </div>
                  <div className="form-row">
                    <label className="form-label">流量重置日期</label>
                    <CustomSelect
                      value={assign.flowResetTime}
                      options={RESET_OPTIONS}
                      onChange={v => setAssign(a => ({ ...a, flowResetTime: v }))}
                    />
                  </div>
                </div>
                <button onClick={doAssign} disabled={assigning} style={{
                  marginTop: 14, display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                  color: '#fff', fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans',sans-serif",
                  opacity: assigning ? 0.7 : 1,
                }}>
                  <Plus size={13} /> {assigning ? '分配中...' : '确认分配'}
                </button>
              </div>

              {/* ── 已有权限列表 ── */}
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>已有权限 {utList.length > 0 ? `（${utList.length} 条）` : ''}</span>
                {utLoading && <span style={{ fontSize: 11, color: '#6b7099' }}>刷新中...</span>}
              </div>

              {utList.length === 0 && !utLoading ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b7099', fontSize: 13 }}>暂未分配任何隧道权限</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {utList.map(ut => (
                    <div key={ut.id}>
                      {/* 权限卡片 */}
                      <div style={{ padding: '12px 14px', borderRadius: 9,
                        background: editUt?.id === ut.id ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.025)',
                        border: `1px solid ${editUt?.id === ut.id ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.07)'}`,
                        transition: 'border-color 0.2s, background 0.2s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <span style={{ fontWeight: 600, color: '#c7d2fe', fontSize: 13 }}>{tunnelName(ut.tunnelId)}</span>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                              <span>配额 {formatGB(ut.flow)}</span>
                              <span>已用 {formatBytes((ut.inFlow || 0) + (ut.outFlow || 0))}</span>
                              <span>转发 {ut.num} 个</span>
                              <span>到期 {formatDate(ut.expTime)}</span>
                              <span>重置 {ut.flowResetTime === 0 ? '不重置' : `每月${ut.flowResetTime}日`}</span>
                              {ut.speedLimitName && <span style={{ color: '#fbbf24' }}>限速 {ut.speedLimitName}</span>}
                              <span className={ut.status === 1 ? '' : ''} style={{ color: ut.status === 1 ? '#6ee7b7' : '#f87171' }}>
                                {ut.status === 1 ? '正常' : '禁用'}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button onClick={() => editUt?.id === ut.id ? setEditUt(null) : openEditUt(ut)} style={{
                              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px',
                              borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12,
                              background: editUt?.id === ut.id ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)',
                              color: editUt?.id === ut.id ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                              transition: 'background 0.15s',
                            }}>
                              <Pencil size={11} /> {editUt?.id === ut.id ? '收起' : '编辑'}
                            </button>
                            <button onClick={() => doRemove(ut)} style={{
                              display: 'flex', alignItems: 'center', padding: '4px 8px',
                              borderRadius: 6, border: 'none', cursor: 'pointer',
                              background: 'rgba(239,68,68,0.1)', color: '#f87171', transition: 'background 0.15s',
                            }}
                              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.22)'}
                              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'}>
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>

                        {/* 内联编辑表单 */}
                        {editUt?.id === ut.id && (
                          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              <div className="form-row">
                                <label className="form-label">流量配额 (GB)</label>
                                <input className="prism-input" type="number" min={0}
                                  value={editForm.flow} onChange={e => setEditForm(f => ({ ...f, flow: +e.target.value }))} />
                              </div>
                              <div className="form-row">
                                <label className="form-label">转发数量</label>
                                <input className="prism-input" type="number" min={0}
                                  value={editForm.num} onChange={e => setEditForm(f => ({ ...f, num: +e.target.value }))} />
                              </div>
                              <div className="form-row">
                                <label className="form-label">到期时间（留空=永久）</label>
                                <input className="prism-input" type="date" value={editExpStr} onChange={e => setEditExpStr(e.target.value)} />
                              </div>
                              <div className="form-row">
                                <label className="form-label">流量重置日期</label>
                                <CustomSelect
                                  value={editForm.flowResetTime}
                                  options={RESET_OPTIONS}
                                  onChange={v => setEditForm(f => ({ ...f, flowResetTime: v }))}
                                />
                              </div>
                              <div className="form-row">
                                <label className="form-label">限速规则</label>
                                <CustomSelect
                                  value={editForm.speedId ?? ''}
                                  options={[
                                    { label: '不限速', value: '' },
                                    ...speedRules.map(s => ({ label: `${s.name} (${s.speed} Mbps)`, value: s.id }))
                                  ]}
                                  onChange={v => setEditForm(f => ({ ...f, speedId: v === '' ? null : v }))}
                                />
                              </div>
                              <div className="form-row">
                                <label className="form-label">状态</label>
                                <CustomSelect
                                  value={editForm.status}
                                  options={[
                                    { label: '正常', value: 1 },
                                    { label: '禁用', value: 0 },
                                  ]}
                                  onChange={v => setEditForm(f => ({ ...f, status: v }))}
                                />
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                              <button onClick={saveEditUt} disabled={editSaving} style={{
                                display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px',
                                borderRadius: 7, border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                                color: '#fff', fontSize: 12, fontWeight: 500, opacity: editSaving ? 0.7 : 1,
                              }}>
                                {editSaving ? '保存中...' : '保存修改'}
                              </button>
                              <button onClick={() => setEditUt(null)} style={{
                                padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)',
                                background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12,
                              }}>取消</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => { setTModal(false); setEditUt(null) }}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 重置流量确认弹窗 */}
      <ConfirmModal
        isOpen={resetModal}
        onClose={() => setResetModal(false)}
        onConfirm={confirmResetFlow}
        title="重置用户流量"
        message={`确认重置用户「${resetTarget?.user}」的流量？重置后已用流量将清零，此操作不可撤销。`}
        details={resetTarget ? [
          { label: '当前已用', value: formatBytes((resetTarget.inFlow || 0) + (resetTarget.outFlow || 0)) },
          { label: '流量配额', value: formatGB(resetTarget.flow) }
        ] : []}
        confirmText="确认重置"
        type="warning"
      />
    </div>
  )
}
