import { http } from '@/utils/request'
import type { PageParams, PageResult } from '@/types/api'

/** 退款状态 */
export type RefundStatus = 'pending' | 'cancelling' | 'refunding' | 'refunded' | 'rejected' | 'abnormal'
/** 工单取消状态 */
export type CancelStatus = 'pending' | 'cancelling' | 'done' | 'none' | 'failed'

/** 退款列表项 */
export interface RefundItem {
  id: string
  /** 退款单号，如 TK202608070001 */
  refundNo: string
  /** 关联订单号，如 DD202608070001 */
  orderNo: string
  /** 关联订单 ID，用于跳转原订单 */
  orderId: string
  userName: string
  /** 脱敏手机号，如 138****1026 */
  userPhone: string
  institutionName: string
  /** 整单退款金额（元） */
  amount: number
  status: RefundStatus
  cancelStatus: CancelStatus
  /** 申请时间展示，如 08-07 08:52 */
  applyTime: string
}

/** 退款审核记录 */
export interface RefundLog {
  id: string
  time: string
  source: string
  action: string
  description: string
  operator: string
}

/** 退款详情 */
export interface RefundDetail extends RefundItem {
  reason: string
  applyNote: string
  refundMethod: string
  workOrderStatus: string
  logs: RefundLog[]
}

/** 退款申请分页列表 */
export function getRefundList(params: PageParams & { keyword?: string; status?: string }) {
  return http.get<PageResult<RefundItem>>('/refund/list', { ...params })
}

/** 退款详情 */
export function getRefundDetail(id: string) {
  return http.get<RefundDetail>(`/refund/${id}`)
}

/** 审核退款申请（一期仅支持整单退款） */
export function processRefund(id: string, approved: boolean, remark?: string) {
  return http.post<null>(`/refund/${id}/process`, { approved, remark })
}

/** 处理异常退款（重试工单取消 / 人工介入） */
export function resolveRefundAbnormal(id: string) {
  return http.post<null>(`/refund/${id}/resolve`)
}
