/**
 * 耗材包管理（swagger：服务与耗材-耗材管理）
 * 权限 service:manage
 * 说明：swagger 仅收录 列表 / 详情 / 新增 / 编辑 四个接口；
 *       上下架通过编辑接口提交 status 字段（1-上架 9-下架）。
 */
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult, CommonStatus } from '@/types/api'

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

/** 耗材新增 / 编辑入参（swagger admin.ReqConsumable：category / code / name / price / unit 必填） */
export interface ConsumableSaveBody {
  /** 分类，必填 */
  category: number
  /** 编码，必填 */
  code: string
  /** 名称，必填 */
  name: string
  /** 单价（元，字符串），必填 */
  price: string
  /** 单位，必填 */
  unit: string
  name_en?: string
  /** 规格 */
  spec?: string
  /** JSON 描述 */
  description?: string
  /** 1-上架 9-下架 */
  status?: CommonStatus
}

/** 耗材包列表 GET /api/admin/consumables（swagger：page / page_size / keyword / category / status） */
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

/** 编辑耗材包 PUT /api/admin/consumables/:id（上下架通过 status 字段提交） */
export function updateConsumable(id: number, data: Partial<ConsumableSaveBody>) {
  return http.put<null>(`/admin/consumables/${id}`, data)
}
