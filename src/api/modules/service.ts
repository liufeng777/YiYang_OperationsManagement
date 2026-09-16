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

/** 服务项目（字段名以后端实际返回为准） */
export interface ServiceItem {
  id: number
  /** 服务编码：FW0001（后端暂未返回，保留兼容） */
  code?: string
  category_id: number // 服务分类 id
  name: string
  name_en?: string // 英文名
  description?: string // 富文本编辑
  duration?: number // 单次服务时长
  /** 是否可选配耗材：后端字段名为 support_consum（0-否 1-是） */
  support_consum: number
  price: number // 单价
  unit: string // 计价单位
  /** 服务流程（后端存储 / 返回均为 JSON 字符串，需 JSON.parse 后使用） */
  service_process?: string
  status: number // 1-上架 9-下架
  service_type: number // 1'上门' | 2'到店'
  packages?: Package[] // 套餐
  cover_url: string // 封面图片
  /** 可选配耗材 id 列表（后端返回） */
  consumable_ids?: number[]
  /** 已开通该服务的机构 id 列表（后端返回） */
  institution_ids?: number[]
  created_at?: number
  target_crowd?: string // 适用人群
  vital_sign?: number[] // 生命体征
}

/** 服务流程步骤（service_process 数组元素） */
export interface ServiceProcessStep {
  title?: string
  description?: string
}

/** 服务分类 */
export interface ServiceCategory {
  id: number
  code: string
  name: string
  name_en?: string
  brief: string // 简介
  brief_en: string
  sort_order?: number
  status: number // 1-启用 9-禁用
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

/** 服务列表 GET /api/admin/services（按分类/状态/关键字）
 *  注：category 为服务分类 id（后端分类表主键，非固定枚举），status 为 1-上架 / 9-下架 */
export function getServices(
  params?: ApiPageParams & { category?: number; status?: CommonStatus },
) {
  return http.get<ApiPageResult<ServiceItem>>('/admin/services', { ...params })
}

/** 服务详情 GET /api/admin/services/:id */
export function getService(id: number) {
  return http.get<ServiceItem>(`/admin/services/${id}`)
}

/** 新增服务 POST /api/admin/services（后端返回新建的 id） */
export function createService(data: ServiceSaveBody) {
  return http.post<{ id: number; message?: string }>('/admin/services', data)
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
  category?: number,
) {
  return http.post<BatchResult>('/admin/services/batch-status', { ids, status, category })
}

/** 删除服务 DELETE /api/admin/services/:id */
export function deleteService(id: number) {
  return http.delete<null>(`/admin/services/${id}`)
}

/* ------------------------------------------------------------------ */
/* 服务分类（后端 /admin/service-categories，契约未含，按实测补充）        */
/* ------------------------------------------------------------------ */

/** 服务分类列表 GET /api/admin/service-categories */
export function getServiceCategories(params?: ApiPageParams & { status?: CommonStatus }) {
  return http.get<ApiPageResult<ServiceCategory>>('/admin/service-categories', { ...params })
}

/** 服务分类详情 GET /api/admin/service-categories/:id */
export function getServiceCategory(id: number) {
  return http.get<ServiceCategory>(`/admin/service-categories/${id}`)
}

/** 新增服务分类 POST /api/admin/service-categories */
export function createServiceCategory(data: Omit<ServiceCategory, 'id'>) {
  return http.post<{ id: number }>('/admin/service-categories', data)
}

/** 编辑服务分类 PUT /api/admin/service-categories/:id（全量覆盖：code 等必填需带） */
export function updateServiceCategory(id: number, data: Omit<ServiceCategory, 'id'>) {
  return http.put<null>(`/admin/service-categories/${id}`, data)
}

/** 启用/禁用服务分类 POST /api/admin/service-categories/:id/status */
export function updateServiceCategoryStatus(id: number, status: CommonStatus) {
  return http.post<null>(`/admin/service-categories/${id}/status`, { status })
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
