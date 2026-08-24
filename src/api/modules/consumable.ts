/**
 * 耗材包管理（运营后台端-API设计 §5.2）
 * 权限 service:manage
 */
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult, BatchResult, CommonStatus } from '@/types/api'

/** 耗材包 DTO */
export interface ConsumableDTO {
  id: number
  name: string
  name_en: string | null
  code: string
  category: number
  price: number
  unit: string
  /** 规格，如 成人XL 10片/包 */
  spec: string
  description: Record<string, unknown>
  status: CommonStatus
}

/** 耗材新增 / 编辑入参 */
export type ConsumableSaveBody = Omit<ConsumableDTO, 'id'>

/** 耗材包列表 GET /api/admin/consumables（按分类/状态/关键字） */
export function getConsumables(
  params?: ApiPageParams & { category?: number; status?: CommonStatus },
) {
  return http.get<ApiPageResult<ConsumableDTO>>('/admin/consumables', { ...params })
}

/** 耗材详情 GET /api/admin/consumables/:id */
export function getConsumable(id: number) {
  return http.get<ConsumableDTO>(`/admin/consumables/${id}`)
}

/** 新增耗材包 POST /api/admin/consumables */
export function createConsumable(data: ConsumableSaveBody) {
  return http.post<null>('/admin/consumables', data)
}

/** 编辑耗材包 PUT /api/admin/consumables/:id */
export function updateConsumable(id: number, data: Partial<ConsumableSaveBody>) {
  return http.put<null>(`/admin/consumables/${id}`, data)
}

/** 上架/下架 POST /api/admin/consumables/:id/status */
export function updateConsumableStatus(id: number, status: CommonStatus) {
  return http.post<null>(`/admin/consumables/${id}/status`, { status })
}

/** 批量上下架 POST /api/admin/consumables/batch-status */
export function batchUpdateConsumableStatus(ids: number[], status: CommonStatus) {
  return http.post<BatchResult>('/admin/consumables/batch-status', { ids, status })
}

/** 服务-耗材关联 POST /api/admin/services/:id/consumables */
export function linkServiceConsumables(serviceId: number, consumableIds: number[]) {
  return http.post<null>(`/admin/services/${serviceId}/consumables`, {
    consumable_ids: consumableIds,
  })
}
