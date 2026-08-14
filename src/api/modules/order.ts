import { http } from '@/utils/request'
import type { PageParams, PageResult } from '@/types/api'

export interface OrderItem {
  id: number
  orderNo: string
  serviceName: string
  institutionName: string
  amount: number
  status: number // 0 待支付 1 已支付 2 已完成 3 已退款 4 已取消
  createdAt: string
}

export interface OrderDetail extends OrderItem {
  buyerName: string
  buyerPhone: string
  remark: string
}

/** 订单分页列表 */
export function getOrderList(params: PageParams) {
  return http.get<PageResult<OrderItem>>('/order/list', { ...params })
}

/** 订单详情 */
export function getOrderDetail(id: number) {
  return http.get<OrderDetail>(`/order/${id}`)
}

/** 导出订单 */
export function exportOrder(params: PageParams) {
  return http.get<Blob>('/order/export', { ...params }, { responseType: 'blob' })
}
