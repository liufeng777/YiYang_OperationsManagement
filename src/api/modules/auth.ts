/**
 * 认证与会话（swagger：认证）
 * baseURL 已含 /api，路径前缀 /admin（dev 代理统一补 /v1，见 vite.config.ts）
 */
import { http } from '@/utils/request'

/** 管理员信息（登录出参 / profile 出参）
 *  注：后端登录接口仅返回 id/username/nickname/roles，其余字段需兜底处理 */
export interface AdminProfile {
  id: number
  username: string
  nickname: string
  avatar_url?: string | null
  /** 脱敏手机号 */
  phone?: string | null
  email?: string | null
  /** 最近登录时间 UTC 秒 */
  last_login_at?: number | null
  last_login_ip?: string | null
  /** 角色编码数组，如 ["finance","operator"] */
  roles: string[]
  /** 权限码数组，如 ["order:view","order:manage"]；登录出参可能不返回 */
  permissions?: string[]
}

/** 后台登录入参（swagger admin.AdminLoginRequest） */
export interface LoginParams {
  username: string
  password: string
  /** 前端分组标识，如 admin（选填） */
  client_type?: string
  /** 图形验证码（swagger 未收录，预留） */
  captcha?: string
  captcha_id?: string
}

/** 后台登录出参（字段名与后端实际返回一致） */
export interface LoginResult {
  token: string
  /** token 有效期（秒）；后端返回字段名为 expire_in */
  expire_in: number
  admin: AdminProfile
}

/** 后台登录 POST /api/admin/auth/login（公开） */
export function login(data: LoginParams) {
  return http.post<LoginResult>('/admin/auth/login', data)
}

/** 获取当前管理员信息 GET /api/admin/auth/profile */
export function getProfile() {
  return http.get<AdminProfile>('/admin/auth/profile')
}

/** 刷新 Token POST /api/admin/auth/refresh（swagger admin.AdminRefreshRequest，body {token}） */
export function refreshToken(token: string) {
  return http.post<{ token: string; expire_in?: number }>('/admin/auth/refresh', { token })
}

/** 登出 POST /api/admin/auth/logout */
export function logout() {
  return http.post<null>('/admin/auth/logout')
}
