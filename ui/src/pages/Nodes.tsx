/**
 * Nodes.tsx — 节点监控页  (完全重写，Vercel / Linear 极简暗黑风)
 *
 * 数据来源（100% 对齐 prism 源码 api/index.ts + Nodes.tsx）
 * ────────────────────────────────────────────────────
 * REST  POST /api/v1/node/list   → Node[]
 * WS    /system-info?type=0&secret=<token>
 *       message: { id, type:'status'|'info', data }
 *       info.data 字段（原始 snake_case）:
 *         cpu_usage, memory_usage, memory_total, memory_used,
 *         swap_usage, swap_total, swap_used,
 *         disk_usage, disk_total, disk_used,
 *         load_avg_1, load_avg_5, load_avg_15,
 *         bytes_transmitted, bytes_received, uptime
 *
 * 关键修复
 * ────────────────────────────────────────────────────
 * · CPU / 内存 / SWAP / 硬盘 四条资源栏「始终渲染」
 *   （swapTotal=0 或 diskTotal=0 时显示占位「—」，不隐藏行）
 * · 网速 / 流量 / 负载 / 运行时长 固定在卡片下半区
 * · 渐变填充进度条（高度 6px）+ 辉光阴影
 * · 在线节点：绿色脉冲描边；离线：静默灰色
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, Terminal, Check, X } from 'lucide-react'
import {
  getNodes, addNode, updateNode, deleteNode, copyInstall, updateConfigSingle,
  type Node,
} from '../api'
import { useToast } from '../store/toast'
import { PageSpinner } from '../components/Spinner'

// ─────────────────────────────────────────────────────────
//  格式化工具（对齐 api/index.ts formatBytes / formatSpeed）
// ─────────────────────────────────────────────────────────
function fmtBytes(b: number, dec = 1): string {
  if (!b || b <= 0) return '0 B'
  const k = 1024
  const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.min(Math.floor(Math.log(b) / Math.log(k)), u.length - 1)
  return `${parseFloat((b / Math.pow(k, i)).toFixed(dec))} ${u[i]}`
}

function fmtSpeed(bps: number): string {
  if (!bps || bps <= 0) return '0 B/s'
  const k = 1024
  const u = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s']
  const i = Math.min(Math.floor(Math.log(bps) / Math.log(k)), u.length - 1)
  return `${parseFloat((bps / Math.pow(k, i)).toFixed(1))} ${u[i]}`
}

function fmtUptime(sec: number): string {
  if (!sec || sec <= 0) return '—'
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (d > 0) return `${d}天 ${h}时`
  if (h > 0) return `${h}时 ${m}分`
  return `${m} 分钟`
}

// ─────────────────────────────────────────────────────────
//  颜色方案（每项指标独立调色板）
// ─────────────────────────────────────────────────────────
type MetricKey = 'cpu' | 'mem' | 'swap' | 'disk'

const PALETTE: Record<MetricKey, { base: string; glow: string }> = {
  cpu:  { base: '#818cf8', glow: 'rgba(129,140,248,0.28)' },
  mem:  { base: '#34d399', glow: 'rgba(52,211,153,0.22)'  },
  swap: { base: '#a78bfa', glow: 'rgba(167,139,250,0.22)' },
  disk: { base: '#38bdf8', glow: 'rgba(56,189,248,0.22)'  },
}

function resolveBarColor(pct: number, key: MetricKey): string {
  if (pct >= 90) return '#f43f5e'
  if (pct >= 75) return '#fb923c'
  return PALETTE[key].base
}

// ─────────────────────────────────────────────────────────
//  ResourceBar — 始终渲染，无数据时显示占位
// ─────────────────────────────────────────────────────────
interface ResourceBarProps {
  label: string
  metricKey: MetricKey
  pct: number        // 0‒100（传入 0 即可，不会被隐藏）
  used?: number      // bytes
  total?: number     // bytes
}

function ResourceBar({ label, metricKey, pct, used, total }: ResourceBarProps) {
  const safe   = Math.min(100, Math.max(0, pct || 0))
  const color  = resolveBarColor(safe, metricKey)
  const noData = !pct && !used && !total   // 真正无数据

  return (
    <div style={{ marginBottom: 9 }}>
      {/* 标签行 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 4,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
        }}>
          {label}
        </span>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          {/* 已用/总量小注（有数据才显示）*/}
          {!noData && used !== undefined && total !== undefined && total > 0 && (
            <span style={{
              fontSize: 10, color: 'rgba(255,255,255,0.25)',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {fmtBytes(used)}/{fmtBytes(total)}
            </span>
          )}
          {/* 百分比 */}
          <span style={{
            fontSize: 12, fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            minWidth: 32, textAlign: 'right',
            color: noData ? 'rgba(255,255,255,0.15)' : color,
          }}>
            {noData ? '—' : `${safe.toFixed(0)}%`}
          </span>
        </div>
      </div>

      {/* 轨道 + 填充 */}
      <div style={{
        height: 6, borderRadius: 4,
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden', position: 'relative',
      }}>
        {!noData && safe > 0 && (
          <div style={{
            position: 'absolute', inset: '0 auto 0 0',
            width: `${safe}%`,
            borderRadius: 4,
            background: `linear-gradient(90deg, ${color}bb, ${color})`,
            boxShadow: safe > 5 ? `0 0 8px ${PALETTE[metricKey].glow}` : 'none',
            transition: 'width 0.7s cubic-bezier(0.22,1,0.36,1)',
          }} />
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
//  StatRow — 网速 / 流量 / 负载 / 时长
// ─────────────────────────────────────────────────────────
function StatRow({ icon, label, children }: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '5px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <span style={{
        width: 18, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(255,255,255,0.2)',
      }}>
        {icon}
      </span>
      <span style={{
        width: 34, marginLeft: 4, fontSize: 11, fontWeight: 600,
        letterSpacing: '0.05em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.3)', flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{
        flex: 1, textAlign: 'right',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
      }}>
        {children}
      </div>
    </div>
  )
}

// 内联 SVG 图标（避免额外依赖，线条风格与 Layout.tsx 一致）
const IcoNet = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12H2M17 7l5 5-5 5M7 17l-5-5 5-5"/>
  </svg>
)
const IcoFlow = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)
const IcoLoad = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20V10M18 20V4M6 20v-4"/>
  </svg>
)
const IcoClock = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
  </svg>
)

// ─────────────────────────────────────────────────────────
//  NodeCard
// ─────────────────────────────────────────────────────────
type NodeWithMeta = Node & { copyLoading?: boolean }

function NodeCard({ node, onEdit, onDelete, onInstall }: {
  node: NodeWithMeta
  onEdit: () => void
  onDelete: () => void
  onInstall: () => void
}) {
  const info     = node.systemInfo
  const isOnline = node.status === 1
  const hasInfo  = isOnline && !!info

  // 安全取值——无数据时归零，但不隐藏对应的资源条
  const cpu       = hasInfo ? info!.cpuUsage      : 0
  const memPct    = hasInfo ? info!.memoryUsage   : 0
  const memUsed   = hasInfo ? info!.memoryUsed    : 0
  const memTotal  = hasInfo ? info!.memoryTotal   : 0
  const swapPct   = hasInfo ? info!.swapUsage     : 0
  const swapUsed  = hasInfo ? info!.swapUsed      : 0
  const swapTotal = hasInfo ? info!.swapTotal     : 0
  const diskPct   = hasInfo ? info!.diskUsage     : 0
  const diskUsed  = hasInfo ? info!.diskUsed      : 0
  const diskTotal = hasInfo ? info!.diskTotal     : 0

  return (
    <div
      className="glass-card"
      style={{
        borderRadius: 16,
        padding: '18px 20px',
        display: 'flex', flexDirection: 'column',
        border: isOnline
          ? '1px solid rgba(99,102,241,0.22)'
          : '1px solid rgba(255,255,255,0.06)',
        transition: 'border-color 0.3s',
      }}
    >
      {/* ── 头部：状态灯 + 名称 + 在线标签 + ID ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        {/* 左侧 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
          {/* 状态灯 */}
          <div style={{ position: 'relative', width: 8, height: 8, flexShrink: 0 }}>
            <span style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: isOnline ? '#10b981' : '#374151',
              boxShadow: isOnline ? '0 0 0 2px rgba(16,185,129,0.18)' : 'none',
            }} />
            {isOnline && (
              <span style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: '#10b981',
                animation: 'ndPulse 2.4s ease-in-out infinite',
                opacity: 0.45,
              }} />
            )}
          </div>
          {/* 节点名 */}
          <span style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 14, fontWeight: 600, color: '#e2e4f0',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {node.name}
          </span>
        </div>

        {/* 右侧 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{
            fontSize: 11, fontWeight: 500,
            color: isOnline ? '#6ee7b7' : '#6b7280',
          }}>
            {isOnline ? '在线' : '离线'}
          </span>
        </div>
      </div>

      {/* ── 资源条区（始终显示 4 项）── */}
      <div style={{
        padding: '12px 14px 6px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 10,
        marginBottom: 12,
        opacity: isOnline ? 1 : 0.4,
        transition: 'opacity 0.3s',
      }}>
        <ResourceBar label="CPU"  metricKey="cpu"  pct={cpu} />
        <ResourceBar label="内存" metricKey="mem"  pct={memPct}  used={memUsed}  total={memTotal}  />
        <ResourceBar label="SWAP" metricKey="swap" pct={swapPct} used={swapUsed} total={swapTotal} />
        <ResourceBar label="硬盘" metricKey="disk" pct={diskPct} used={diskUsed} total={diskTotal} />
      </div>

      {/* ── 统计信息区 ── */}
      <div style={{
        flex: 1, marginBottom: 14,
        opacity: isOnline ? 1 : 0.38,
        transition: 'opacity 0.3s',
      }}>
        {/* 在线但尚未收到 WS 首帧 */}
        {isOnline && !hasInfo ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '14px 0', color: 'rgba(255,255,255,0.18)',
            fontSize: 12, gap: 8,
          }}>
            <span style={{
              width: 12, height: 12,
              border: '1.5px solid rgba(99,102,241,0.2)',
              borderTopColor: '#818cf8', borderRadius: '50%',
              animation: 'ndSpin 0.8s linear infinite',
              display: 'inline-block',
            }} />
            等待监控数据…
          </div>
        ) : (
          <>
            {/* 网速 */}
            <StatRow icon={IcoNet} label="网速">
              <span style={{ color: '#a78bfa' }}>↑ {fmtSpeed(hasInfo ? info!.uploadSpeed   : 0)}</span>
              <span style={{ color: 'rgba(255,255,255,0.15)', margin: '0 7px' }}>|</span>
              <span style={{ color: '#67e8f9' }}>↓ {fmtSpeed(hasInfo ? info!.downloadSpeed : 0)}</span>
            </StatRow>

            {/* 流量 */}
            <StatRow icon={IcoFlow} label="流量">
              <span style={{ color: '#a78bfa' }}>↑ {fmtBytes(hasInfo ? info!.uploadTraffic   : 0)}</span>
              <span style={{ color: 'rgba(255,255,255,0.15)', margin: '0 7px' }}>|</span>
              <span style={{ color: '#67e8f9' }}>↓ {fmtBytes(hasInfo ? info!.downloadTraffic : 0)}</span>
            </StatRow>

            {/* 负载 */}
            <StatRow icon={IcoLoad} label="负载">
              <span style={{ color: '#fbbf24' }}>
                {(hasInfo ? info!.loadAvg1  : 0).toFixed(2)}
                <span style={{ color: 'rgba(255,255,255,0.15)', margin: '0 5px' }}>·</span>
                {(hasInfo ? info!.loadAvg5  : 0).toFixed(2)}
                <span style={{ color: 'rgba(255,255,255,0.15)', margin: '0 5px' }}>·</span>
                {(hasInfo ? info!.loadAvg15 : 0).toFixed(2)}
              </span>
            </StatRow>

            {/* 运行时长（末行，无下边框）*/}
            <div style={{ display: 'flex', alignItems: 'center', padding: '5px 0' }}>
              <span style={{
                width: 18, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.2)',
              }}>
                {IcoClock}
              </span>
              <span style={{
                width: 34, marginLeft: 4, fontSize: 11, fontWeight: 600,
                letterSpacing: '0.05em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
              }}>
                时长
              </span>
              <span style={{
                flex: 1, textAlign: 'right',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12, color: '#a5b4fc',
              }}>
                {fmtUptime(hasInfo ? info!.uptime : 0)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* 服务器 IP + 版本（小字角标）*/}
      <div style={{ marginBottom: 10, textAlign: 'right' }}>
        <span style={{
          fontSize: 10, color: 'rgba(255,255,255,0.18)',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {node.serverIp}
        </span>
      </div>

      {/* ── 操作按钮 ── */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onInstall}
          disabled={node.copyLoading}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 0', borderRadius: 9,
            border: '1px solid rgba(99,102,241,0.26)',
            background: 'rgba(99,102,241,0.08)',
            color: '#a5b4fc', fontSize: 12, fontWeight: 500,
            cursor: node.copyLoading ? 'not-allowed' : 'pointer',
            opacity: node.copyLoading ? 0.5 : 1,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (!node.copyLoading) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.18)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.08)' }}
        >
          {node.copyLoading
            ? <span style={{
                width: 11, height: 11,
                border: '1.5px solid rgba(255,255,255,0.18)',
                borderTopColor: '#a5b4fc', borderRadius: '50%',
                animation: 'ndSpin 0.7s linear infinite',
                display: 'inline-block',
              }} />
            : <Terminal size={12} />}
          {node.copyLoading ? '获取中…' : '安装命令'}
        </button>

        <button
          className="btn-ghost btn-sm"
          onClick={onEdit}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, padding: '5px 0' }}
        >
          <Pencil size={12} />
        </button>

        <button
          className="btn-danger btn-sm"
          onClick={onDelete}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, padding: '5px 0' }}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
//  表单初始值
// ─────────────────────────────────────────────────────────
const INIT_FORM = {
  name: '', ipString: '', serverIp: '',
  portSta: 1000, portEnd: 65535,
  http: 0, tls: 0, socks: 0,
}

function localizeCmd(cmd: string): string {
  let newCmd = cmd.replace(
    /curl\s+-L\s+https?:\/\/[^\s]+\/install\.sh/,
    `curl -L ${window.location.origin}/install.sh`
  )
  return newCmd.replace(/\.\/install\.sh -a/, `./install.sh -p ${window.location.origin} -a`)
}

// ─────────────────────────────────────────────────────────
//  主页面
// ─────────────────────────────────────────────────────────
export default function Nodes() {
  const { toast } = useToast()
  const [nodes,     setNodes]     = useState<NodeWithMeta[]>([])
  const [loading,   setLoading]   = useState(false)
  const [modal,     setModal]     = useState(false)
  const [editing,   setEditing]   = useState<Node | null>(null)
  const [form,      setForm]      = useState({ ...INIT_FORM })
  const [saving,    setSaving]    = useState(false)
  const [cmdModal,  setCmdModal]  = useState(false)
  const [cmdText,   setCmdText]   = useState('')
  const [cmdName,   setCmdName]   = useState('')
  const [cmdCopied, setCmdCopied] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  // ── REST ──────────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true)
    getNodes()
      .then(r => {
        if (r.data.code === 0)
          setNodes(r.data.data.map((n: Node) => ({ ...n, copyLoading: false })))
      })
      .catch(() => toast('error', '加载节点失败'))
      .finally(() => setLoading(false))
  }, [toast])

  const syncBackendAddr = useCallback(async () => {
    try { await updateConfigSingle('ip', `${window.location.hostname}:50000`) } catch {}
  }, [])

  // ── WebSocket（字段映射 100% 对齐源码）────────────────
  const initWS = useCallback(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${location.host}/system-info?type=0&secret=${token}`)
    wsRef.current = ws

    ws.onmessage = e => {
      try {
        const { id: rawId, type, data } = JSON.parse(e.data)
        const id = Number(rawId)
        setNodes(prev => prev.map(n => {
          if (n.id !== id) return n
          if (type === 'status') return { ...n, status: data as number }
          if (type === 'info') {
            const s  = typeof data === 'string' ? JSON.parse(data) : data as Record<string, string>
            const pi = n.systemInfo
            const curUp = parseInt(s.bytes_transmitted) || 0
            const curDn = parseInt(s.bytes_received)    || 0
            const curT  = parseInt(s.uptime)            || 0
            let upSpd = 0, dnSpd = 0
            if (pi?.uptime) {
              const dt = curT - pi.uptime
              if (dt > 0 && dt <= 15) {
                if (curUp - pi.uploadTraffic   >= 0) upSpd = (curUp - pi.uploadTraffic)   / dt
                if (curDn - pi.downloadTraffic >= 0) dnSpd = (curDn - pi.downloadTraffic) / dt
              }
            }
            return {
              ...n,
              systemInfo: {
                cpuUsage:        parseFloat(s.cpu_usage)    || 0,
                memoryUsage:     parseFloat(s.memory_usage) || 0,
                memoryTotal:     parseInt(s.memory_total)   || 0,
                memoryUsed:      parseInt(s.memory_used)    || 0,
                swapUsage:       parseFloat(s.swap_usage)   || 0,
                swapTotal:       parseInt(s.swap_total)     || 0,
                swapUsed:        parseInt(s.swap_used)      || 0,
                diskUsage:       parseFloat(s.disk_usage)   || 0,
                diskTotal:       parseInt(s.disk_total)     || 0,
                diskUsed:        parseInt(s.disk_used)      || 0,
                loadAvg1:        parseFloat(s.load_avg_1)   || 0,
                loadAvg5:        parseFloat(s.load_avg_5)   || 0,
                loadAvg15:       parseFloat(s.load_avg_15)  || 0,
                uploadTraffic:   curUp,
                downloadTraffic: curDn,
                uploadSpeed:     upSpd,
                downloadSpeed:   dnSpd,
                uptime:          curT,
              },
            }
          }
          return n
        }))
      } catch { /* 忽略解析异常 */ }
    }

    ws.onclose = () => { setTimeout(initWS, 5000) }
  }, [])

  useEffect(() => {
    load(); syncBackendAddr(); initWS()
    return () => wsRef.current?.close()
  }, [load, syncBackendAddr, initWS])

  // ── 弹窗 ─────────────────────────────────────────────
  const openAdd = () => { setEditing(null); setForm({ ...INIT_FORM }); setModal(true) }
  const openEdit = (n: Node) => {
    setEditing(n)
    setForm({
      name: n.name,
      ipString: n.ip?.split(',').map(s => s.trim()).join('\n') || '',
      serverIp: n.serverIp || '',
      portSta: n.portSta, portEnd: n.portEnd,
      http: n.http ?? 0, tls: n.tls ?? 0, socks: n.socks ?? 0,
    })
    setModal(true)
  }

  const save = async () => {
    if (!form.name || !form.ipString || !form.serverIp) {
      toast('error', '请填写节点名称、服务器IP和入口IP'); return
    }
    setSaving(true)
    try {
      const ip = form.ipString.split('\n').map(s => s.trim()).filter(Boolean).join(',')
      const payload: any = { ...form, ip }
      delete payload.ipString
      if (editing) payload.id = editing.id
      const r = editing ? await updateNode(payload) : await addNode(payload)
      if (r.data.code !== 0) { toast('error', r.data.msg || '操作失败'); return }
      toast('success', editing ? '节点已更新' : '节点已添加')
      setModal(false); load()
    } catch (e: any) {
      toast('error', e.response?.data?.msg || '操作失败')
    } finally { setSaving(false) }
  }

  const handleDelete = async (n: Node) => {
    if (!confirm(`确认删除节点「${n.name}」？此操作不可恢复。`)) return
    const r = await deleteNode(n.id).catch(() => null)
    if (r?.data.code === 0) { toast('success', '已删除'); load() }
    else toast('error', r?.data.msg || '删除失败')
  }

  const handleInstall = async (n: NodeWithMeta) => {
    setNodes(prev => prev.map(x => x.id === n.id ? { ...x, copyLoading: true } : x))
    try {
      const r = await copyInstall(n.id)
      if (r.data.code !== 0) { toast('error', r.data.msg || '获取失败'); return }
      const cmd = localizeCmd(r.data.data || '')
      if (!cmd) { toast('error', '安装命令为空'); return }
      try { await navigator.clipboard.writeText(cmd); toast('success', '安装命令已复制') }
      catch { setCmdText(cmd); setCmdName(n.name); setCmdCopied(false); setCmdModal(true) }
    } catch { toast('error', '获取安装命令失败') }
    finally { setNodes(prev => prev.map(x => x.id === n.id ? { ...x, copyLoading: false } : x)) }
  }

  const online = nodes.filter(n => n.status === 1).length

  // ─────────────────────────────────────────────────────
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* ── 页头 ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
        <div>
          <h1 style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 22, fontWeight: 700, color: '#e2e4f0', margin: 0,
          }}>
            节点监控
          </h1>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
            共 <span style={{ color: '#94a3b8' }}>{nodes.length}</span> 个节点 ·{' '}
            <span style={{ color: '#10b981' }}>{online} 在线</span>
            {nodes.length - online > 0 && (
              <span style={{ color: '#6b7280' }}> · {nodes.length - online} 离线</span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-ghost btn-sm"
            onClick={load}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <RefreshCw size={13} />
          </button>
          <button
            className="btn-primary btn-sm"
            onClick={openAdd}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={13} /> 新增节点
          </button>
        </div>
      </div>

      {/* ── 节点卡片网格 ── */}
      {loading ? (
        <PageSpinner text="加载节点…" />
      ) : nodes.length === 0 ? (
        <div className="glass-card" style={{
          borderRadius: 16, padding: 56,
          textAlign: 'center', color: '#4b5563',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🖧</div>
          <p style={{ margin: 0, fontSize: 14 }}>暂无节点，点击「新增节点」开始</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
          alignItems: 'start',
        }}>
          {nodes.map(n => (
            <NodeCard
              key={n.id}
              node={n}
              onEdit={() => openEdit(n)}
              onDelete={() => handleDelete(n)}
              onInstall={() => handleInstall(n)}
            />
          ))}
        </div>
      )}

      {/* ── 安装命令弹窗 ── */}
      {cmdModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCmdModal(false)}>
          <div className="modal-box" style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <span className="modal-title">
                <Terminal size={14} style={{ marginRight: 7, verticalAlign: 'middle' }} />
                安装命令 · {cmdName}
              </span>
              <button onClick={() => setCmdModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7099', padding: 4 }}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: '#6b7099', margin: '0 0 12px' }}>
                在目标节点服务器执行（install.sh 已托管于本面板）：
              </p>
              <div style={{ position: 'relative' }}>
                <textarea
                  id="cmd-ta"
                  readOnly
                  value={cmdText}
                  rows={4}
                  onClick={e => (e.target as HTMLTextAreaElement).select()}
                  style={{
                    width: '100%', background: '#08090f',
                    border: '1px solid #1e2133', borderRadius: 8,
                    color: '#c8cde8', fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12, padding: 12, resize: 'none',
                    outline: 'none', lineHeight: 1.7, boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(cmdText); setCmdCopied(true); setTimeout(() => setCmdCopied(false), 2000) }
                    catch { (document.getElementById('cmd-ta') as HTMLTextAreaElement)?.select() }
                  }}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    background: cmdCopied ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)',
                    border: `1px solid ${cmdCopied ? 'rgba(16,185,129,0.4)' : 'rgba(99,102,241,0.4)'}`,
                    borderRadius: 6, padding: '4px 10px',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    color: cmdCopied ? '#6ee7b7' : '#a5b4fc',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {cmdCopied ? <><Check size={11} /> 已复制</> : '复制'}
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setCmdModal(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 新增 / 编辑节点弹窗 ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <span className="modal-title">{editing ? '编辑节点' : '新增节点'}</span>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7099', padding: 4 }}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">节点名称 *</label>
                <input className="prism-input" placeholder="如：香港节点-01" autoFocus
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-row">
                <label className="form-label">服务器 IP（公网）*</label>
                <input className="prism-input" placeholder="节点服务器公网 IP"
                  value={form.serverIp} onChange={e => setForm(f => ({ ...f, serverIp: e.target.value }))} />
              </div>
              <div className="form-row">
                <label className="form-label">入口 IP *（每行一个）</label>
                <textarea className="prism-input" rows={3} placeholder={'192.168.1.1\nexample.com'}
                  value={form.ipString} onChange={e => setForm(f => ({ ...f, ipString: e.target.value }))}
                  style={{ resize: 'vertical', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-row">
                  <label className="form-label">端口起始</label>
                  <input className="prism-input" type="number" min={1} max={65535}
                    value={form.portSta} onChange={e => setForm(f => ({ ...f, portSta: +e.target.value }))} />
                </div>
                <div className="form-row">
                  <label className="form-label">端口结束</label>
                  <input className="prism-input" type="number" min={1} max={65535}
                    value={form.portEnd} onChange={e => setForm(f => ({ ...f, portEnd: +e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <label className="form-label">屏蔽协议（勾选 = 屏蔽）</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {(['http', 'tls', 'socks'] as const).map(k => (
                    <label key={k} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.02)',
                      border: form[k] === 1 ? '1px solid rgba(244,63,94,0.4)' : '1px solid #1e2133',
                      cursor: 'pointer', fontSize: 12,
                      color: form[k] === 1 ? '#fda4af' : '#c8cde8',
                      userSelect: 'none',
                    }}>
                      <input type="checkbox" checked={form[k] === 1}
                        onChange={e => setForm(f => ({ ...f, [k]: e.target.checked ? 1 : 0 }))}
                        style={{ accentColor: '#f43f5e' }} />
                      {k.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setModal(false)}>取消</button>
              <button className="btn-primary" onClick={save} disabled={saving}>
                {saving ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 关键帧 */}
      <style>{`
        @keyframes ndSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes ndPulse {
          0%        { transform: scale(1);   opacity: 0.45; }
          60%, 100% { transform: scale(2.8); opacity: 0;    }
        }
      `}</style>
    </div>
  )
}