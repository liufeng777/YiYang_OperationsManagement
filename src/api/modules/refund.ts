import { http } from '@/utils/request'
import type { PageParams, PageResult } from '@/types/api'

export interface RefundItem {
  id: number
  orderNo: string
  amount: number
  reason: string
  status: number // 0 待处理 1 已同意 2 已驳回 3 已退款
  applyTime: string
}

export interface RefundDetail extends RefundItem {
  buyerName: string
  buyerPhone: string
  images: string[]
  processRecord: Array<{ time: string; operator: string; content: string }>
}

/** 退款申请分页列表 */
export function getRefundList(params: PageParams) {
  return http.get<PageResult<RefundItem>>('/refund/list', { ...params })
}

/** 退款详情 */
export function getRefundDetail(id: number) {
  return http.get<RefundDetail>(`/refund/${id}`)
}

/** 处理退款申请 */
export function processRefund(id: number, approved: boolean, remark?: string) {
  return http.post<null>(`/refund/${id}/process`, { approved, remark })
}
