import { http } from '@/utils/request'
import type { PageParams, PageResult } from '@/types/api'

export interface ServiceItem {
  id: number
  name: string
  categoryId: number
  price: number
  status: number // 0 下架 1 上架
  salesCount: number
}

export interface ServiceCategory {
  id: number
  name: string
  sort: number
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
export function getServiceDetail(id: number) {
  return http.get<ServiceItem>(`/service/${id}`)
}

/** 保存服务项目 */
export function saveService(data: Partial<ServiceItem>) {
  return data.id
    ? http.put<null>('/service/update', data)
    : http.post<null>('/service/create', data)
}
