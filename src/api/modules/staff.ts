/**
 * 机构人员管理（swagger：机构与人员-人员 / 机构与人员-岗位）
 * - 工作人员 staff:manage（列表/详情/新增/编辑/软删/在职离职）
 * - 岗位管理 staff:manage（列表/新增/编辑/删除/启停）
 * 注：人员资质随新增/编辑人员的 credentials 数组一并提交（swagger admin.StaffCredentialReq）；
 *     独立的资质证书、排班接口 swagger 未收录，已移除。
 */
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult, CommonStatus } from '@/types/api'

/* ------------------------------------------------------------------ */
/* 工作人员管理（权限 staff:manage）                                     */
/* ------------------------------------------------------------------ */

/** 人员类型：1-医护管理（可登录医护工作台） 2-医护服务 */
export type StaffType = 1 | 2

/** 人员资质（swagger admin.StaffCredentialReq，随人员新增/编辑提交） */
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

/** 人员新增 / 编辑入参（swagger admin.ReqCreateStaff：institution_id / name / phone 必填） */
export interface StaffSaveBody {
  /** 所属机构，必填 */
  institution_id: number
  /** 姓名，必填 */
  name: string
  /** 手机号，必填 */
  phone: string
  /** 1-医护管理 2-医护服务，选填 */
  staff_type?: StaffType
  id_card?: string
  avatar_url?: string | null
  /** 岗位编码（Admin/Doctor/HealthMgr/Caregiver），选填 */
  position_code?: string
  /** 职务，选填 */
  title?: string
  /** 服务 ID 数组，选填 */
  services?: number[]
  /** 资质数组，选填 */
  credentials?: StaffCredentialBrief[]
  /** 1-在职 9-离职，选填 */
  status?: CommonStatus
}

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

/** 在职/离职 POST /api/admin/staffs/:id/status（swagger：body {status, resign_time?}，remark 为 query 选填） */
export function updateStaffStatus(id: number, status: CommonStatus, resignTime?: number, remark?: string) {
  return http.post<null>(`/admin/staffs/${id}/status`, { status, resign_time: resignTime }, { params: { remark } })
}

/** 删除人员 DELETE /api/admin/staffs/:id（软删除；swagger：remark 为 query 选填） */
export function deleteStaff(id: number, remark?: string) {
  return http.delete<null>(`/admin/staffs/${id}`, { remark })
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

/** 岗位新增 / 编辑入参（swagger admin.ReqCreatePosition：position_code / position_name 必填） */
export interface PositionSaveBody {
  position_code: string
  position_name: string
  description?: string
  /** 1-启用 9-禁用，选填 */
  status?: CommonStatus
}

/** 岗位列表 GET /api/admin/positions（swagger：page / page_size） */
export function getPositions(params?: ApiPageParams) {
  return http.get<ApiPageResult<PositionDTO>>('/admin/positions', { ...params })
}

/** 新增岗位 POST /api/admin/positions */
export function createPosition(data: PositionSaveBody) {
  return http.post<null>('/admin/positions', data)
}

/** 编辑岗位 PUT /api/admin/positions/:id */
export function updatePosition(id: number, data: Partial<PositionSaveBody>) {
  return http.put<null>(`/admin/positions/${id}`, data)
}

/** 启用/禁用岗位 POST /api/admin/positions/:id/status（swagger：body {status}，remark 为 query 选填） */
export function updatePositionStatus(id: number, status: CommonStatus, remark?: string) {
  return http.post<null>(`/admin/positions/${id}/status`, { status }, { params: { remark } })
}

/** 删除岗位 DELETE /api/admin/positions/:id（swagger：remark 为 query 选填） */
export function deletePosition(id: number, remark?: string) {
  return http.delete<null>(`/admin/positions/${id}`, { remark })
}
