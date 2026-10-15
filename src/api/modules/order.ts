/**
 * 服务订单管理（swagger：订单支付与对账-订单管理）
 * 权限 order:view / order:manage
 * 说明：swagger 仅收录 列表 / 导出 / 详情 / 退款发起 四个接口；
 *       字段名与单位以后端实测返回为准——金额单位为「分」
 */
import type { AxiosResponse } from 'axios'
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult } from '@/types/api'

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

/** 订单退款入参（swagger admin.ReqRefundOrder：amount / reason / type 必填） */
export interface OrderRefundBody {
  /** 退款金额（分） */
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
