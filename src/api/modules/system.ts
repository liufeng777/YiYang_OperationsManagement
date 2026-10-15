/**
 * 系统与权限管理（运营后台端-API设计 §2）
 * - §2.1 管理员账号 system:admin
 * - §2.2 角色管理 system:role
 * - §2.3 权限管理（按模块扁平化） system:permission
 * - §2.4 操作日志 system:operation-log
 * 说明：DTO 与接口函数按后端**实测返回**对齐（已在测试环境逐接口验证）。
 *       无对应后端接口的页面（帮助/FAQ、协议）仍保留本地展示类型。
 *
 * 实测要点：
 * - 管理员：字段为 real_name / mobile / phone / role_ids / role_names，created_at、last_login_at 为
 *   'YYYY-MM-DD HH:mm:ss' 字符串；PUT 复用创建校验，username、password 均为必填。
 * - 角色：列表项为 id / name / code / description / status / built_in（1-普通 2-内置）；
 *   详情 GET /admin/roles/:id 额外返回 permission_ids / permissions（已分配权限）。
 * - 权限：GET /admin/permissions 返回 { list, modules }，支持 module 过滤。
 * - 操作日志：字段为 operator / module / action / target / params / path / ip / operated_at(字符串) /
 *   create_at(秒) / error_message。
 *
 * 筛选约定：列表页筛选条件**全部下推后端**（前端不做本地过滤），相关入参已在此声明，
 *           后端补齐实现后即生效。
 */
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult } from '@/types/api'

/* ------------------------------------------------------------------ */
/* 无后端接口的页面展示类型（帮助 / 协议，仍为本地数据）                    */
/* ------------------------------------------------------------------ */

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

/** 管理员列表项 / 详情（GET /admin/admins） */
export interface AdminItem {
  id: number
  username: string
  /** 昵称（后端字段名 real_name） */
  nickname: string
  status: number
  /** 手机号：后端同时返回 mobile 与 phone，取值时优先 mobile */
  mobile?: string | null
  phone?: string | null
  email?: string | null
  avatar_url?: string
  /** 最近登录时间（字符串 'YYYY-MM-DD HH:mm:ss'） */
  last_login_at?: string | null
  last_login_ip: string
  /** 已分配角色（后端当前恒为空数组） */
  role_ids?: number[]
  role_names?: string[]
  /** 创建时间（字符串 'YYYY-MM-DD HH:mm:ss'） */
  created_at?: string | null
  /** 1是普通，2是内置（不允许进行任何操作） */
  built_in: number
}

/**
 * 新增 / 编辑管理员入参
 * 注意：`password` 仅**新增**时必填；编辑不提交密码（改密走 POST /:id/reset-password）
 */
export interface AdminSaveBody {
  username: string
  /** 登录密码：仅新增时必填；编辑不传 */
  password?: string
  nickname?: string
  phone?: string
  email?: string
  avatar_url?: string
  status?: number
  role_ids?: number[]
}

/** 管理员列表筛选入参（swagger：page / page_size / keyword / status） */
export interface AdminListParams extends ApiPageParams {
  /** 关键字（账号/昵称） */
  keyword?: string
  /** 状态过滤：1-启用 9-禁用，0 或不传不过滤 */
  status?: number
}

/** 管理员列表 GET /api/admin/admins */
export function getAdminList(params?: AdminListParams) {
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

/** 编辑管理员 PUT /api/admin/admins/:id（携带 username 等资料；不提交密码） */
export function updateAdmin(id: number, data: AdminSaveBody) {
  return http.put<null>(`/admin/admins/${id}`, data)
}

/** 重置密码 POST /api/admin/admins/:id/reset-password（重置为初始密码；后端要求 JSON body） */
export function resetAdminPassword(id: number, data: {new_password: string }) {
  return http.post<null>(`/admin/admins/${id}/reset-password`, data)
}

/** 启用/禁用 POST /api/admin/admins/:id/status（swagger：body {status}，remark 为 query 选填） */
export function updateAdminStatus(id: number, status: number, remark?: string) {
  return http.post<null>(`/admin/admins/${id}/status`, { status }, { params: { remark } })
}

/** 分配角色 POST /api/admin/admins/:id/roles */
export function assignAdminRoles(id: number, roleIds: number[]) {
  return http.post<null>(`/admin/admins/${id}/roles`, { role_ids: roleIds })
}

/** 删除管理员 DELETE /api/admin/admins/:id（swagger：remark 为 query 选填） */
export function deleteAdmin(id: number, remark?: string) {
  return http.delete<null>(`/admin/admins/${id}`, { remark })
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
  action: string
  /** 权限码，如 order:view */
  code: string
  name: string
  description?: string
  parent_id?: number
  status?: number
}

/** 角色列表项 / 详情（GET /admin/roles） */
export interface RoleItem {
  id: number
  name: string
  code: string
  description: string
  status: number
  /** 1-普通 2-内置（不允许删除、不允许修改权限） */
  built_in: number
}

/** 角色详情（GET /admin/roles/:id，含已分配权限，见 §2.2 出参） */
export interface RoleDetail extends RoleItem {
  /** 1-普通 2-内置（不允许删除、不允许修改权限） */
  built_in: number
  /** 已分配权限 id 列表（勾选态以此为准） */
  permission_ids: number[]
  /** 已分配权限列表 */
  permissions: PermissionItem[]
}

/** 角色新增 / 编辑入参 */
export interface RoleSaveBody {
  role_name: string
  /** 唯一，新增必填 */
  role_code: string
  description?: string
  status?: number
  /** 已选权限 id（后端支持在新增/编辑时一并下发） */
  permission_ids?: number[]
}

/** 角色列表 GET /api/admin/roles（swagger：page / page_size / all=1 返回全部） */
export function getRoles(params?: ApiPageParams & { all?: 0 | 1 }) {
  return http.get<ApiPageResult<RoleItem>>('/admin/roles', { ...params })
}

/** 角色详情 GET /api/admin/roles/:id（含已分配权限 permissions） */
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

/** 启用/禁用角色 POST /api/admin/roles/:id/status（swagger：body {status}，remark 为 query 选填） */
export function updateRoleStatus(id: number, status: number, remark?: string) {
  return http.post<null>(`/admin/roles/${id}/status`, { status }, { params: { remark } })
}

/** 删除角色 DELETE /api/admin/roles/:id（swagger：remark 为 query 选填） */
export function deleteRole(id: number, remark?: string) {
  return http.delete<null>(`/admin/roles/${id}`, { remark })
}

/* ------------------------------------------------------------------ */
/* §2.3 权限管理（按模块扁平化，权限 system:permission）                   */
/* ------------------------------------------------------------------ */

/** 权限列表出参：list 为扁平权限项，modules 为出现过的模块顺序 */
export interface PermissionGroups {
  modules: string[]
  list: PermissionItem[]
}

/** 权限列表 GET /api/admin/permissions（可按 module 过滤） */
export function getPermissions(params?: { module?: string }) {
  return http.get<PermissionGroups>('/admin/permissions', { ...params })
}

/** 权限模块列表 GET /api/admin/permissions/modules */
export function getPermissionModules() {
  return http.get<{ list: string[] }>('/admin/permissions/modules')
}

/* ------------------------------------------------------------------ */
/* §2.4 操作日志（权限 system:operation-log）                            */
/* ------------------------------------------------------------------ */

/** 操作日志列表项（字段按后端实测） */
export interface OperationLogItem {
  id: number
  admin_id: number
  /** 操作人账号 */
  operator: string
  /** 业务模块，如 order / reconciliation / service */
  module: string
  /** 操作动作，如 create / update / delete / run */
  action: string
  /** 操作对象 */
  target: string
  remark: string
  /** 请求参数（JSON 字符串） */
  params: string
  path: string
  ip: string
  /** 操作时间（字符串 'YYYY-MM-DD HH:mm:ss'） */
  operated_at: string
  /** 创建时间（UTC 秒） */
  create_at: number
  error_message: string
}

/** 操作日志筛选入参（swagger：page / page_size / admin_id / action / resource / start_time / end_time） */
export interface OperationLogParams extends ApiPageParams {
  /** 操作人 ID */
  admin_id?: number
  /** 动作（create/update/delete） */
  action?: string
  /** 资源名 */
  resource?: string
  /** 开始时间（UTC 秒） */
  start_time?: number
  /** 结束时间（UTC 秒） */
  end_time?: number
}

/** 操作日志列表 GET /api/admin/operation-logs */
export function getOperationLogs(params?: OperationLogParams) {
  return http.get<ApiPageResult<OperationLogItem>>('/admin/operation-logs', { ...params })
}

/** 操作日志详情 GET /api/admin/operation-logs/:id */
export function getOperationLogDetail(id: number) {
  return http.get<OperationLogItem>(`/admin/operation-logs/${id}`)
}
