import { http } from '@/utils/request'
import type { PageParams, PageResult } from '@/types/api'

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

/** 订单分页列表 */
export function getOrderList(params: PageParams & { keyword?: string; status?: string }) {
  return http.get<PageResult<OrderItem>>('/order/list', { ...params })
}

/** 订单详情 */
export function getOrderDetail(id: string) {
  return http.get<OrderDetail>(`/order/${id}`)
}

/** 催促机构接单 */
export function urgeOrder(id: string) {
  return http.post<null>(`/order/${id}/urge`)
}

/** 取消订单 */
export function cancelOrder(id: string, reason?: string) {
  return http.post<null>(`/order/${id}/cancel`, { reason })
}

/** 导出订单 */
export function exportOrder(params: PageParams) {
  return http.get<Blob>('/order/export', { ...params }, { responseType: 'blob' })
}
