/**
 * 财务管理（运营后台端-API设计 §6.2 支付渠道配置 / §6.3 渠道流水 / §6.4 对账）
 * - 支付渠道配置 finance:payment-config
 * - 渠道流水查看 finance:channel-log
 * - 对账管理 finance:reconcile
 * 说明：上半部分为页面展示用类型（mock），下半部分 DTO 对齐文档契约。
 */
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult } from '@/types/api'

/** 对账差异明细行 */
export interface ReconciliationDetailLine {
  id: number
  report_id: number
  order_id: number
  order_type: number
  channel_trade_no: string
  platform_amount: number
  channel_amount: number
  match_status: number // 1-完全匹配 2-金额不一致 3-仅渠道有 4-仅平台有
  match_note: string
}

/** 财务对账汇总项（按日期 + 机构 + 支付渠道） */
export interface ReconcileItem {
  id: string
  report_no: string
  /** 支付渠道，如 微信支付 */
  channel_type: number // 1-微信 2-支付宝 3-银联 9-其他
  status: number // 1-对账中 2-已平账 3-有差异
  reconciliation_type: number // 对账类型
  start_date: number // 开始时间
  end_date: number // 结束时间
  channel_id: number
  channel_code: string
  channel_name: string
  platform_amount: number
  channel_amount: number
  platform_count: number
  channel_count: number
  diff_amount: number
  diff_count: number
  detail_lines?: ReconciliationDetailLine[]
}

/** 生成对账单 POST /api/admin/reconciliations */
export function createReconciliation(data: {
  start_date: string
  end_date: string
  reconciliation_type: number
  channel_id: number
}) {
  return http.post<null>('/admin/reconciliations', data)
}

/** 对账报表列表 GET /api/admin/reconciliations（按类型/状态/时间） */
export function getReconciliations(
  params?: ApiPageParams & {
    reconciliation_type?: number
    status?: number
    start_date?: string
    end_date?: string
  },
) {
  return http.get<ApiPageResult<ReconcileItem>>('/admin/reconciliations', { ...params })
}

/** 对账报表详情 GET /api/admin/reconciliations/:id（含差异明细） */
export function getReconciliation(id: number) {
  return http.get<ReconcileItem>(`/admin/reconciliations/${id}`)
}

/** 对账完成/平账 POST /api/admin/reconciliations/:id/reconcile */
export function finishReconciliation(id: number) {
  return http.post<null>(`/admin/reconciliations/${id}/reconcile`)
}

/** 差异明细列表 GET /api/admin/reconciliations/:id/details */
export function getReconciliationDetails(id: number, params?: ApiPageParams & { match_status?: number }) {
  return http.get<ApiPageResult<ReconciliationDetailLine>>(`/admin/reconciliations/${id}/details`, {
    ...params,
  })
}

/** 对账导出 GET /api/admin/reconciliations/export */
export function exportReconciliations(params?: ApiPageParams) {
  return http.get<Blob>('/admin/reconciliations/export', { ...params }, { responseType: 'blob' })
}

/* ------------------------------------------------------------------ */
/* §6.3 支付渠道流水（权限 finance:channel-log，仅查看）                  */
/* ------------------------------------------------------------------ */

/** 渠道流水  */
export interface PaymentChannelLog {
  id: number
  channel_id: number
  channel_code: string
  channel_trade_no: string
  order_type: number
  order_id: number
  amount: number
  transaction_fee: number
  status: number
  matched_at: number | null
  created_at: number
}

/** 渠道流水列表 GET /api/admin/payment-channel-logs */
export function getPaymentChannelLogs(
  params?: ApiPageParams & {
    channel_id?: number
    status?: number
    start_time?: number
    end_time?: number
  },
) {
  return http.get<ApiPageResult<PaymentChannelLog>>('/admin/payment-channel-logs', { ...params })
}

/** 渠道流水详情 GET /api/admin/payment-channel-logs/:id */
export function getPaymentChannelLog(id: number) {
  return http.get<PaymentChannelLog>(`/admin/payment-channel-logs/${id}`)
}
