/**
 * 线索、咨询、预约（运营后台端-API设计 §8.3）
 * 权限 lead:manage / lead:consult；线索状态枚举见共通 §6.5
 */
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult, BatchResult } from '@/types/api'

/**
 * 线索状态（共通 §6.5）：
 * 1-新线索 2-已联系 3-有意向 4-洽谈中 5-已转化 6-已流失 9-已忽略
 */
export type LeadStatus = 1 | 2 | 3 | 4 | 5 | 6 | 9

/** 线索转派留痕（leads.transfer_records JSON 内嵌） */
export interface LeadTransferRecord {
  from_staff_id: number
  from_staff_name: string
  to_staff_id: number
  to_staff_name: string
  operator_id: number
  operator_name: string
  reason: string
  time: number
}

/** 线索跟进记录 */
export interface LeadFollowup {
  time: number
  operator: string
  content: string
  followup_type?: string
  result?: string
}

/** 线索 DTO */
export interface LeadDTO {
  id: number
  lead_no: string
  institution_id: number
  /** 来源类型：活动/咨询/预约/转介绍/地推/线上 */
  source_type: number
  source_id: number
  contact_name: string
  contact_phone: string
  demand_type: number
  demand_detail: string
  status: LeadStatus
  priority: number
  owner_staff_id: number | null
  owner_staff_name: string | null
  /** 分配/指定负责人时间 UTC 秒 */
  assign_at: number | null
  transfer_records: LeadTransferRecord[]
  followups: LeadFollowup[]
  converted_member_id: number | null
  converted_at: number | null
  created_by: number
  created_at: number
}

/** 线索列表 GET /api/admin/leads（按来源/状态/机构/优先级） */
export function getLeads(
  params?: ApiPageParams & {
    source_type?: number
    status?: LeadStatus
    institution_id?: number
    priority?: number
  },
) {
  return http.get<ApiPageResult<LeadDTO>>('/admin/leads', { ...params })
}

/** 线索详情 GET /api/admin/leads/:id（含跟进记录、转化信息） */
export function getLead(id: number) {
  return http.get<LeadDTO>(`/admin/leads/${id}`)
}

/** 新增线索 POST /api/admin/leads（现场录入） */
export function createLead(data: Partial<LeadDTO>) {
  return http.post<null>('/admin/leads', data)
}

/** 编辑线索（归属机构）PUT /api/admin/leads/:id/assign（自动/手动/转派） */
export function assignLead(id: number, data: { institution_id?: number; owner_staff_id?: number }) {
  return http.put<null>(`/admin/leads/${id}/assign`, data)
}

/** 线索跟进记录 POST /api/admin/leads/:id/followup */
export function addLeadFollowup(
  id: number,
  data: { followup_type: string; content: string; operator: string; result?: string },
) {
  return http.post<null>(`/admin/leads/${id}/followup`, data)
}

/** 线索转派 POST /api/admin/leads/:id/transfer（留痕） */
export function transferLead(id: number, newOwnerStaffId: number, reason: string) {
  return http.post<null>(`/admin/leads/${id}/transfer`, {
    new_owner_staff_id: newOwnerStaffId,
    reason,
  })
}

/** 线索批量转派 POST /api/admin/leads/batch-transfer（逐条留痕） */
export function batchTransferLeads(leadIds: number[], newOwnerStaffId: number, reason: string) {
  return http.post<BatchResult>('/admin/leads/batch-transfer', {
    lead_ids: leadIds,
    new_owner_staff_id: newOwnerStaffId,
    reason,
  })
}

/** 线索转化为会员 POST /api/admin/leads/:id/convert */
export function convertLead(id: number, memberId: number) {
  return http.post<null>(`/admin/leads/${id}/convert`, { member_id: memberId })
}

/** 线索流失/无效 POST /api/admin/leads/:id/lost，body {status:6|9, reason} */
export function loseLead(id: number, status: 6 | 9, reason: string) {
  return http.post<null>(`/admin/leads/${id}/lost`, { status, reason })
}

/** 线索 Excel 导入 POST /api/admin/leads/import（模板下载 + 字段映射 + 手机号去重） */
export function importLeads(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return http.post<{ success: number; fail: number; fail_list: Array<{ row: number; reason: string }> }>(
    '/admin/leads/import',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
}

/* ------------------------------------------------------------------ */
/* 咨询与预约（仅列表查看）                                              */
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
