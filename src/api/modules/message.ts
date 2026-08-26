/**
 * 消息通知管理（运营后台端-API设计 §9）
 * - §9.1 站内消息 system:message
 * - §9.2 消息模板 system:message-template
 * - §9.3 短信记录 system:sms-log
 * - §9.4 系统公告（预留） system:announcement
 */
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult, BatchResult, CommonStatus } from '@/types/api'

/* ------------------------------------------------------------------ */
/* §9.1 站内消息（权限 system:message）                                  */
/* ------------------------------------------------------------------ */

/** 站内消息 DTO */
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

/** 消息列表 GET /api/admin/messages（接收者/类型/是否已读/时间） */
export function getMessages(
  params?: ApiPageParams & { receiver_id?: number; message_type?: number; is_read?: 0 | 1 },
) {
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

/** 消息模板 DTO */
export interface MessageTemplateDTO {
  id: number
  template_name: string
  template_code: string
  /** 模板类型 */
  template_type: number
  /** 业务类型 */
  business_type?: string
  /** 触发节点 */
  trigger_node?: string
  /** 接收对象 */
  receiver_targets?: string[]
  /** 微信服务消息模板ID */
  wx_template_id?: string
  content: string
  /** 启用渠道：站内 / 微信 / 短信 */
  channels: string[]
  status: CommonStatus
  updated_at: number
}

/** 模板列表 GET /api/admin/message-templates（按类型/状态） */
export function getMessageTemplates(
  params?: ApiPageParams & { template_type?: number; status?: CommonStatus },
) {
  return http.get<ApiPageResult<MessageTemplateDTO>>('/admin/message-templates', { ...params })
}

/** 模板详情 GET /api/admin/message-templates/:id */
export function getMessageTemplate(id: number) {
  return http.get<MessageTemplateDTO>(`/admin/message-templates/${id}`)
}

/** 新增模板 POST /api/admin/message-templates */
export function createMessageTemplate(data: Omit<MessageTemplateDTO, 'id' | 'updated_at'>) {
  return http.post<null>('/admin/message-templates', data)
}

/** 编辑模板 PUT /api/admin/message-templates/:id */
export function updateMessageTemplate(
  id: number,
  data: Partial<Omit<MessageTemplateDTO, 'id' | 'updated_at'>>,
) {
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

/** 短信发送记录 DTO */
export interface SmsLogDTO {
  id: number
  phone: string
  content: string
  /** 发送状态 */
  status: number
  fail_reason?: string
  created_at: number
}

/** 短信发送记录 GET /api/admin/sms-logs（按手机号/状态/时间） */
export function getSmsLogs(params?: ApiPageParams & { phone?: string; status?: number }) {
  return http.get<ApiPageResult<SmsLogDTO>>('/admin/sms-logs', { ...params })
}

/* ------------------------------------------------------------------ */
/* §9.4 系统公告（预留，权限 system:announcement）                       */
/* ------------------------------------------------------------------ */

/** 系统公告 DTO */
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

/** 公告列表 GET /api/admin/announcements（按类型/发布状态） */
export function getAnnouncements(
  params?: ApiPageParams & { announcement_type?: number; publish_status?: number },
) {
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
