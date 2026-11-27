/**
 * 服务订单管理（swagger：订单支付与对账-订单管理）
 * 权限 order:view / order:manage
 * 金额单位：统一 DECIMAL(10,2) 的「元」（见《共通-API设计》§5），前端直接展示，不做分换算
 * 接口：列表 / 详情 / 取消 / 退款发起 / 导出
 */
import type { AxiosResponse } from 'axios'
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult } from '@/types/api'

/** 退款类型：1-全额退款 2-部分退款 */
export type OrderRefundType = 1 | 2

/** 订单消耗的耗材明细（金额单位：元） */
export interface OrderConsumable {
  id: number
  name: string
  /** 单价（元） */
  unit_price: number
  /** 数量 */
  count: number
  /** 小计（元） */
  amount: number
}

/** 订单关联的退款单摘要（refund_status 见 refund 模块：1-待业务审批 2-审批通过 3-退款中 4-已退款 5-已拒绝 6-退款失败） */
export interface OrderRefundSummary {
  id: number
  refund_no: string
  /** 退款金额（元） */
  refund_amount: number
  refund_status: number
}

/** 订单状态流转记录（详情页 Timeline 渲染） */
export interface OrderStatusHistory {
  /** 状态名称，如「待确认」「生效中」 */
  status_name: string
  /** 备注（如取消原因、退款说明） */
  remark?: string
  /** 发生时间（UTC 秒） */
  time: number
}

/**
 * 订单（列表项与详情字段一致）
 * 订单状态：1-待支付 2-待确认 3-生效中 4-已完成 5-已取消 6-已退款 7-退款中 8-退款待审批
 */
export interface OrderDetail {
  id: number
  /** 订单号 */
  order_no: string
  order_status: number
  /** 服务对象（会员） */
  member_id: number
  member_name?: string
  member_phone?: string
  /** 下单账号 */
  user_id?: number
  user_name?: string
  institution_id: number
  institution_name?: string
  /** 服务项目 */
  service_id?: number
  service_name?: string
  service_category?: number
  /** 耗材明细 */
  consumables?: OrderConsumable[]
  contact_name?: string
  contact_phone?: string
  /** 购买服务次数 */
  service_count: number
  /** 已服务次数 */
  served_count: number
  /** 订单原价（元） */
  total_amount: number
  /** 优惠金额（元） */
  discount_amount: number
  /** 实付金额（元） */
  paid_amount: number
  remark?: string
  /** 意向服务人员 ID */
  assigned_staff?: number | null
  /** 支付时间（UTC 秒） */
  paid_at?: number | null
  /** 完成时间（UTC 秒） */
  completed_at?: number | null
  /** 取消时间（UTC 秒） */
  cancelled_at?: number | null
  cancel_reason?: string | null
  /** 关联退款单 */
  refund_list?: OrderRefundSummary[]
  /** 状态流转记录 */
  status_history?: OrderStatusHistory[]
  /** 下单时间（UTC 秒） */
  created_at: number
}

/** 订单列表筛选入参（swagger：page / page_size / order_status / institution_id / member_id / order_no / start_time / end_time） */
export interface OrderListParams extends ApiPageParams {
  order_status?: number
  institution_id?: number
  member_id?: number
  order_no?: string
  /** 下单时间范围（UTC 秒） */
  start_time?: number
  end_time?: number
}

/** 订单取消入参（swagger admin.ReqCancelOrder：reason 必填） */
export interface OrderCancelBody {
  /** 取消原因，必填 */
  reason: string
}

/** 订单退款入参（swagger admin.ReqRefundOrder：amount / reason / type 必填） */
export interface OrderRefundBody {
  /** 退款金额（元） */
  amount: number
  /** 退款类型：1-全额 2-部分 */
  type: OrderRefundType
  reason: string
}

/** 订单列表 GET /api/admin/orders（swagger：page / page_size / order_status / institution_id / member_id / order_no / start_time / end_time） */
export function getOrders(params?: OrderListParams) {
  return http.get<ApiPageResult<OrderDetail>>('/admin/orders', { ...params })
}

/** 订单详情 GET /api/admin/orders/:id */
export function getOrder(id: number) {
  return http.get<OrderDetail>(`/admin/orders/${id}`)
}

/** 订单取消 POST /api/admin/orders/:id/cancel（body {reason}） */
export function cancelOrder(id: number, data: OrderCancelBody) {
  return http.post<null>(`/admin/orders/${id}/cancel`, data)
}

/** 订单退款发起 POST /api/admin/orders/:id/refund */
export function createOrderRefund(id: number, data: OrderRefundBody) {
  return http.post<null>(`/admin/orders/${id}/refund`, data)
}

/** 支付渠道查询结果；trade_state 为微信交易状态，如 SUCCESS / NOTPAY / NOT_EXIST。 */
export interface OrderPayQueryResult {
  message: string
  order_id: number
  order_no: string
  outsider_paid: number
  success_time: string
  trade_state: string
  transaction_id: string
  triggered_update: boolean
}

/** 手动查询订单支付结果 POST /api/admin/orders/:id/query-pay（无请求体） */
export function queryOrderPay(id: number) {
  return http.post<OrderPayQueryResult>(`/admin/orders/${id}/query-pay`)
}

/**
 * 订单导出 GET /api/admin/orders/export
 * 后端当前返回 JSON（{ download_url }）而非文件流，故类型为 AxiosResponse<Blob>；
 * 页面据此判断 content-type：JSON 取 download_url 跳转下载，二进制流直接落盘
 */
export function exportOrders(params?: OrderListParams): Promise<AxiosResponse<Blob>> {
  return http.get<AxiosResponse<Blob>>('/admin/orders/export', { ...params }, { responseType: 'blob' })
}
