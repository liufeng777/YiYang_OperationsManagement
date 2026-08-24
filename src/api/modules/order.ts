/**
 * 服务订单管理（运营后台端-API设计 §6.1）
 * 权限 order:view / order:manage；订单状态枚举见共通 §6.1
 * 说明：上半部分为页面展示用类型（mock），下半部分 DTO 对齐文档契约。
 */
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult } from '@/types/api'

/* ------------------------------------------------------------------ */
/* 页面展示类型（mock，接后端后逐步切换到下方 DTO）                       */
/* ------------------------------------------------------------------ */

/** 订单状态 */
export type OrderStatus = 'paid' | 'fulfilling' | 'finished' | 'refunding' | 'cancelled'
/** 协作工单状态 */
export type WorkOrderStatus = 'pending' | 'assigned' | 'serving' | 'done' | 'cancelled' | 'none'

/** 订单列表项 */
export interface OrderItem {
  id: string
  /** 订单号，如 DD202608070001 */
  orderNo: string
  serviceName: string
  userName: string
  /** 脱敏手机号，如 138****1026 */
  userPhone: string
  institutionName: string
  /** 实付金额（元） */
  amount: number
  status: OrderStatus
  workOrderStatus: WorkOrderStatus
  /** 预约服务时间展示，如 08-08 09:00 */
  appointmentTime: string
}

/** 订单操作记录 */
export interface OrderLog {
  id: string
  time: string
  source: string
  action: string
  description: string
  operator: string
}

/** 订单详情 */
export interface OrderDetail extends OrderItem {
  serviceDuration: string
  payMethod: string
  payTime: string
  serviceAddress: string
  originAmount: number
  /** 工单号，如 GD202608070001 */
  workOrderNo: string
  remark: string
  logs: OrderLog[]
}

/* ------------------------------------------------------------------ */
/* §6.1 服务订单（权限 order:view / order:manage）                       */
/* ------------------------------------------------------------------ */

/**
 * 订单状态（共通 §6.1）：
 * 1-待支付 2-待确认 3-生效中 4-已完成 5-已取消 6-已退款
 */
export type OrderStatusCode = 1 | 2 | 3 | 4 | 5 | 6

/** 订单耗材项（一对多嵌套，共通 §1.4） */
export interface OrderConsumableItem {
  id: number
  name: string
  unit_price: number
  count: number
  amount: number
}

/** 订单关联退款单片段 */
export interface OrderRefundBrief {
  id: number
  refund_no: string
  refund_amount: number
  /** 退款状态，见共通 §6.4 */
  refund_status: number
}

/** 订单 DTO（列表 / 详情共用，详情含嵌套子结构） */
export interface OrderDTO {
  id: number
  order_no: string
  member_id: number
  member_name: string
  member_phone: string
  institution_id: number
  institution_name?: string
  service_id: number
  service_name: string
  service_category: number
  consumables: OrderConsumableItem[]
  total_amount: number
  paid_amount: number
  discount_amount: number
  service_count: number
  served_count: number
  order_status: OrderStatusCode
  contact_name: string
  contact_phone: string
  remark: string
  /** 意向服务人员 ID */
  assigned_staff: number | null
  paid_at: number | null
  completed_at: number | null
  cancelled_at: number | null
  cancel_reason: string | null
  refund_list: OrderRefundBrief[]
  created_at: number
}

/** 订单列表筛选入参 */
export interface OrderListParams extends ApiPageParams {
  order_status?: OrderStatusCode
  institution_id?: number
  member_id?: number
  order_no?: string
  start_time?: number
  end_time?: number
  refund_status?: number
}

/** 订单列表 GET /api/admin/orders */
export function getOrders(params?: OrderListParams) {
  return http.get<ApiPageResult<OrderDTO>>('/admin/orders', { ...params })
}

/** 订单详情 GET /api/admin/orders/:id（含订单项、耗材、支付流水、退款单） */
export function getOrder(id: number) {
  return http.get<OrderDTO>(`/admin/orders/${id}`)
}

/** 后台代下单 POST /api/admin/orders */
export function createOrder(data: Partial<OrderDTO>) {
  return http.post<null>('/admin/orders', data)
}

/** 编辑订单 PUT /api/admin/orders/:id */
export function updateOrder(id: number, data: Partial<OrderDTO>) {
  return http.put<null>(`/admin/orders/${id}`, data)
}

/** 订单确认 POST /api/admin/orders/:id/confirm（待确认 2 → 生效中 3） */
export function confirmOrder(id: number, assignedStaff?: number) {
  return http.post<null>(`/admin/orders/${id}/confirm`, { assigned_staff: assignedStaff })
}

/** 订单取消 POST /api/admin/orders/:id/cancel */
export function cancelOrder(id: number, reason: string) {
  return http.post<null>(`/admin/orders/${id}/cancel`, { reason })
}

/** 订单退款发起 POST /api/admin/orders/:id/refund */
export function createOrderRefund(
  id: number,
  data: { amount: number; type: number; reason: string },
) {
  return http.post<null>(`/admin/orders/${id}/refund`, data)
}

/** 订单导出 GET /api/admin/orders/export（CSV/Excel） */
export function exportOrders(params?: OrderListParams) {
  return http.get<Blob>('/admin/orders/export', { ...params }, { responseType: 'blob' })
}
