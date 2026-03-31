import axios from 'axios'
export const api = axios.create({ baseURL: '/api/v1', timeout: 30000 })

// 从 localStorage 获取真实 JWT Token
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = token
  return cfg
})
api.interceptors.response.use(res => {
  if (res.data?.code === 401) {
    localStorage.clear()
    window.location.href = '/login'
  }
  return res
}, err => {
  if (err.response?.status === 401) {
    localStorage.clear()
    window.location.href = '/login'
  }
  return Promise.resolve(err.response)
})

export default api

// 导出所有组件需要的功能函数，修复编译报错
export const getNodes = () => api.post('/node/list')
export const getConfigs = () => api.post('/config/list')
export const updateConfigs = (d: any) => api.post('/config/update', d)
export const updateConfigSingle = (name: string, value: string) => api.post('/config/update-single', { name, value })
export const getPackage = () => api.post('/user/package')
export const getTunnels = () => api.post('/tunnel/list')
export const getForwards = () => api.post('/forward/list')
export const getUsers = () => api.post('/user/list')
export const updatePassword = (d: any) => api.post('/user/updatePassword', d)
export const getSpeedRules = () => api.post('/speed-limit/list')
export const addSpeedRule = (d: any) => api.post('/speed-limit/create', d)
export const updateSpeedRule = (d: any) => api.post('/speed-limit/update', d)
export const deleteSpeedRule = (id: number) => api.post('/speed-limit/delete', { id })
export const addForward = (d: any) => api.post('/forward/create', d)
export const updateForward = (d: any) => api.post('/forward/update', d)
export const deleteForward = (id: number) => api.post('/forward/delete', { id })
export const pauseForward = (id: number) => api.post('/forward/pause', { id })
export const resumeForward = (id: number) => api.post('/forward/resume', { id })
export const getUserTunnelOptions = () => api.post('/tunnel/user/tunnel')
export const isAdmin = () => Number(localStorage.getItem('role_id')) === 0
export const userStatusLabel = (s: number) => s === 1 ? '正常' : '禁用'
export const userStatusOnline = (s: number) => s === 1

export interface User { id: number; user: string; pwd?: string; role_id: number; exp_time: number; flow: number; in_flow: number; out_flow: number; flow_reset_time: number; num: number; created_time: number; updated_time: number; status: number }
export interface UserTunnel { id: number; user_id: number; tunnel_id: number; speed_id: number; num: number; flow: number; in_flow: number; out_flow: number; flow_reset_time: number; exp_time: number; status: number; tunnelName?: string; speedName?: string }
export interface Tunnel { id: number; name: string; [k: string]: any }
export interface SpeedRule { id: number; name: string; [k: string]: any }

export interface Forward { id: number; name: string; tunnelId: number; tunnelName?: string; inPort?: number; inIp?: string; remoteAddr: string; strategy?: string; inFlow?: number; outFlow?: number; status: number; userId?: number; [k: string]: any }
export interface TunnelListItem { id: number; name: string; type?: number; inNodePortSta?: number; inNodePortEnd?: number; [k: string]: any }
export interface TunnelPermission { id: number; tunnelId: number; tunnelName?: string; tunnelFlow?: number; flow: number; inFlow?: number; outFlow?: number; num: number; expTime: number; [k: string]: any }
export interface UserInfo { id: number; user: string; flow: number; inFlow: number; outFlow: number; num: number; expTime: number; flowResetTime: number; status: number; createdTime: number; updatedTime?: number; [k: string]: any }
export interface UserPackage { userInfo: UserInfo; statisticsFlows: any[]; tunnelPermissions: TunnelPermission[]; forwards: Forward[] }
export interface Node { id: number; name: string; ip?: string; secret?: string; status?: number; [k: string]: any }

export const formatBytes = (b: number) => (b/1024/1024/1024).toFixed(2) + ' GB'
export const formatGB = (gb: number) => gb + ' GB'
export const formatDate = (ts: any) => new Date(ts).toLocaleDateString()
export const login = (username: string, password: string) => api.post('/user/login', { username, password })
export const addUser = (d: any) => api.post('/user/create', d)
export const updateUser = (d: any) => api.post('/user/update', d)
export const deleteUser = (id: number) => api.post('/user/delete', { id })
export const getUserTunnels = (userId: number) => api.post('/tunnel/user/list', { userId })
export const assignUserTunnel = (d: any) => api.post('/tunnel/user/assign', d)
export const removeUserTunnel = (id: number) => api.post('/tunnel/user/remove', { id })
export const updateUserTunnel = (d: any) => api.post('/tunnel/user/update', d)
export const resetFlow = (id: number, type: number) => api.post('/user/reset', { id, type })
export const copyInstall = (id: number) => api.post('/node/install', { id })
export const addNode = (d: any) => api.post('/node/create', d)
export const updateNode = (d: any) => api.post('/node/update', d)
export const deleteNode = (id: number) => api.post('/node/delete', { id })
export const addTunnel = (d: any) => api.post('/tunnel/create', d)
export const updateTunnel = (d: any) => api.post('/tunnel/update', d)
export const deleteTunnel = (id: number) => api.post('/tunnel/delete', { id })
