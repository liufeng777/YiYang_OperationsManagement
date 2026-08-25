/**
 * 系统与权限管理（运营后台端-API设计 §2）
 * - §2.1 管理员账号 system:admin
 * - §2.2 角色管理 system:role
 * - §2.3 权限管理（按模块扁平化） system:permission
 * - §2.4 操作日志 system:operation-log
 * 说明：文件上半部分为页面展示用类型（当前页面使用本地 mock 数据），
 *       下半部分 DTO 与接口函数严格对齐 API 文档契约（snake_case / UTC 秒）。
 */
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult, CommonStatus } from '@/types/api'

/* ------------------------------------------------------------------ */
/* 页面展示类型（mock，接后端后逐步切换到下方 DTO）                       */
/* ------------------------------------------------------------------ */

/** 平台用户 */
export interface AccountItem {
  id: number
  /** 登录账号，如 chen.yunying */
  username: string
  password: string
  nickname: string
  /** 脱敏手机号，如 138****1026 */
  phone: string
  email: string | null
  status: number // 1 启用，2 停用
  // 角色
  roles: {
    id: number,
    role_name: string
    role_code: string
  }[]
  created_at: number // 时间戳
  last_login_at: number
  last_login_ip: string
}

/** 角色 */
export interface RoleItem {
  id: string
  name: string
  userCount: number
  description: string
  /** 系统内置 / 自定义角色 */
  builtIn: boolean
  /** 已启用权限 key 列表 */
  permissions: string[]
}

/** 操作日志 */
export interface LogItem {
  id: string
  operator: string
  action: string
  ip: string
  createdAt: string
}

/** 业务消息模板 */
export interface MessageTemplateItem {
  id: string
  name: string
  /** 固定触发事件，如 用户提交服务订单后 */
  triggerEvent: string
  /** 启用渠道：站内 / 微信 / 短信 */
  channels: string[]
  enabled: boolean
  updatedAt: string
  updater: string
}

/** 系统公告 */
export interface AnnouncementItem {
  id: string
  title: string
  summary: string
  type: string
  /** 影响范围，如 全部患者端用户 */
  scope: string
  /** 患者端展示时段，如 2026-08-12 00:00 至 23:59 */
  displayPeriod: string
  status: 'showing' | 'scheduled' | 'draft' | 'finished'
  updater: string
}

/** 常见问题 */
export interface FaqItem {
  id: string
  question: string
  category: string
  visible: boolean
  sort: number
  updatedAt: string
}

/** 协议版本 */
export interface AgreementItem {
  id: string
  name: string
  type: string
  version: string
  status: 'effective' | 'draft'
  /** 生效时间展示，如 2026-08-01 00:00 */
  effectiveTime: string
  updatedAt: string
  updater: string
}

/* ------------------------------------------------------------------ */
/* §2.1 管理员账号管理（权限 system:admin）                              */
/* ------------------------------------------------------------------ */

/** 管理员列表项 */
export interface AdminItem {
  id: number
  username: string
  nickname: string
  /** 脱敏手机号 */
  phone: string | null
  email: string | null
  status: CommonStatus
  last_login_at: number | null
  last_login_ip: string | null
  roles: Array<{ id: number; role_name: string; role_code: string }>
  created_at: number
}

/** 新增 / 编辑管理员入参 */
export interface AdminSaveBody {
  username: string
  /** 仅新增时必填 */
  password?: string
  nickname: string
  phone?: string
  email?: string
  avatar_url?: string
  status?: CommonStatus
  role_ids?: number[]
}

/** 管理员列表 GET /api/admin/admins */
export function getAdminList(params?: ApiPageParams) {
  return http.get<ApiPageResult<AdminItem>>('/admin/admins', { ...params })
}

/** 管理员详情 GET /api/admin/admins/:id */
export function getAdminDetail(id: number) {
  return http.get<AdminItem>(`/admin/admins/${id}`)
}

/** 新增管理员 POST /api/admin/admins */
export function createAdmin(data: AdminSaveBody) {
  return http.post<null>('/admin/admins', data)
}

/** 编辑管理员 PUT /api/admin/admins/:id */
export function updateAdmin(id: number, data: Partial<AdminSaveBody>) {
  return http.put<null>(`/admin/admins/${id}`, data)
}

/** 重置密码 POST /api/admin/admins/:id/reset-password（重置为初始密码） */
export function resetAdminPassword(id: number) {
  return http.post<null>(`/admin/admins/${id}/reset-password`)
}

/** 启用/禁用 POST /api/admin/admins/:id/status */
export function updateAdminStatus(id: number, status: CommonStatus) {
  return http.post<null>(`/admin/admins/${id}/status`, { status })
}

/** 分配角色 POST /api/admin/admins/:id/roles */
export function assignAdminRoles(id: number, roleIds: number[]) {
  return http.post<null>(`/admin/admins/${id}/roles`, { role_ids: roleIds })
}

/** 删除管理员 DELETE /api/admin/admins/:id */
export function deleteAdmin(id: number) {
  return http.delete<null>(`/admin/admins/${id}`)
}

/* ------------------------------------------------------------------ */
/* §2.2 角色管理（权限 system:role）                                     */
/* ------------------------------------------------------------------ */

/** 权限项（扁平化，module + action） */
export interface PermissionItem {
  id: number
  /** 功能模块，如 order / member / staff / institution */
  module: string
  /** view 只读 / edit 可读增改 / manage 全部 */
  action: 'view' | 'edit' | 'manage'
  /** 权限码，如 order:view */
  code: string
  name: string
}

/** 角色详情（含已分配权限） */
export interface RoleDetail {
  id: number
  role_name: string
  role_code: string
  description: string
  status: CommonStatus
  permissions: PermissionItem[]
}

/** 角色新增 / 编辑入参 */
export interface RoleSaveBody {
  role_name: string
  /** 唯一，新增必填 */
  role_code?: string
  description?: string
  status?: CommonStatus
  permission_ids?: number[]
}

/** 角色列表 GET /api/admin/roles（?all=1 返回全部） */
export function getRoles(params?: ApiPageParams & { all?: 0 | 1 }) {
  return http.get<ApiPageResult<RoleDetail>>('/admin/roles', { ...params })
}

/** 角色详情 GET /api/admin/roles/:id */
export function getRoleDetail(id: number) {
  return http.get<RoleDetail>(`/admin/roles/${id}`)
}

/** 新增角色 POST /api/admin/roles */
export function createRole(data: RoleSaveBody) {
  return http.post<null>('/admin/roles', data)
}

/** 编辑角色 PUT /api/admin/roles/:id */
export function updateRole(id: number, data: Partial<RoleSaveBody>) {
  return http.put<null>(`/admin/roles/${id}`, data)
}

/** 分配权限 POST /api/admin/roles/:id/permissions */
export function assignRolePermissions(id: number, permissionIds: number[]) {
  return http.post<null>(`/admin/roles/${id}/permissions`, { permission_ids: permissionIds })
}

/** 启用/禁用角色 POST /api/admin/roles/:id/status */
export function updateRoleStatus(id: number, status: CommonStatus) {
  return http.post<null>(`/admin/roles/${id}/status`, { status })
}

/** 删除角色 DELETE /api/admin/roles/:id */
export function deleteRole(id: number) {
  return http.delete<null>(`/admin/roles/${id}`)
}

/* ------------------------------------------------------------------ */
/* §2.3 权限管理（按模块扁平化，权限 system:permission）                   */
/* ------------------------------------------------------------------ */

/** 权限列表（按模块分组）出参 */
export interface PermissionGroups {
  modules: string[]
  list: PermissionItem[]
}

/** 权限列表 GET /api/admin/permissions（扁平列表，按 module 分组） */
export function getPermissions() {
  return http.get<PermissionGroups>('/admin/permissions')
}

/** 权限模块列表 GET /api/admin/permissions/modules */
export function getPermissionModules() {
  return http.get<string[]>('/admin/permissions/modules')
}

/* ------------------------------------------------------------------ */
/* §2.4 操作日志（权限 system:operation-log）                            */
/* ------------------------------------------------------------------ */

/** 操作日志列表项 */
export interface OperationLogItem {
  id: number
  admin_id: number
  admin_name: string
  action: string
  resource: string
  resource_id: number
  ip_address: string
  request_method: string
  request_url: string
  request_params: Record<string, unknown> | null
  response_status: number
  duration_ms: number
  created_at: number
}

/** 操作日志列表 GET /api/admin/operation-logs */
export function getOperationLogs(
  params?: ApiPageParams & {
    admin_id?: number
    action?: string
    resource?: string
    resource_id?: number
    start_time?: number
    end_time?: number
  },
) {
  return http.get<ApiPageResult<OperationLogItem>>('/admin/operation-logs', { ...params })
}

/** 操作日志详情 GET /api/admin/operation-logs/:id */
export function getOperationLogDetail(id: number) {
  return http.get<OperationLogItem>(`/admin/operation-logs/${id}`)
}
