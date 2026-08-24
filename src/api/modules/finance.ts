/**
 * 财务管理（运营后台端-API设计 §6.2 支付渠道配置 / §6.3 渠道流水 / §6.4 对账）
 * - 支付渠道配置 finance:payment-config
 * - 渠道流水查看 finance:channel-log
 * - 对账管理 finance:reconcile
 * 说明：上半部分为页面展示用类型（mock），下半部分 DTO 对齐文档契约。
 */
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult, CommonStatus } from '@/types/api'

/* ------------------------------------------------------------------ */
/* 页面展示类型（mock，接后端后逐步切换到下方 DTO）                       */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* 支付渠道配置 payment_channels（权限 finance:payment-config）          */
/* ------------------------------------------------------------------ */

/** 渠道类型：1-微信 2-支付宝 3-银联 9-其他 */
export type ChannelType = 1 | 2 | 3 | 9

/** 支付渠道 DTO（api_keys 列表中脱敏返回） */
export interface PaymentChannelDTO {
  id: number
  /** wechat_pay / alipay（唯一） */
  channel_code: string
  channel_type: ChannelType
  merchant_id: string
  /** JSON，加密存储，出参脱敏 */
  api_keys: Record<string, string>
  status: CommonStatus
}

/** 渠道配置列表 GET /api/admin/payment-channels */
export function getPaymentChannels(params?: { channel_type?: ChannelType; status?: CommonStatus }) {
  return http.get<PaymentChannelDTO[]>('/admin/payment-channels', { ...params })
}

/** 渠道配置详情 GET /api/admin/payment-channels/:id（密钥脱敏） */
export function getPaymentChannel(id: number) {
  return http.get<PaymentChannelDTO>(`/admin/payment-channels/${id}`)
}

/** 新增渠道 POST /api/admin/payment-channels */
export function createPaymentChannel(data: Omit<PaymentChannelDTO, 'id'>) {
  return http.post<null>('/admin/payment-channels', data)
}

/** 编辑渠道 PUT /api/admin/payment-channels/:id */
export function updatePaymentChannel(id: number, data: Partial<Omit<PaymentChannelDTO, 'id'>>) {
  return http.put<null>(`/admin/payment-channels/${id}`, data)
}

/** 启用/禁用渠道 POST /api/admin/payment-channels/:id/status */
export function updatePaymentChannelStatus(id: number, status: CommonStatus) {
  return http.post<null>(`/admin/payment-channels/${id}/status`, { status })
}

/** 密钥配置 PUT /api/admin/payment-channels/:id/api-keys（加密存储） */
export function updatePaymentChannelKeys(id: number, apiKeys: Record<string, string>) {
  return http.put<null>(`/admin/payment-channels/${id}/api-keys`, { api_keys: apiKeys })
}

/* ------------------------------------------------------------------ */
/* §6.3 支付渠道流水（权限 finance:channel-log，仅查看）                  */
/* ------------------------------------------------------------------ */

/** 渠道流水 DTO */
export interface PaymentChannelLogDTO {
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
  return http.get<ApiPageResult<PaymentChannelLogDTO>>('/admin/payment-channel-logs', { ...params })
}

/** 渠道流水详情 GET /api/admin/payment-channel-logs/:id */
export function getPaymentChannelLog(id: number) {
  return http.get<PaymentChannelLogDTO>(`/admin/payment-channel-logs/${id}`)
}

/* ------------------------------------------------------------------ */
/* §6.4 对账管理（权限 finance:reconcile）                               */
/* ------------------------------------------------------------------ */

/** 对账报表状态：1-对账中 2-已平账 3-有差异 */
export type ReconciliationStatus = 1 | 2 | 3

/** 差异匹配状态：1-完全匹配 2-金额不一致 3-仅渠道有 4-仅平台有 */
export type MatchStatus = 1 | 2 | 3 | 4

/** 对账差异明细行 */
export interface ReconciliationDetailLine {
  id: number
  report_id: number
  order_id: number
  order_type: number
  channel_trade_no: string
  platform_amount: number
  channel_amount: number
  match_status: MatchStatus
  match_note: string
}

/** 对账报表 DTO */
export interface ReconciliationDTO {
  id: number
  report_no: string
  reconciliation_type: number
  /** yyyy-MM-dd */
  start_date: string
  end_date: string
  channel_id: number
  channel_code: string
  channel_name: string
  platform_amount: number
  channel_amount: number
  platform_count: number
  channel_count: number
  diff_amount: number
  diff_count: number
  status: ReconciliationStatus
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
    status?: ReconciliationStatus
    start_date?: string
    end_date?: string
  },
) {
  return http.get<ApiPageResult<ReconciliationDTO>>('/admin/reconciliations', { ...params })
}

/** 对账报表详情 GET /api/admin/reconciliations/:id（含差异明细） */
export function getReconciliation(id: number) {
  return http.get<ReconciliationDTO>(`/admin/reconciliations/${id}`)
}

/** 对账完成/平账 POST /api/admin/reconciliations/:id/reconcile */
export function finishReconciliation(id: number) {
  return http.post<null>(`/admin/reconciliations/${id}/reconcile`)
}

/** 差异明细列表 GET /api/admin/reconciliations/:id/details */
export function getReconciliationDetails(id: number, params?: ApiPageParams & { match_status?: MatchStatus }) {
  return http.get<ApiPageResult<ReconciliationDetailLine>>(`/admin/reconciliations/${id}/details`, {
    ...params,
  })
}

/** 对账导出 GET /api/admin/reconciliations/export */
export function exportReconciliations(params?: ApiPageParams) {
  return http.get<Blob>('/admin/reconciliations/export', { ...params }, { responseType: 'blob' })
}
