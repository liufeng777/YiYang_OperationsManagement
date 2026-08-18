import { http } from '@/utils/request'
import type { PageParams, PageResult } from '@/types/api'

/** 对账状态 */
export type ReconcileStatus = 'pending' | 'confirmed' | 'diff'

/** 财务对账汇总项（按日期 + 机构 + 支付渠道） */
export interface ReconcileItem {
  id: string
  /** 对账日期，如 2026-08-07 */
  reconcileDate: string
  institutionName: string
  /** 支付笔数 */
  payCount: number
  /** 退款笔数 */
  refundCount: number
  /** 支付金额（元） */
  payAmount: number
  /** 净收金额（元） */
  netAmount: number
  /** 支付渠道，如 微信支付 */
  payChannel: string
  status: ReconcileStatus
  /** 更新时间展示，如 08-08 02:10 */
  updatedAt: string
}

/** 对账汇总统计 */
export interface ReconcileSummary {
  payAmount: number
  refundAmount: number
  netAmount: number
  diffCount: number
}

/** 对账汇总分页列表 */
export function getReconcileList(params: PageParams & { keyword?: string; status?: string }) {
  return http.get<PageResult<ReconcileItem>>('/finance/reconcile/list', { ...params })
}

/** 对账汇总统计 */
export function getReconcileSummary(params: { date?: string }) {
  return http.get<ReconcileSummary>('/finance/reconcile/summary', { ...params })
}

/** 确认核对（待核对 → 已核对） */
export function confirmReconcile(id: string) {
  return http.post<null>(`/finance/reconcile/${id}/confirm`)
}

/** 处理差异 */
export function resolveReconcileDiff(id: string, remark?: string) {
  return http.post<null>(`/finance/reconcile/${id}/resolve`, { remark })
}

/** 导出对账单 */
export function exportReconcile(params: PageParams) {
  return http.get<Blob>('/finance/reconcile/export', { ...params }, { responseType: 'blob' })
}
