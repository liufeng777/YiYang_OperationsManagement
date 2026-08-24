/**
 * 订单退款审核（运营后台端-API设计 §6.2）
 * 权限 order:refund（财务/运营）；退款状态枚举见共通 §6.4
 * 说明：上半部分为页面展示用类型（mock），下半部分 DTO 对齐文档契约。
 */
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult } from '@/types/api'

/* ------------------------------------------------------------------ */
/* 页面展示类型（mock，接后端后逐步切换到下方 DTO）                       */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* §6.2 订单退款审核（权限 order:refund）                                */
/* ------------------------------------------------------------------ */

/**
 * 退款状态（共通 §6.4）：
 * 1-待审批 2-审批通过 3-退款中 4-已退款 5-已拒绝 6-退款失败
 */
export type RefundStatusCode = 1 | 2 | 3 | 4 | 5 | 6

/** 退款单 DTO */
export interface RefundDTO {
  id: number
  refund_no: string
  order_id: number
  order_no: string
  member_id: number
  member_name: string
  member_phone: string
  institution_id: number
  institution_name?: string
  refund_amount: number
  refund_status: RefundStatusCode
  /** 退款原因 */
  reason: string
  /** 原路退回渠道，如 wxpay */
  refund_channel: string | null
  approved_by: number | null
  approved_at: number | null
  created_at: number
}

/** 退款审批入参 */
export interface RefundApproveBody {
  approve: boolean
  /** 原路退回渠道，审核通过必填 */
  refund_channel?: string
  /** 实际退款金额，必填 */
  refund_amount: number
  opinion?: string
}

/** 退款审批留痕（refund_approval_records，见 §6.2 数据库补充建议） */
export interface RefundApprovalLog {
  id: number
  refund_id: number
  approver_id: number
  approver_name: string
  /** 审批结果：2-通过 5-拒绝 */
  approve_result: 2 | 5
  /** 处理类型：approve 同意 / reject 驳回 */
  approve_type: 'approve' | 'reject'
  opinion: string
  refund_channel: string | null
  refund_amount: number
  created_at: number
}

/** 退款单列表 GET /api/admin/refunds（按状态/机构/时间） */
export function getRefunds(
  params?: ApiPageParams & {
    refund_status?: RefundStatusCode
    institution_id?: number
    start_time?: number
    end_time?: number
  },
) {
  return http.get<ApiPageResult<RefundDTO>>('/admin/refunds', { ...params })
}

/** 退款单详情 GET /api/admin/refunds/:id（含支付流水、订单信息） */
export function getRefund(id: number) {
  return http.get<RefundDTO>(`/admin/refunds/${id}`)
}

/** 退款审批 POST /api/admin/refunds/:id/approve，出参 {refund_status: 2|5} */
export function approveRefund(id: number, data: RefundApproveBody) {
  return http.post<{ refund_status: 2 | 5 }>(`/admin/refunds/${id}/approve`, data)
}

/** 退款审批留痕 GET /api/admin/refunds/:id/logs */
export function getRefundLogs(id: number) {
  return http.get<RefundApprovalLog[]>(`/admin/refunds/${id}/logs`)
}

/** 退款导出 GET /api/admin/refunds/export */
export function exportRefunds(params?: ApiPageParams & { refund_status?: RefundStatusCode }) {
  return http.get<Blob>('/admin/refunds/export', { ...params }, { responseType: 'blob' })
}
