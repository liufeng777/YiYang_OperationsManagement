/**
 * 订单退款审核（运营后台端-API设计 §6.2）
 * 权限 order:refund（财务/运营）；退款状态枚举见共通 §6.4
 * 能力范围：退款单列表 / 退款单详情 / 退款导出（审核类接口暂未纳入，页面只做只读展示）
 * 说明：退款金额单位与订单保持一致，为「分」
 */
import type { AxiosResponse } from 'axios'
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult } from '@/types/api'

/* ------------------------------------------------------------------ */
/* §6.2 订单退款审核（权限 order:refund）                                */
/* ------------------------------------------------------------------ */


/** 退款单（列表项与详情字段一致） */
export interface RefundItem {
  refund_id: number
  refund_no: string
  refund_type: number // 1 用户申请 2.专业审核未通过 3.其他
  refunded_at: number // 退款时间
  status: number //  1-待审批 2-审批通过 3-退款中 4-已退款 5-已拒绝 6-退款失败 8.待财务审批
  amount: number // 总金额
  reason: string
  member_id: number // 申请人
  member_name: string
  applied_at: number // 申请时间
  approved_at: number // 通过时间
  approved_by: number | null // 通过人
  approved_by_name: string // 通过人名称
  create_at: number // 创建时间
  // 订单信息
  order_id: number
  order_no: string
  order_type: number
  approvals: {
    approve_result: number
    approve_step: number
    approver_id: number
    approver_name: string
    approver_type: string
    created_at: number
    opinion: string
    record_id: string
    refund_amount: string
    refund_channel: string
  }[] // 审批记录 通常是2条数据
  refund_channel_logs: {
    amount: number
    channel: string
    create_at: number
    fail_reason: string
    finished_at: number
    log_id: number
    operator_id: number
    operator_name: string
    operator_type: string
    order_id: number
    order_type: number
    out_refund_no: string
    refund_id: number
    refund_mode: number
    refund_no: string
    remark: string
    status: number
    transaction_id: string
    triggered_at: number
    wx_refund_id: string
  }[] // 退款渠道记录，通常是1条
}

/** 退款单列表 GET /api/admin/refunds（swagger：page / page_size / status / institution_id / start_time / end_time） */
export function getRefunds(
  params?: ApiPageParams & {
    /** 退款状态：1-待审批 2-审批通过 3-退款中 4-已退款 5-已拒绝 6-退款失败 8-待财务审批 */
    status?: number
    institution_id?: number
    start_time?: number
    end_time?: number
  },
) {
  return http.get<ApiPageResult<RefundItem>>('/admin/refunds', { ...params })
}

/** 退款单详情 GET /api/admin/refunds/:id（含支付流水、订单信息） */
export function getRefund(id: number) {
  return http.get<RefundItem>(`/admin/refunds/${id}`)
}

/**
 * 退款导出 GET /api/admin/refunds/export（swagger：status / start_time / end_time）
 * 与订单导出一致：后端可能返回 JSON（{ download_url }）或文件流，故返回整个 AxiosResponse，
 * 由页面判断 content-type 后分别处理
 */
export function exportRefunds(
  params?: ApiPageParams & { status?: number; start_time?: number; end_time?: number },
): Promise<AxiosResponse<Blob>> {
  return http.get<AxiosResponse<Blob>>('/admin/refunds/export', { ...params }, { responseType: 'blob' })
}

/** 退款审批 POST /api/admin/refunds/:id/approve（swagger admin.ReqApproveRefund）
 *  approve / refund_amount 必填；refund_channel 通过退款时必填 */
export function approveRefunds(
  id: number,
  data: {
    /** true-通过 false-拒绝，必填 */
    approve: boolean
    /** 实际退款金额（分），必填 */
    refund_amount: number
    /** 审批意见，选填 */
    opinion?: string
    /** 原路退回渠道（通过退款时必填），选填 */
    refund_channel?: string
  },
) {
  return http.post<null>(`/admin/refunds/${id}/approve`, data)
}

/** 退款审批留痕 GET /api/admin/refunds/:id/logs（swagger：approver_type=staff/finance 选填） */
export function getRefundLogs(id: number, params?: { approver_type?: 'staff' | 'finance' }) {
  return http.get<RefundItem['approvals']>(`/admin/refunds/${id}/logs`, { ...params })
}

/** 人工线下退款完成 POST /api/admin/refunds/:id/manual-complete
 *  swagger：operator_name / remark 均为 query 选填；财务在详情页直接设置退款成功，不走渠道退款 */
export function manualCompleteRefund(id: number, params?: { operator_name?: string; remark?: string }) {
  return http.post<null>(`/admin/refunds/${id}/manual-complete`, undefined, { params: { ...params } })
}

/** 手动重试退款 POST /api/admin/refunds/:id/manual-refund
 *  swagger：operator_name / refund_channel / refund_amount(分) / remark 均为 query 选填；
 *  对退款失败/退款中的退款单重新发起渠道退款 */
export function manualRefund(
  id: number,
  params?: { operator_name?: string; refund_channel?: string; refund_amount?: number; remark?: string },
) {
  return http.post<null>(`/admin/refunds/${id}/manual-refund`, undefined, { params: { ...params } })
}

/** 退款渠道执行留痕列表 GET /api/admin/refund-channel-logs（swagger：refund_id / refund_no 选填） */
export function getRefundChannelLogs(params?: { refund_id?: number; refund_no?: string }) {
  return http.get<RefundItem['refund_channel_logs']>('/admin/refund-channel-logs', { ...params })
}
