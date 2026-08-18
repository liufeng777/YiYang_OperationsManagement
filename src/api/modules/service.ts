import { http } from '@/utils/request'
import type { PageParams, PageResult } from '@/types/api'

/** 服务方式 */
export type ServiceMode = '上门' | '到店' | '陪同'

/** 服务定义状态：on=已启用 draft=草稿 off=已停用 */
export type ServiceStatus = 'on' | 'draft' | 'off'

/** 服务项目 */
export interface ServiceItem {
  id: string
  /** 服务编码：FW0001 */
  code: string
  name: string
  categoryId: string
  categoryName: string
  mode: ServiceMode
  /** 集团定价（元/次） */
  price: number
  /** 已接入机构数 */
  institutionCount: number
  /** 累计订单数 */
  orderCount: number
  status: ServiceStatus
  /** 服务说明 */
  description?: string
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

/** 服务详情 */
export interface ServiceDetail extends ServiceItem {
  duration: string
  applyRange: string
  bookingRule: string
  cancelRule: string
}

/** 服务接入机构 */
export interface ServiceInstitution {
  id: string
  name: string
  configSource: '机构默认' | '单项调整'
  status: '可预约' | '已下架'
}

/** 服务项目分页列表 */
export function getServiceList(params: PageParams) {
  return http.get<PageResult<ServiceItem>>('/service/list', { ...params })
}

/** 服务项目分类列表 */
export function getServiceCategoryList() {
  return http.get<ServiceCategory[]>('/service/category/list')
}

/** 服务项目详情 */
export function getServiceDetail(id: string) {
  return http.get<ServiceDetail>(`/service/${id}`)
}

/** 服务接入机构 */
export function getServiceInstitutions(id: string) {
  return http.get<ServiceInstitution[]>(`/service/${id}/institutions`)
}

/** 保存服务项目 */
export function saveService(data: Partial<ServiceItem>) {
  return data.id
    ? http.put<null>('/service/update', data)
    : http.post<null>('/service/create', data)
}

/** 服务项目上下架 */
export function toggleService(id: string, status: ServiceStatus) {
  return http.post<null>(`/service/${id}/toggle`, { status })
}

/** 停用服务项目（需填写原因） */
export function offlineService(id: string, reason: string) {
  return http.post<null>(`/service/${id}/offline`, { reason })
}
