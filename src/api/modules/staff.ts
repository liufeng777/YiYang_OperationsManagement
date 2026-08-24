/**
 * 机构人员管理（运营后台端-API设计 §3.2 ~ §3.5）
 * - §3.2 工作人员 staff:manage
 * - §3.3 人员资质证书 staff_credentials（staff:credential）
 * - §3.4 岗位管理 staff:manage
 * - §3.5 排班管理（预留，staff:schedule）
 */
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult, CommonStatus } from '@/types/api'

/* ------------------------------------------------------------------ */
/* §3.2 工作人员管理（权限 staff:manage）                                */
/* ------------------------------------------------------------------ */

/** 人员类型：1-医护管理（可登录医护工作台） 2-医护服务 */
export type StaffType = 1 | 2

/** 人员资质（展示冗余片段，独立表见 §3.3） */
export interface StaffCredentialBrief {
  credential_name: string
  clear_level: string
  valid_from: number
  valid_until: number
  issuer: string
  attachment_url: string
}

/** 工作人员 DTO */
export interface StaffDTO {
  id: number
  institution_id: number
  staff_type: StaffType
  name: string
  /** 脱敏手机号 */
  phone: string
  /** 脱敏证件号 */
  id_card: string
  avatar_url: string | null
  position_id: number
  title: string
  /** 服务 ID 数组 */
  services: number[]
  credentials: StaffCredentialBrief[]
  /** 1-在职 9-离职 */
  status: CommonStatus
}

/** 人员新增 / 编辑入参 */
export type StaffSaveBody = Omit<StaffDTO, 'id'>

/** 人员列表 GET /api/admin/staffs（按机构/类型/状态/关键字） */
export function getStaffs(
  params?: ApiPageParams & {
    institution_id?: number
    staff_type?: StaffType
    status?: CommonStatus
  },
) {
  return http.get<ApiPageResult<StaffDTO>>('/admin/staffs', { ...params })
}

/** 人员详情 GET /api/admin/staffs/:id（含资质、服务分类、岗位） */
export function getStaff(id: number) {
  return http.get<StaffDTO>(`/admin/staffs/${id}`)
}

/** 新增人员 POST /api/admin/staffs */
export function createStaff(data: StaffSaveBody) {
  return http.post<null>('/admin/staffs', data)
}

/** 编辑人员 PUT /api/admin/staffs/:id */
export function updateStaff(id: number, data: Partial<StaffSaveBody>) {
  return http.put<null>(`/admin/staffs/${id}`, data)
}

/** 在职/离职 POST /api/admin/staffs/:id/status */
export function updateStaffStatus(id: number, status: CommonStatus, resignTime?: number) {
  return http.post<null>(`/admin/staffs/${id}/status`, { status, resign_time: resignTime })
}

/** 资质管理 POST /api/admin/staffs/:id/credentials（数组全量替换） */
export function saveStaffCredentials(staffId: number, credentials: StaffCredentialBrief[]) {
  return http.post<null>(`/admin/staffs/${staffId}/credentials`, credentials)
}

/** 资质快过期提醒 GET /api/admin/staffs/expiring-credentials（距到期 ≤30 天） */
export function getExpiringCredentials(params?: ApiPageParams) {
  return http.get<ApiPageResult<StaffCredentialDTO>>('/admin/staffs/expiring-credentials', {
    ...params,
  })
}

/* ------------------------------------------------------------------ */
/* §3.3 人员资质证书 staff_credentials（权限 staff:credential）           */
/* ------------------------------------------------------------------ */

/** 资质类型：1-执业证书 2-职称证书 3-培训证书 4-健康证 9-其他 */
export type CredType = 1 | 2 | 3 | 4 | 9

/** 资质证书 DTO */
export interface StaffCredentialDTO {
  id: number
  staff_id: number
  staff_name?: string
  institution_id: number
  cred_type: CredType
  cred_name: string
  cred_no: string
  issue_org: string
  /** 发证日期 UTC 秒 */
  issue_date: number
  /** 到期日期 UTC 秒，NULL 长期有效 */
  expire_date: number | null
  cred_url: string
  /** 1-有效 2-即将到期(≤30天) 9-已过期/作废 */
  status: 1 | 2 | 9
  /** 距到期天数（服务端计算） */
  days_left?: number
  remark?: string
}

/** 资质新增 / 编辑入参 */
export type StaffCredentialSaveBody = Omit<StaffCredentialDTO, 'id' | 'staff_name' | 'days_left'>

/** 资质列表 GET /api/admin/staffs/:staff_id/credentials（按人员查，分页） */
export function getStaffCredentials(staffId: number, params?: ApiPageParams) {
  return http.get<ApiPageResult<StaffCredentialDTO>>(`/admin/staffs/${staffId}/credentials`, {
    ...params,
  })
}

/** 全平台快到期 GET /api/admin/staff-credentials/expiring */
export function getAllExpiringCredentials(
  params?: ApiPageParams & { days?: number; institution_id?: number; status?: number },
) {
  return http.get<ApiPageResult<StaffCredentialDTO>>('/admin/staff-credentials/expiring', {
    ...params,
  })
}

/** 新增资质 POST /api/admin/staff-credentials */
export function createStaffCredential(data: StaffCredentialSaveBody) {
  return http.post<null>('/admin/staff-credentials', data)
}

/** 编辑资质 PUT /api/admin/staff-credentials/:id */
export function updateStaffCredential(id: number, data: Partial<StaffCredentialSaveBody>) {
  return http.put<null>(`/admin/staff-credentials/${id}`, data)
}

/** 启用/作废 POST /api/admin/staff-credentials/:id/status（9-已过期/作废） */
export function updateStaffCredentialStatus(id: number, status: 1 | 9, remark?: string) {
  return http.post<null>(`/admin/staff-credentials/${id}/status`, { status, remark })
}

/** 删除资质 DELETE /api/admin/staff-credentials/:id（软删） */
export function deleteStaffCredential(id: number) {
  return http.delete<null>(`/admin/staff-credentials/${id}`)
}

/* ------------------------------------------------------------------ */
/* §3.4 岗位管理（权限 staff:manage）                                    */
/* ------------------------------------------------------------------ */

/** 岗位 DTO */
export interface PositionDTO {
  id: number
  institution_id: number
  position_name: string
  position_code: string
  description?: string
  status: CommonStatus
}

/** 岗位列表 GET /api/admin/positions（按机构过滤） */
export function getPositions(params?: { institution_id?: number }) {
  return http.get<PositionDTO[]>('/admin/positions', { ...params })
}

/** 新增岗位 POST /api/admin/positions */
export function createPosition(data: Omit<PositionDTO, 'id'>) {
  return http.post<null>('/admin/positions', data)
}

/** 编辑岗位 PUT /api/admin/positions/:id */
export function updatePosition(id: number, data: Partial<Omit<PositionDTO, 'id'>>) {
  return http.put<null>(`/admin/positions/${id}`, data)
}

/** 启用/禁用岗位 POST /api/admin/positions/:id/status */
export function updatePositionStatus(id: number, status: CommonStatus) {
  return http.post<null>(`/admin/positions/${id}/status`, { status })
}

/** 删除岗位 DELETE /api/admin/positions/:id */
export function deletePosition(id: number) {
  return http.delete<null>(`/admin/positions/${id}`)
}

/* ------------------------------------------------------------------ */
/* §3.5 排班管理（预留，权限 staff:schedule）                            */
/* ------------------------------------------------------------------ */

/** 排班 DTO */
export interface ScheduleDTO {
  id: number
  staff_id: number
  staff_name?: string
  institution_id: number
  /** yyyy-MM-dd */
  schedule_date: string
  shift_type: number
  start_time: string
  end_time: string
  is_rest: 0 | 1
  note?: string
}

/** 排班列表 GET /api/admin/schedules（日历视图） */
export function getSchedules(params: {
  institution_id?: number
  staff_id?: number
  start_date: string
  end_date: string
  view?: 'day' | 'week' | 'month'
}) {
  return http.get<ApiPageResult<ScheduleDTO>>('/admin/schedules', { ...params })
}

/** 新增排班 POST /api/admin/schedules（批量） */
export function createSchedules(list: Array<Omit<ScheduleDTO, 'id' | 'staff_name'>>) {
  return http.post<null>('/admin/schedules', { list })
}

/** 编辑排班 PUT /api/admin/schedules/:id */
export function updateSchedule(id: number, data: Partial<Omit<ScheduleDTO, 'id' | 'staff_name'>>) {
  return http.put<null>(`/admin/schedules/${id}`, data)
}

/** 删除排班 DELETE /api/admin/schedules/:id */
export function deleteSchedule(id: number) {
  return http.delete<null>(`/admin/schedules/${id}`)
}
