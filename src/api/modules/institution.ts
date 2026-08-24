/**
 * 机构管理（运营后台端-API设计 §3.1 + §5.4）
 * - §3.1 机构管理 institution:manage
 * - §5.4 机构服务关联配置 institution_services（service:manage）
 * 说明：上半部分为页面展示用类型（mock），下半部分 DTO 对齐文档契约。
 */
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult, BatchResult, CommonStatus } from '@/types/api'

/* ------------------------------------------------------------------ */
/* 页面展示类型（mock，接后端后逐步切换到下方 DTO）                       */
/* ------------------------------------------------------------------ */

/** 同步状态：synced=已同步 updating=更新中 */
export type SyncStatus = 'synced' | 'updating'

/** 经营状态：normal=正常经营 pending=资料待完善 paused=暂停经营 */
export type OperationStatus = 'normal' | 'pending' | 'paused'

/** 机构列表项 */
export interface InstitutionItem {
  id: string
  /** 机构编码：JG0001 */
  code: string
  name: string
  /** 机构类型：健康驿站 / 护理院 */
  type: string
  /** 机构来源 */
  source: string
  /** 所在区域：拱墅区 */
  region: string
  /** 所在街道：申花街道 */
  street: string
  /** 详细地址 */
  address: string
  contactPhone: string
  /** 已配服务数 */
  serviceCount: number
  /** 商品数 */
  productCount: number
  /** 服务数 */
  serviceTotal: number
  syncStatus: SyncStatus
  operationStatus: OperationStatus
}

/** 机构已添加服务 */
export interface InstitutionService {
  id: string
  /** 服务编码：FW0001 */
  code: string
  name: string
  category: string
  /** 服务方式：上门 / 到店 */
  mode: '上门' | '到店'
  /** 集团定价（元/次） */
  price: number
  /** 配置来源 */
  configSource: '机构默认' | '单项调整'
  /** 线上履约范围 */
  range: string
  status: '可预约' | '待上架' | '已下架'
}

/** 集团服务池项目 */
export interface ServicePoolItem {
  id: string
  code: string
  name: string
  category: string
  mode: '上门' | '到店'
  price: number
  status: '可预约' | '待上架' | '已下架'
}

/** 患者端介绍 */
export interface InstitutionIntro {
  displayTitle: string
  description: string
  tags: string[]
  visible: boolean
  coverUrl?: string
  photos: string[]
}

/** 机构详情 */
export interface InstitutionDetail extends InstitutionItem {
  lastSyncTime: string
  onlineRange: string
  intro: InstitutionIntro
}

/* ------------------------------------------------------------------ */
/* §3.1 机构管理（权限 institution:manage）                              */
/* ------------------------------------------------------------------ */

/** 机构类型：1-护理院 2-驿站 */
export type InstitutionType = 1 | 2

/** 机构 DTO（映射 institutions，含服务半径扩展） */
export interface InstitutionDTO {
  id: number
  name: string
  name_en: string | null
  type: InstitutionType
  address: string
  province: string
  city: string
  district: string
  lng: number | null
  lat: number | null
  /** 服务半径 km，NULL=不限 */
  service_radius_km: number | null
  contact_phone: string
  manager_name: string
  manager_phone: string
  /** 1-启用 9-禁用 */
  status: CommonStatus
  created_at: number
}

/** 机构新增 / 编辑入参 */
export type InstitutionSaveBody = Omit<InstitutionDTO, 'id' | 'created_at'>

/** 机构列表 GET /api/admin/institutions（按类型/状态/关键字） */
export function getInstitutions(
  params?: ApiPageParams & { type?: InstitutionType; status?: CommonStatus },
) {
  return http.get<ApiPageResult<InstitutionDTO>>('/admin/institutions', { ...params })
}

/** 机构详情 GET /api/admin/institutions/:id */
export function getInstitution(id: number) {
  return http.get<InstitutionDTO>(`/admin/institutions/${id}`)
}

/** 新增机构 POST /api/admin/institutions */
export function createInstitution(data: InstitutionSaveBody) {
  return http.post<null>('/admin/institutions', data)
}

/** 编辑机构 PUT /api/admin/institutions/:id */
export function updateInstitution(id: number, data: Partial<InstitutionSaveBody>) {
  return http.put<null>(`/admin/institutions/${id}`, data)
}

/** 启用/禁用 POST /api/admin/institutions/:id/status */
export function updateInstitutionStatus(id: number, status: CommonStatus) {
  return http.post<null>(`/admin/institutions/${id}/status`, { status })
}

/** 批量启用/禁用 POST /api/admin/institutions/batch-status */
export function batchUpdateInstitutionStatus(ids: number[], status: CommonStatus) {
  return http.post<BatchResult>('/admin/institutions/batch-status', { ids, status })
}

/** 服务半径变更 POST /api/admin/institutions/:id/radius（备用） */
export function updateInstitutionRadius(id: number, radiusKm: number, note?: string) {
  return http.post<null>(`/admin/institutions/${id}/radius`, { radius_km: radiusKm, note })
}

/* ------------------------------------------------------------------ */
/* §5.4 机构服务关联配置 institution_services（权限 service:manage）      */
/* ------------------------------------------------------------------ */

/** 机构服务关联 DTO */
export interface InstitutionServiceDTO {
  id: number
  institution_id: number
  service_id: number
  /** 平铺关联展示（共通 §1.4） */
  service_name?: string
  /** 1-上门 2-非上门（默认上门） */
  is_home_service: 1 | 2
  /** 机构特定价（元），NULL 沿用 services.price */
  price_override: number | null
  sort: number
  /** 机构维度上下架：1-上架 9-下架 */
  status: CommonStatus
}

/** 机构服务关联新增 / 编辑入参 */
export type InstitutionServiceSaveBody = Omit<InstitutionServiceDTO, 'id' | 'service_name'>

/** 机构服务列表 GET /api/admin/institutions/:id/services */
export function getInstitutionServiceList(
  institutionId: number,
  params?: ApiPageParams & { service_id?: number; status?: CommonStatus },
) {
  return http.get<ApiPageResult<InstitutionServiceDTO>>(
    `/admin/institutions/${institutionId}/services`,
    { ...params },
  )
}

/** 关联详情 GET /api/admin/institution-services/:id */
export function getInstitutionService(id: number) {
  return http.get<InstitutionServiceDTO>(`/admin/institution-services/${id}`)
}

/** 新增机构服务关联 POST /api/admin/institution-services */
export function createInstitutionService(data: InstitutionServiceSaveBody) {
  return http.post<null>('/admin/institution-services', data)
}

/** 编辑关联 PUT /api/admin/institution-services/:id（改机构特定价/排序/上门标记） */
export function updateInstitutionService(id: number, data: Partial<InstitutionServiceSaveBody>) {
  return http.put<null>(`/admin/institution-services/${id}`, data)
}

/** 机构服务上下架 POST /api/admin/institution-services/:id/status */
export function updateInstitutionServiceStatus(id: number, status: CommonStatus) {
  return http.post<null>(`/admin/institution-services/${id}/status`, { status })
}

/** 删除关联 DELETE /api/admin/institution-services/:id（软删，校验无在途订单引用） */
export function deleteInstitutionService(id: number) {
  return http.delete<null>(`/admin/institution-services/${id}`)
}

/** 批量同步 POST /api/admin/institutions/:id/services/sync（一次开通/回收多个服务） */
export function syncInstitutionServices(institutionId: number, serviceIds: number[]) {
  return http.post<BatchResult>(`/admin/institutions/${institutionId}/services/sync`, {
    service_ids: serviceIds,
  })
}
