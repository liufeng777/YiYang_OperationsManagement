/**
 * 服务与耗材（运营后台端-API设计 §5.1 服务项目 + §5.3 服务-耗材关联）
 * 权限 service:manage
 * 说明：上半部分为页面展示用类型（mock），下半部分 DTO 对齐文档契约。
 */
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult, BatchResult, CommonStatus } from '@/types/api'

/* ------------------------------------------------------------------ */
/* 页面展示类型（mock，接后端后逐步切换到下方 DTO）                       */
/* ------------------------------------------------------------------ */

/** 计价单位 */
export type PriceUnit = '次' | '小时' | '天'

// 套餐
export interface Package {
  count: number
  price: number
  price_with_consum: number
}

/** 服务项目 */
export interface ServiceItem {
  id: number
  /** 服务编码：FW0001 */
  code: string
  category_id: number // 服务类型
  name: string
  name_en?: string // 英文名
  description?: string // 富文本编辑
  duration?: number // 单次服务时长
  is_consumable_supported: boolean // 是否可选配耗材
  price: number // 单价
  unit: string // 计价单位
  service_process: string // JSON 服务流程
  status: number // 1-上架 9-下架
  vital_sign?: number[] // 生命体征 -监测项ID 数组
  service_type: number // 1'上门' | 2'到店'
  packages?: Package[] // 套餐
  cover_url: string // 封面图片
}

/** 服务分类 */
export interface ServiceCategory {
  id: string
  code: string
  name: string
  serviceCount: number
  sort: number
  status: 'enabled' | 'disabled'
}

/** 服务接入机构 */
export interface ServiceInstitution {
  id: string
  name: string
  configSource: '机构默认' | '单项调整'
  status: '可预约' | '已下架'
}

/* ------------------------------------------------------------------ */
/* §5.1 服务项目管理（权限 service:manage）                              */
/* ------------------------------------------------------------------ */

/** 服务分类：1-基础护理 2-康复 3-生活照料 4-医疗 9-其他 */
export type ServiceCategoryCode = 1 | 2 | 3 | 4 | 9


/** 服务新增 / 编辑入参 */
export type ServiceSaveBody = Omit<ServiceItem, 'id' | 'code'>

/** 服务列表 GET /api/admin/services（按分类/状态/关键字） */
export function getServices(
  params?: ApiPageParams & { category?: ServiceCategoryCode; status?: CommonStatus },
) {
  return http.get<ApiPageResult<ServiceItem>>('/admin/services', { ...params })
}

/** 服务详情 GET /api/admin/services/:id */
export function getService(id: number) {
  return http.get<ServiceItem>(`/admin/services/${id}`)
}

/** 新增服务 POST /api/admin/services */
export function createService(data: ServiceSaveBody) {
  return http.post<null>('/admin/services', data)
}

/** 编辑服务 PUT /api/admin/services/:id */
export function updateService(id: number, data: Partial<ServiceSaveBody>) {
  return http.put<null>(`/admin/services/${id}`, data)
}

/** 上架/下架 POST /api/admin/services/:id/status */
export function updateServiceStatus(id: number, status: CommonStatus) {
  return http.post<null>(`/admin/services/${id}/status`, { status })
}

/** 批量上下架 POST /api/admin/services/batch-status */
export function batchUpdateServiceStatus(
  ids: number[],
  status: CommonStatus,
  category?: ServiceCategoryCode,
) {
  return http.post<BatchResult>('/admin/services/batch-status', { ids, status, category })
}

/** 删除服务 DELETE /api/admin/services/:id */
export function deleteService(id: number) {
  return http.delete<null>(`/admin/services/${id}`)
}

/* ------------------------------------------------------------------ */
/* 服务-机构管理服务   */
/* ------------------------------------------------------------------ */
export function getInstitutionServices(id: number, params?: ApiPageParams & { service_id?: number; status?: CommonStatus }) {
  return http.get<ApiPageResult<ServiceItem>>(`/admin/institutions/${id}/services`, {
    ...params,
  })
}

/* ------------------------------------------------------------------ */
/* §5.3 服务-耗材关联配置 service_consumables（权限 service:manage）      */
/* ------------------------------------------------------------------ */

/** 服务-耗材关联 DTO（含平铺耗材名） */
// export interface ServiceConsumableDTO extends ServiceConsumableConfig {
//   id: number
//   service_id: number
//   consumable_name?: string
// }

/** 服务可选耗材 GET /api/admin/services/:id/consumables（分页） */
// export function getServiceConsumables(serviceId: number, params?: ApiPageParams) {
//   return http.get<ApiPageResult<ServiceConsumableDTO>>(`/admin/services/${serviceId}/consumables`, {
//     ...params,
//   })
// }

// /** 保存关联配置 PUT /api/admin/services/:id/consumables（全量替换） */
// export function saveServiceConsumables(serviceId: number, list: ServiceConsumableConfig[]) {
//   return http.put<null>(`/admin/services/${serviceId}/consumables`, list)
// }

// /** 新增一条关联 POST /api/admin/service-consumables */
// export function createServiceConsumable(data: Omit<ServiceConsumableDTO, 'id' | 'consumable_name'>) {
//   return http.post<null>('/admin/service-consumables', data)
// }

// /** 编辑一条关联 PUT /api/admin/service-consumables/:id */
// export function updateServiceConsumable(
//   id: number,
//   data: Partial<Omit<ServiceConsumableDTO, 'id' | 'consumable_name'>>,
// ) {
//   return http.put<null>(`/admin/service-consumables/${id}`, data)
// }

/** 启停一条关联 POST /api/admin/service-consumables/:id/status */
export function updateServiceConsumableStatus(id: number, status: CommonStatus) {
  return http.post<null>(`/admin/service-consumables/${id}/status`, { status })
}

/** 删除一条关联 DELETE /api/admin/service-consumables/:id（软删，校验无在途订单引用） */
export function deleteServiceConsumable(id: number) {
  return http.delete<null>(`/admin/service-consumables/${id}`)
}
