/**
 * 机构管理（运营后台端-API设计 §3.1 + §5.4）
 * - §3.1 机构管理 institution:manage
 * - §5.4 机构服务关联配置 institution_services（service:manage）
 * 说明：上半部分为页面展示用类型（mock），下半部分 DTO 对齐文档契约。
 */
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult, BatchResult, CommonStatus } from '@/types/api';

/* ------------------------------------------------------------------ */
/* §3.1 机构管理（权限 institution:manage）                              */
/* ------------------------------------------------------------------ */

/** 机构类型：1-护理院 2-驿站 */
export type InstitutionType = 1 | 2
export type InstitutionStatus = 1 | 9

/** 机构 DTO（映射 institutions，含服务半径扩展） */
export interface InstitutionItem {
  id: number
  code: string
  address: string
  brief: string // 患者端展示标题 varchar(64)，如：幸福颐养护理院 · 专业照护，安心颐养
  description: string // 机构介绍
  name: string
  name_en: string | null
  type: InstitutionType
  province: string // 省
  city: string // 市
  district: string // 区
  /** 服务半径 km，NULL=不限 */
  service_radius_km: number | null
  cover_url: string; // 封面图片
  /** 环境照片（后端返回） */
  images?: string[]
  latitude?: number
  longitude?: number
  contact_phone: string
  manager_name: string
  manager_phone: string
  /** 1-启用 9-禁用 */
  status: InstitutionStatus
  created_at: number
}

/** 机构新增 / 编辑入参 */
export type InstitutionSaveBody = Omit<InstitutionItem, 'id' | 'code' | 'created_at'>

/** 机构列表 GET /api/admin/institutions（按类型/状态/关键字(名称、地址)） */
export function getInstitutions(
  params?: ApiPageParams & { keyword?: string, type?: InstitutionType; status?: InstitutionStatus },
) {
  return http.get<ApiPageResult<InstitutionItem>>('/admin/institutions', { ...params })
}

/** 机构详情 GET /api/admin/institutions/:id */
export function getInstitution(id: number) {
  return http.get<InstitutionItem>(`/admin/institutions/${id}`)
}

/** 新增机构 POST /api/admin/institutions */
export function createInstitution(data: InstitutionSaveBody) {
  return http.post<{ id: number; message?: string }>('/admin/institutions', data)
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

/** 删除机构 DELETE /api/admin/institutions/:id */
export function deleteInstitution(id: number) {
  return http.delete<null>(`/admin/institutions/${id}`)
}

/** 服务半径变更 POST /api/admin/institutions/:id/radius（备用） */
export function updateInstitutionRadius(id: number, radiusKm: number, note?: string) {
  return http.post<null>(`/admin/institutions/${id}/radius`, { radius_km: radiusKm, note })
}

/* ------------------------------------------------------------------ */
/* §5.4 机构服务关联配置 institution_services（权限 service:manage）      */
/* ------------------------------------------------------------------ */

// 批量新增机构服务关联入参
export interface InstitutionServiceBatchCreateBody {
  institution_id: number;
  items: {
    service_id: number;
    institution_id: number;
  }[];
}

/** 机构服务关联（出参：关联记录 + 服务/分类平铺信息） */
export interface InstitutionServiceRow {
  id: number
  institution_id: number
  service_id: number
  /** 平铺：服务名称 */
  service_name: string
  /** 平铺：服务分类 id / 名称 */
  service_category_id: number
  service_category_name: string
  /** 1-上门 2-非上门（到店） */
  is_home_service: 1 | 2
  /** 机构特定价（元），0 表示沿用集团价 */
  price_override: number
  sort: number
  /** 机构维度上下架：1-可预约 9-已下架 */
  status: CommonStatus
  remark: string
  price: number
  unit: string
  service_type: number
}

/** 机构服务列表响应（列表 + 所属机构 id） */
export interface InstitutionServicePage extends ApiPageResult<InstitutionServiceRow> {
  institution_id: number
}

/** 机构服务列表 GET /api/admin/institutions/:id/services
 *  分页 + 关键字 / 服务方式 / 状态查询参数一并下推（keyword 来自 ApiPageParams）
 *  注：后端当前仅实现了 page / page_size 分页，其余筛选参数会被忽略，前端因此对当前页再做一次本地兜底过滤 */
export function getInstitutionServiceList(
  institutionId: number,
  params?: ApiPageParams & {
    service_id?: number
    service_type?: number
    status?: CommonStatus
  },
) {
  return http.get<InstitutionServicePage>(
    `/admin/institutions/${institutionId}/services`,
    { ...params },
  )
}

/** 关联详情 GET /api/admin/institution-services/:id */
export function getInstitutionService(id: number) {
  return http.get<InstitutionServiceRow>(`/admin/institution-services/${id}`)
}

// /** 新增机构服务关联 POST /api/admin/institution-services */
// export function createInstitutionService(data: InstitutionServiceSaveBody) {
//   return http.post<null>('/admin/institution-services', data)
// }

/** 机构批量关联服务 POST /api/admin/institution-services/batch-create */
export function batchCreateInstitutionService(data: InstitutionServiceBatchCreateBody) {
  return http.post<null>('/admin/institution-services/batch-create', data)
}

// /** 编辑关联 PUT /api/admin/institution-services/:id（改机构特定价/排序/上门标记） */
// export function updateInstitutionService(id: number, data: Partial<InstitutionServiceSaveBody>) {
//   return http.put<null>(`/admin/institution-services/${id}`, data)
// }

/** 机构服务上下架 POST /api/admin/institution-services/:id/status
 *  注：契约中此接口一度注释，但后端实测仍可用（返回「状态已更新」），页面上下架功能依赖它 */
export function updateInstitutionServiceStatus(id: number, status: CommonStatus) {
  return http.post<null>(`/admin/institution-services/${id}/status`, { status })
}

/** 删除关联 DELETE /api/admin/institution-services/:id（软删，校验无在途订单引用） */
export function deleteInstitutionService(id: number) {
  return http.delete<null>(`/admin/institution-services/${id}`)
}

/** 批量同步 POST /api/admin/institutions/:id/services/sync（一次开通/回收多个服务） */
// export function syncInstitutionServices(institutionId: number, serviceIds: number[]) {
//   return http.post<BatchResult>(`/admin/institutions/${institutionId}/services/sync`, {
//     service_ids: serviceIds,
//   })
// }
