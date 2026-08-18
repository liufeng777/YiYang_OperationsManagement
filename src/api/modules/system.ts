import { http } from '@/utils/request'
import type { PageParams, PageResult } from '@/types/api'

/** 平台用户 */
export interface AccountItem {
  id: string
  /** 登录账号，如 chen.yunying */
  username: string
  name: string
  roleName: string
  /** 脱敏手机号，如 138****1026 */
  phone: string
  /** 登录方式，如 账号密码 */
  loginType: string
  enabled: boolean
  /** 最近登录展示，如 今日 09:12 */
  lastLoginTime: string
  creator: string
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

/** 账号分页列表 */
export function getAccountList(params: PageParams & { keyword?: string }) {
  return http.get<PageResult<AccountItem>>('/system/account/list', { ...params })
}

/** 新增 / 编辑用户 */
export function saveAccount(data: Partial<AccountItem>) {
  return data.id
    ? http.put<null>('/system/account/update', data)
    : http.post<null>('/system/account/create', data)
}

/** 启用 / 停用用户 */
export function toggleAccount(id: string, enabled: boolean) {
  return http.post<null>(`/system/account/${id}/toggle`, { enabled })
}

/** 角色列表 */
export function getRoleList() {
  return http.get<RoleItem[]>('/system/role/list')
}

/** 保存角色权限 */
export function saveRole(data: Partial<RoleItem>) {
  return http.post<null>('/system/role/save', data)
}

/** 消息模板列表 */
export function getMessageTemplateList(params: PageParams) {
  return http.get<PageResult<MessageTemplateItem>>('/system/message/list', { ...params })
}

/** 保存消息模板文案与渠道 */
export function saveMessageTemplate(data: Partial<MessageTemplateItem>) {
  return http.post<null>('/system/message/save', data)
}

/** 系统公告分页列表 */
export function getAnnouncementList(params: PageParams) {
  return http.get<PageResult<AnnouncementItem>>('/system/announcement/list', { ...params })
}

/** 保存系统公告 */
export function saveAnnouncement(data: Partial<AnnouncementItem>) {
  return http.post<null>('/system/announcement/save', data)
}

/** 帮助与电话配置 */
export function saveHelpConfig(data: Record<string, string>) {
  return http.post<null>('/system/help/save', data)
}

/** 常见问题列表 */
export function getFaqList(params: PageParams) {
  return http.get<PageResult<FaqItem>>('/system/faq/list', { ...params })
}

/** 协议版本列表 */
export function getAgreementList(params: PageParams) {
  return http.get<PageResult<AgreementItem>>('/system/agreement/list', { ...params })
}

/** 保存协议版本（新建草稿 / 发布） */
export function saveAgreement(data: Partial<AgreementItem>) {
  return http.post<null>('/system/agreement/save', data)
}

/** 操作日志分页列表 */
export function getLogList(params: PageParams) {
  return http.get<PageResult<LogItem>>('/system/log/list', { ...params })
}
