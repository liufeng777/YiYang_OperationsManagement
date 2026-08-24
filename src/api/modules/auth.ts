/**
 * 认证与会话（运营后台端-API设计 §1）
 * baseURL 已含 /api，路径前缀 /admin
 */
import { http } from '@/utils/request'

/** 管理员信息（登录出参 / profile 出参） */
export interface AdminProfile {
  id: number
  username: string
  nickname: string
  avatar_url: string | null
  /** 脱敏手机号 */
  phone: string | null
  email: string | null
  /** 最近登录时间 UTC 秒 */
  last_login_at: number | null
  last_login_ip: string | null
  /** 角色编码数组，如 ["finance","operator"] */
  roles: string[]
  /** 权限码数组，如 ["order:view","order:manage"] */
  permissions: string[]
}

/** 后台登录入参 */
export interface LoginParams {
  username: string
  password: string
  /** 图形验证码（可选） */
  captcha?: string
  captcha_id?: string
}

/** 后台登录出参 */
export interface LoginResult {
  token: string
  /** token 有效期（秒） */
  expires_in: number
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

/** 修改密码 POST /api/admin/auth/change-password */
export function changePassword(data: { old_password: string; new_password: string }) {
  return http.post<null>('/admin/auth/change-password', data)
}

/** 登出 POST /api/admin/auth/logout */
export function logout() {
  return http.post<null>('/admin/auth/logout')
}
