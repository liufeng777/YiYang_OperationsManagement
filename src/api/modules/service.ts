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
  price: string // 单价
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
  /** 分类下的服务数量（后端暂未返回，前端拉取全量服务自行统计，用于删除前置校验） */
  service_count?: number
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


/** 服务新增 / 编辑入参（swagger admin.ReqService：category_id / name / price / unit 必填） */
export interface ServiceSaveBody {
  /** 服务类型 ID（关联 service_categories.id），必填 */
  category_id: number
  /** 服务名称，必填 */
  name: string
  /** 单价（元，字符串），必填 */
  price: string
  /** 计价单位，必填 */
  unit: string
  name_en?: string
  cover_url?: string
  /** JSON 模板 */
  description?: string
  /** 单次时长（分钟） */
  duration?: number
  /** 是否可选配耗材 */
  is_consumable_supported?: boolean
  consumables_desc: string
  /** 服务套餐数组，如 [{count:1,price:'100',price_with_consum:'120'}] */
  packages?: ServicePackageBody[]
  /** JSON 服务流程（数组串） */
  service_process?: string
  /** 服务类别 1-上门 2-到院（默认 1） */
  service_type?: number
  /** 1-上架 9-下架 */
  status?: number
  target_crowd?: string
  /** 生命体征监测项 ID 数组 */
  vital_sign?: number[]
}

/** 服务套餐入参（swagger admin.PackageItem，价格为字符串保留两位小数） */
export interface ServicePackageBody {
  /** 服务次数 */
  count: number
  /** 服务价格（元，字符串保留两位小数） */
  price: string
  /** 含耗材价格（元，字符串保留两位小数） */
  price_with_consum: string
}

/** 服务列表 GET /api/admin/services（swagger：page / page_size / keyword / category_id / status）
 *  注：category_id 为服务分类 id（service_categories 主键），status 为 1-上架 / 9-下架 */
export function getServices(
  params?: ApiPageParams & { category_id?: number; status?: CommonStatus },
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

/** 上架/下架 POST /api/admin/services/:id/status（swagger：body {status}，remark 为 query 选填） */
export function updateServiceStatus(id: number, status: CommonStatus, remark?: string) {
  return http.post<null>(`/admin/services/${id}/status`, { status }, { params: { remark } })
}

/** 批量上下架 POST /api/admin/services/batch-status（swagger admin.ReqBatchStatus：{ids,status,category_id?}） */
export function batchUpdateServiceStatus(
  ids: number[],
  status: CommonStatus,
  category_id?: number,
) {
  return http.post<BatchResult>('/admin/services/batch-status', { ids, status, category_id })
}

/** 删除服务 DELETE /api/admin/services/:id（swagger：remark 为 query 选填） */
export function deleteService(id: number, remark?: string) {
  return http.delete<null>(`/admin/services/${id}`, { remark })
}

/* ------------------------------------------------------------------ */
/* 服务分类（swagger：服务与耗材-服务类型 /admin/service-categories）      */
/* ------------------------------------------------------------------ */

/** 服务分类新增 / 编辑入参（swagger admin.ReqServiceCategory：code / name 必填） */
export interface ServiceCategorySaveBody {
  /** 类型编码（唯一，如 BASIC_CARE），必填 */
  code: string
  /** 类型名称（中文），必填 */
  name: string
  name_en?: string
  /** 类型说明（中文） */
  brief?: string
  /** 类型说明（英文） */
  brief_en?: string
  sort_order?: number
  /** 1-启用 9-禁用 */
  status?: CommonStatus
}

/** 服务分类列表 GET /api/admin/service-categories（swagger：page / page_size / keyword / status） */
export function getServiceCategories(params?: ApiPageParams & { status?: CommonStatus }) {
  return http.get<ApiPageResult<ServiceCategory>>('/admin/service-categories', { ...params })
}

/** 服务分类详情 GET /api/admin/service-categories/:id */
export function getServiceCategory(id: number) {
  return http.get<ServiceCategory>(`/admin/service-categories/${id}`)
}

/** 新增服务分类 POST /api/admin/service-categories */
export function createServiceCategory(data: ServiceCategorySaveBody) {
  return http.post<{ id: number }>('/admin/service-categories', data)
}

/** 编辑服务分类 PUT /api/admin/service-categories/:id（全量覆盖：code 等必填需带） */
export function updateServiceCategory(id: number, data: ServiceCategorySaveBody) {
  return http.put<null>(`/admin/service-categories/${id}`, data)
}

/** 启用/禁用服务分类 POST /api/admin/service-categories/:id/status（swagger：body {status}，remark 为 query 选填） */
export function updateServiceCategoryStatus(id: number, status: CommonStatus, remark?: string) {
  return http.post<null>(`/admin/service-categories/${id}/status`, { status }, { params: { remark } })
}

/** 删除服务分类 DELETE /api/admin/service-categories/:id（swagger：remark 为 query 选填） */
export function deleteServiceCategory(id: number, remark?: string) {
  return http.delete<null>(`/admin/service-categories/${id}`, { remark })
}

/* ------------------------------------------------------------------ */
/* 服务-机构管理服务（swagger：GET /admin/institutions/:id/services）     */
/* ------------------------------------------------------------------ */
export function getInstitutionServices(id: number, params?: ApiPageParams & { service_id?: number; status?: CommonStatus }) {
  return http.get<ApiPageResult<ServiceItem>>(`/admin/institutions/${id}/services`, {
    ...params,
  })
}

/* ------------------------------------------------------------------ */
/* §5.3 服务-耗材关联配置 service_consumables（权限 service:manage）      */
/* ------------------------------------------------------------------ */

/** 服务-耗材关联入参（swagger admin.ReqServiceConsumable：consumable_id / service_id 必填） */
export interface ServiceConsumableConfig {
  consumable_id: number
  service_id: number
  /** NULL=全局可选；非 NULL=仅该机构可选 */
  institution_id?: number
  /** 单次可选上限 */
  max_count?: number
  /** 机构特定价（元，字符串） */
  price_override?: string
  /** 0-可选 1-默认必选 */
  required?: 0 | 1
  sort?: number
  /** 1-启用 9-禁用 */
  status?: CommonStatus
}

/** 服务-耗材关联 DTO（含平铺耗材名） */
export interface ServiceConsumableDTO extends ServiceConsumableConfig {
  id: number
  consumable_name?: string
}

/** 保存服务耗材关联配置入参（swagger admin.ReqSetServiceConsumables） */
export interface ServiceConsumablesSaveBody {
  /** 耗材 ID 数组 */
  consumable_ids?: number[]
  /** 关联配置数组（含全局+机构覆盖） */
  list?: ServiceConsumableConfig[]
}

/** 服务可选耗材列表 GET /api/admin/services/:id/consumables（swagger：page / page_size） */
export function getServiceConsumables(serviceId: number, params?: ApiPageParams) {
  return http.get<ApiPageResult<ServiceConsumableDTO>>(`/admin/services/${serviceId}/consumables`, {
    ...params,
  })
}

/** 保存服务耗材关联配置 PUT /api/admin/services/:id/consumables（swagger：remark 为 query 选填） */
export function saveServiceConsumables(serviceId: number, data: ServiceConsumablesSaveBody, remark?: string) {
  return http.put<null>(`/admin/services/${serviceId}/consumables`, data, { params: { remark } })
}

/** 新增一条关联 POST /api/admin/service-consumables */
export function createServiceConsumable(data: ServiceConsumableConfig) {
  return http.post<null>('/admin/service-consumables', data)
}

/** 编辑一条关联 PUT /api/admin/service-consumables/:id */
export function updateServiceConsumable(id: number, data: ServiceConsumableConfig) {
  return http.put<null>(`/admin/service-consumables/${id}`, data)
}

/** 启停一条关联 POST /api/admin/service-consumables/:id/status（swagger：body {status}，remark 为 query 选填） */
export function updateServiceConsumableStatus(id: number, status: CommonStatus, remark?: string) {
  return http.post<null>(`/admin/service-consumables/${id}/status`, { status }, { params: { remark } })
}

/** 删除一条关联 DELETE /api/admin/service-consumables/:id（swagger：remark 为 query 选填） */
export function deleteServiceConsumable(id: number, remark?: string) {
  return http.delete<null>(`/admin/service-consumables/${id}`, { remark })
}
