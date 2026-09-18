/**
 * 服务订单管理（运营后台端-API设计 §6.1）
 * 权限 order:view / order:manage；订单状态枚举见共通 §6.1
 * 说明：字段名与单位以后端实测返回为准——金额单位为「分」，列表/详情不返回 service_id、start_time 等
 */
import type { AxiosResponse } from 'axios'
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult } from '@/types/api'

/** 订单状态（共通 §6.1）：1-待支付 2-待确认 3-生效中 4-已完成 5-已取消 6-已退款 */
export type OrderStatusCode = 1 | 2 | 3 | 4 | 5 | 6

/** 退款类型：1-全额退款 2-部分退款 */
export type OrderRefundType = 1 | 2

/** 订单（列表项与详情字段一致，后端实测：SO2026xxxxxxx 号段） */
export interface OrderDetail {
  id: number
  /** 订单号 */
  order_no: string
  /** 订单状态：1-待支付 2-待确认 3-生效中 4-已完成 5-已取消 6-已退款 */
  order_status: number
  /** 服务对象（会员ID） */
  member_id: number
  /** 注册会员（用户ID） */
  user_id: number
  institution_id: number
  contact_name: string
  contact_phone: string
  /** 购买服务次数 */
  service_count: number
  /** 已服务次数 */
  served_count: number
  /** 订单原价（分） */
  total_amount: number
  /** 优惠金额（分） */
  discount_amount: number
  /** 实付金额（分） */
  paid_amount: number
  remark: string
  /** 下单时间（UTC 秒） */
  created_at: number
}

/** 后台代下单 / 编辑订单入参（契约全集） */
export interface OrderSaveBody {
  /** 注册会员（用户ID） */
  user_id: number
  /** 服务对象（会员ID） */
  member_id: number
  institution_id: number
  /** 服务项目ID */
  service_id: number
  /** 购买服务次数 */
  service_count: number
  /** 下单金额（分） */
  amount: number
  /** 1-不带耗材（默认） 2-带耗材 */
  is_use_consumables: number
  /** 意向服务人员ID */
  expect_staff_id?: number
  /** 服务地址ID */
  member_address_id?: number
  contact_name: string
  contact_phone: string
  remark: string
}

/** 订单列表筛选入参 */
export interface OrderListParams extends ApiPageParams {
  order_status?: number
  institution_id?: number
  member_id?: number
  order_no?: string
  /** 下单时间范围（UTC 秒） */
  start_time?: number
  end_time?: number
}

/** 订单确认入参 */
export interface OrderConfirmBody {
  /** 服务人员ID */
  staff_id: number
  /** 确认结果：1-通过 2-拒绝 */
  result: number
  /** 确认结果说明 */
  reason?: string
}

/** 订单退款入参 */
export interface OrderRefundBody {
  /** 退款金额（分） */
  amount: number
  /** 退款类型：1-全额 2-部分 */
  type: OrderRefundType
  reason: string
}

/** 订单列表 GET /api/admin/orders */
export function getOrders(params?: OrderListParams) {
  return http.get<ApiPageResult<OrderDetail>>('/admin/orders', { ...params })
}

/** 订单详情 GET /api/admin/orders/:id */
export function getOrder(id: number) {
  return http.get<OrderDetail>(`/admin/orders/${id}`)
}

/** 后台代下单 POST /api/admin/orders */
export function createOrder(data: OrderSaveBody) {
  return http.post<null>('/admin/orders', data)
}

/** 编辑订单 PUT /api/admin/orders/:id */
export function updateOrder(id: number, data: Partial<OrderSaveBody>) {
  return http.put<null>(`/admin/orders/${id}`, data)
}

/** 订单确认 POST /api/admin/orders/:id/confirm（待确认 2 → 生效中 3） */
export function confirmOrder(id: number, data: OrderConfirmBody) {
  return http.post<null>(`/admin/orders/${id}/confirm`, data)
}

/** 订单取消 POST /api/admin/orders/:id/cancel */
export function cancelOrder(id: number, reason: string) {
  return http.post<null>(`/admin/orders/${id}/cancel`, { reason })
}

/** 订单退款发起 POST /api/admin/orders/:id/refund */
export function createOrderRefund(id: number, data: OrderRefundBody) {
  return http.post<null>(`/admin/orders/${id}/refund`, data)
}

/**
 * 订单导出 GET /api/admin/orders/export
 * 后端当前返回 JSON（{ download_url }）而非文件流，故类型为 AxiosResponse<Blob>；
 * 页面据此判断 content-type：JSON 取 download_url 跳转下载，二进制流直接落盘
 */
export function exportOrders(params?: OrderListParams): Promise<AxiosResponse<Blob>> {
  return http.get<AxiosResponse<Blob>>('/admin/orders/export', { ...params }, { responseType: 'blob' })
}
