/**
 * 线索（Lead）模块 — admin 端
 * 权威依据：《线索-前端对接与测试指南》（2026-09-26，对齐 gateway/shared/lead.go、lead_auto_job.go）
 * 网关前缀 /api/v1/admin（dev 代理由 /api 统一补 /v1，见 vite.config.ts）
 * 权限：lead:view（列表/详情）/ lead:edit（新增/认领/跟进）/ lead:manage（转派/转化/流失/导入/导出）
 */
import { http } from '@/utils/request'
import type { AxiosResponse } from 'axios'
import type { ApiPageParams, ApiPageResult } from '@/types/api'

/**
 * 线索状态（指南 §2.1）：
 * 1-待跟进 2-跟进中 3-已转化 4-转化失败 9-流失
 * 3/9 为终态（不可再认领/跟进/转派/转化/变更状态）；旧口径「6-流失」已废弃，禁止传 6
 */
export type LeadStatus = 1 | 2 | 3 | 4 | 9

/** 跟进方式（指南 §2.4，跟进记录 action）：1-语音 2-文字 3-视频 4-在店 5-上门 */
export type LeadFollowupType = 1 | 2 | 3 | 4 | 5

/** 跟进履历元素（指南 §4.11 followup_records） */
export interface LeadFollowupRecord {
  /** 跟进时间 UTC 秒 */
  ts: number
  /** 跟进方式（LeadFollowupType） */
  action: number
  /** 跟进内容 */
  remark: string
  operator: number | string
  operator_name?: string
  next_followup?: number
}

/** 转派履历元素（指南 §4.11 transfer_records，leads 行内嵌 JSON，字段宽松兼容） */
export interface LeadTransferRecord {
  from_staff_id?: number
  from_staff_name?: string
  to_staff_id?: number
  to_staff_name?: string
  operator_id?: number
  operator_name?: string
  reason?: string
  time?: number
}

/** 线索 DTO（指南 §4.11 基础字段，列表与详情同构） */
export interface LeadDTO {
  id: number
  lead_no: string
  /** 联系人姓名 */
  name: string
  /** 联系电话 */
  phone: string
  /** 来源类型（指南 §2.2） */
  source_type: number
  source_id: number
  /** 任务类型：1-未注册客户 2-未绑定健康对象 3-无健管师客户 4-非活跃客户 */
  task_type: number
  institution_id: number
  status: LeadStatus
  /** 认领/负责人员工 ID（0 表示待认领） */
  assignee: number
  assignee_name: string
  remark: string
  /** 认领/转派时间 UTC 秒（超时失败判定起点） */
  assign_at?: number
  member_id?: number
  user_id?: number
  converted_at?: number
  created_at: number
}

/** 线索详情 DTO = 基础字段 + 服务端反查增强（指南 §4.11，增强字段永不为 null） */
export interface LeadDetailDTO extends LeadDTO {
  /** 关联用户昵称（user_id 反查，无则 ""） */
  user_nickname: string
  /** 关联会员姓名（member_id 反查，无则 ""） */
  member_name: string
  /** 来源名：活动标题 / 咨询问题(截50字) / 预约意向服务等，无则 "" */
  source_name: string
  followup_records: LeadFollowupRecord[]
  transfer_records: LeadTransferRecord[]
}

/** 线索列表查询参数（指南 §4.1：keyword 按姓名/手机号模糊） */
export interface LeadListParams extends ApiPageParams {
  keyword?: string
  status?: LeadStatus
  source_type?: number
  institution_id?: number
}

/** 线索列表 GET /admin/leads（lead:view） */
export function getLeads(params?: LeadListParams) {
  return http.get<ApiPageResult<LeadDTO>>('/admin/leads', { ...params })
}

/** 线索详情 GET /admin/leads/:id（lead:view，含反查增强字段与履历） */
export function getLead(id: number) {
  return http.get<LeadDetailDTO>(`/admin/leads/${id}`)
}

/** 新增线索 POST /admin/leads（lead:edit；name/phone 必填，返回 {id}） */
export function createLead(data: {
  name: string
  phone: string
  source_type?: number
  source_id?: number
  institution_id?: number
  remark?: string
}) {
  return http.post<{ id: number }>('/admin/leads', data)
}

/**
 * 认领 PUT /admin/leads/:id/assign（lead:edit）
 * body {assignee: 员工ID}；仅 1-待跟进 / 4-转化失败 可认领，成功后 → 2-跟进中
 */
export function assignLead(id: number, assignee: number) {
  return http.put<null>(`/admin/leads/${id}/assign`, { assignee })
}

/**
 * 跟进 POST /admin/leads/:id/followup（lead:edit）
 * 仅 2-跟进中 可跟进；跟进人由 JWT 登录态落库，前端无需传 operator
 */
export function addLeadFollowup(
  id: number,
  data: { followup_type: LeadFollowupType; content: string; result?: string },
) {
  return http.post<null>(`/admin/leads/${id}/followup`, data)
}

/**
 * 转派 POST /admin/leads/:id/transfer（lead:manage，留痕）
 * body {new_assignee, reason?}；仅 1/2/4 可转派，转派后统一 → 2-跟进中
 */
export function transferLead(id: number, newAssignee: number, reason?: string) {
  return http.post<null>(`/admin/leads/${id}/transfer`, {
    new_assignee: newAssignee,
    reason,
  })
}

/**
 * 批量转派 POST /admin/leads/batch-transfer（lead:manage）
 * body {lead_ids, new_assignee, reason?}；终态 3/9 行服务端静默跳过，其余 → 2-跟进中
 */
export function batchTransferLeads(leadIds: number[], newAssignee: number, reason?: string) {
  return http.post<null>('/admin/leads/batch-transfer', {
    lead_ids: leadIds,
    new_assignee: newAssignee,
    reason,
  })
}

/**
 * 转化复核 POST /admin/leads/:id/convert（lead:manage，无 body，仅 1/2 可发起）
 * 单条手动刷新转化结果：服务端按 task_type 自动判定，达成 → 3-已转化并回填 member_id/user_id/converted_at；
 * 未达成状态不变。只判转化、不判超时失败（2→4 为定时任务 LeadAutoScan 职责）
 */
export function convertLead(id: number) {
  return http.post<{ note?: string } | null>(`/admin/leads/${id}/convert`)
}

/**
 * 流失/无效 POST /admin/leads/:id/lost（lead:manage）
 * body {status: 9, reason?}；权威口径 9-流失（6 已废弃禁用）；仅 1/2/4 可标记，终态报错
 */
export function loseLead(id: number, reason?: string) {
  return http.post<null>(`/admin/leads/${id}/lost`, { status: 9, reason })
}

/**
 * CSV 导入 POST /admin/leads/import（lead:manage）
 * multipart 字段 file，仅 .csv；表头兼容 name/姓名/联系人、phone/电话/手机号/联系电话；
 * 重复手机号（库内活跃线索 / 同批内）跳过不报错，整体算成功
 */
export function importLeads(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return http.post<unknown>('/admin/leads/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/**
 * CSV 导出 GET /admin/leads/export（lead:manage）
 * 返回 CSV 文件流（非 JSON 信封），过滤参数与列表一致；
 * blob 响应经拦截器返回完整 AxiosResponse，由调用方取 data 触发下载
 */
export function exportLeads(params?: LeadListParams) {
  return http.get<AxiosResponse<Blob>>('/admin/leads/export', { ...params }, { responseType: 'blob' })
}

/* ------------------------------------------------------------------ */
/* 咨询与预约（运营后台端-API设计 §8.3，仅列表查看，新指南未覆盖，暂保留）      */
/* ------------------------------------------------------------------ */

/** 咨询记录 DTO */
export interface ConsultationDTO {
  id: number
  member_id: number
  member_name: string
  consult_type: number
  status: number
  content: string
  created_at: number
}

/** 咨询列表 GET /api/admin/consultations（按类型/状态/时间） */
export function getConsultations(
  params?: ApiPageParams & { consult_type?: number; status?: number; start_time?: number; end_time?: number },
) {
  return http.get<ApiPageResult<ConsultationDTO>>('/admin/consultations', { ...params })
}

/** 预约记录 DTO（状态见共通 §6.6） */
export interface AppointmentDTO {
  id: number
  member_id: number
  member_name: string
  institution_id: number
  /** yyyy-MM-dd */
  appointment_date: string
  /** 1-待确认 2-已确认 3-已到院 4-已完成 6-已取消 7-未到 */
  status: 1 | 2 | 3 | 4 | 6 | 7
  created_at: number
}

/** 预约列表 GET /api/admin/appointments（按机构/状态/日期） */
export function getAppointments(
  params?: ApiPageParams & { institution_id?: number; status?: number; appointment_date?: string },
) {
  return http.get<ApiPageResult<AppointmentDTO>>('/admin/appointments', { ...params })
}
