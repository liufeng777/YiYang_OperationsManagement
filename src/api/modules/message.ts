/**
 * 消息通知管理（运营后台端-API设计 §9）
 * - §9.1 站内消息 system:message
 * - §9.2 消息模板 system:message-template
 * - §9.3 短信记录 system:sms-log
 * - §9.4 系统公告（预留） system:announcement
 * 说明：DTO 按后端**实测返回**对齐；未返回数据的接口（messages / sms-logs / announcements）字段沿用接口文档契约。
 *
 * 实测要点：
 * - 消息模板列表实测字段为 id / name / code / content / channel(数字) / type(数字) / status / variables，
 *   与文档中的 template_name / template_code 命名不同，此处按实测。
 *
 * 筛选约定：列表页筛选条件**全部下推后端**（前端不做本地过滤），相关入参已在此声明。
 */
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult, BatchResult, CommonStatus } from '@/types/api'

/* ------------------------------------------------------------------ */
/* §9.1 站内消息（权限 system:message）                                  */
/* ------------------------------------------------------------------ */

/** 站内消息 DTO（后端当前列表为空，字段按接口文档契约） */
export interface MessageDTO {
  id: number
  title: string
  content: string
  /** 消息类型 */
  message_type: number
  /** 接收者 ID（群发时为 null） */
  receiver_id: number | null
  receiver_name?: string
  /** 是否已读：0-未读 1-已读 */
  is_read: 0 | 1
  created_at: number
}

/** 发送站内消息入参（指定/批量/群发） */
export interface MessageSendBody {
  title: string
  content: string
  message_type: number
  /** 指定接收者 ID 数组；群发传空 */
  receiver_ids?: number[]
}

/** 消息列表筛选入参 */
export interface MessageListParams extends ApiPageParams {
  receiver_id?: number
  message_type?: number
  is_read?: 0 | 1
  /** 标题 / 接收者关键字 */
  keyword?: string
}

/** 消息列表 GET /api/admin/messages（接收者/类型/是否已读/时间） */
export function getMessages(params?: MessageListParams) {
  return http.get<ApiPageResult<MessageDTO>>('/admin/messages', { ...params })
}

/** 消息详情 GET /api/admin/messages/:id */
export function getMessage(id: number) {
  return http.get<MessageDTO>(`/admin/messages/${id}`)
}

/** 发送站内消息 POST /api/admin/messages */
export function sendMessage(data: MessageSendBody) {
  return http.post<null>('/admin/messages', data)
}

/** 推送微信 POST /api/admin/messages/:id/push（微信模板消息渠道） */
export function pushMessage(id: number) {
  return http.post<null>(`/admin/messages/${id}/push`)
}

/** 批量微信推送 POST /api/admin/messages/batch-push */
export function batchPushMessages(messageIds: number[]) {
  return http.post<BatchResult>('/admin/messages/batch-push', { message_ids: messageIds })
}

/* ------------------------------------------------------------------ */
/* §9.2 消息模板管理（权限 system:message-template）                     */
/* ------------------------------------------------------------------ */

/** 消息模板 DTO（字段按后端实测） */
export interface MessageTemplateDTO {
  id: number
  /** 模板名称 */
  name: string
  /** 模板编码，如 ORDER_PAID / WORK_START */
  code: string
  content: string
  /** 发送渠道（后端返回数字：1-站内 2-微信 3-短信） */
  channel: number
  /** 模板类型（后端返回数字：1-订单支付成功 2-服务开始提醒） */
  type: number
  status: CommonStatus
  /** 模板变量说明（后端当前为空字符串） */
  variables?: string
}

/** 模板列表筛选入参 */
export interface MessageTemplateParams extends ApiPageParams {
  template_type?: number
  status?: CommonStatus
  /** 模板名称 / 编码关键字 */
  keyword?: string
}

/** 模板列表 GET /api/admin/message-templates（按类型/状态） */
export function getMessageTemplates(params?: MessageTemplateParams) {
  return http.get<ApiPageResult<MessageTemplateDTO>>('/admin/message-templates', { ...params })
}

/** 模板详情 GET /api/admin/message-templates/:id */
export function getMessageTemplate(id: number) {
  return http.get<MessageTemplateDTO>(`/admin/message-templates/${id}`)
}

/** 新增模板 POST /api/admin/message-templates */
export function createMessageTemplate(data: Omit<MessageTemplateDTO, 'id'>) {
  return http.post<null>('/admin/message-templates', data)
}

/** 编辑模板 PUT /api/admin/message-templates/:id */
export function updateMessageTemplate(id: number, data: Partial<Omit<MessageTemplateDTO, 'id'>>) {
  return http.put<null>(`/admin/message-templates/${id}`, data)
}

/** 启停模板 POST /api/admin/message-templates/:id/status */
export function updateMessageTemplateStatus(id: number, status: CommonStatus) {
  return http.post<null>(`/admin/message-templates/${id}/status`, { status })
}

/** 删除模板 DELETE /api/admin/message-templates/:id */
export function deleteMessageTemplate(id: number) {
  return http.delete<null>(`/admin/message-templates/${id}`)
}

/* ------------------------------------------------------------------ */
/* §9.3 短信记录（权限 system:sms-log，仅查看）                          */
/* ------------------------------------------------------------------ */

/** 短信发送记录 DTO（后端当前列表为空，字段按接口文档契约） */
export interface SmsLogDTO {
  id: number
  phone: string
  content: string
  /** 发送状态：1-成功 2-失败 9-未送达 */
  status: number
  fail_reason?: string
  created_at: number
}

/** 短信记录筛选入参 */
export interface SmsLogParams extends ApiPageParams {
  /** 手机号关键字 */
  phone?: string
  status?: number
  start_time?: number
  end_time?: number
}

/** 短信发送记录 GET /api/admin/sms-logs（按手机号/状态/时间） */
export function getSmsLogs(params?: SmsLogParams) {
  return http.get<ApiPageResult<SmsLogDTO>>('/admin/sms-logs', { ...params })
}

/* ------------------------------------------------------------------ */
/* §9.4 系统公告（预留，权限 system:announcement）                       */
/* ------------------------------------------------------------------ */

/** 系统公告 DTO（后端当前列表为空，字段按接口文档契约） */
export interface AnnouncementDTO {
  id: number
  title: string
  content: string
  announcement_type: number
  priority: number
  cover_image?: string
  publish_scope: string
  target_ids?: number[]
  expires_at: number | null
  /** 1-草稿 2-已发布 3-已撤回 */
  publish_status: 1 | 2 | 3
  published_at: number | null
}

/** 公告新增 / 编辑入参 */
export type AnnouncementSaveBody = Omit<AnnouncementDTO, 'id' | 'publish_status' | 'published_at'>

/** 公告列表筛选入参 */
export interface AnnouncementParams extends ApiPageParams {
  announcement_type?: number
  publish_status?: number
  /** 公告标题关键字 */
  keyword?: string
}

/** 公告列表 GET /api/admin/announcements（按类型/发布状态） */
export function getAnnouncements(params?: AnnouncementParams) {
  return http.get<ApiPageResult<AnnouncementDTO>>('/admin/announcements', { ...params })
}

/** 公告详情 GET /api/admin/announcements/:id */
export function getAnnouncement(id: number) {
  return http.get<AnnouncementDTO>(`/admin/announcements/${id}`)
}

/** 新增公告 POST /api/admin/announcements */
export function createAnnouncement(data: AnnouncementSaveBody) {
  return http.post<null>('/admin/announcements', data)
}

/** 编辑公告 PUT /api/admin/announcements/:id */
export function updateAnnouncement(id: number, data: Partial<AnnouncementSaveBody>) {
  return http.put<null>(`/admin/announcements/${id}`, data)
}

/** 发布公告 POST /api/admin/announcements/:id/publish（置 publish_status=2） */
export function publishAnnouncement(id: number) {
  return http.post<null>(`/admin/announcements/${id}/publish`)
}

/** 撤回公告 POST /api/admin/announcements/:id/withdraw */
export function withdrawAnnouncement(id: number) {
  return http.post<null>(`/admin/announcements/${id}/withdraw`)
}

/** 删除公告 DELETE /api/admin/announcements/:id */
export function deleteAnnouncement(id: number) {
  return http.delete<null>(`/admin/announcements/${id}`)
}
