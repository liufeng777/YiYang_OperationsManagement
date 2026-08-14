import { http } from '@/utils/request'
import type { PageParams, PageResult } from '@/types/api'

export interface AccountItem {
  id: number
  username: string
  nickname: string
  roleId: number
  status: number
  lastLoginTime: string
}

export interface RoleItem {
  id: number
  name: string
  permissions: string[]
}

export interface LogItem {
  id: number
  operator: string
  action: string
  ip: string
  createdAt: string
}

/** 账号分页列表 */
export function getAccountList(params: PageParams) {
  return http.get<PageResult<AccountItem>>('/system/account/list', { ...params })
}

/** 角色列表 */
export function getRoleList() {
  return http.get<RoleItem[]>('/system/role/list')
}

/** 保存角色 */
export function saveRole(data: Partial<RoleItem>) {
  return http.post<null>('/system/role/save', data)
}

/** 操作日志分页列表 */
export function getLogList(params: PageParams) {
  return http.get<PageResult<LogItem>>('/system/log/list', { ...params })
}
