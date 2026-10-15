/**
 * 工单管理（swagger：工单管理）
 * 权限 work-order:view；swagger 仅收录 工单列表 / 工单详情 两个只读接口，
 * 派单 / 改派 / 取消 / 导出等接口未收录，已移除。
 */
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult } from '@/types/api'

/**
 * 工单状态：
 * 1-待排单 2-待接单 3-已接单 4-已签到 5-服务中 6-已完成 7-已取消
 */
export type WoStatus = 1 | 2 | 3 | 4 | 5 | 6 | 7

/** 工单 DTO（列表；详情另含排单、服务留痕、证据、改派记录） */
export interface WorkOrderDTO {
  id: number
  work_order_no: string
  order_id: number
  member_id: number
  member_name: string
  member_phone: string
  service_address: string
  expected_start_at: number
  expected_stop_at: number
  wo_status: WoStatus
  assignee_id: number | null
  assignee_name: string | null
  schedule_id: number | null
  /** 期望医护（下单时所填，派单参考） */
  expect_staff: number | null
  expect_staff_name: string | null
  remark: string
  assigned_at: number | null
  accepted_at: number | null
  completed_at: number | null
  cancelled_at: number | null
  created_at: number
}

/** 工单列表 GET /api/admin/work-orders
 *  swagger：page / page_size / institution_id（订单归属机构）/ wo_status / member_id /
 *           member_name / order_id / order_no（模糊）/ start_time / end_time（created_at 范围，UTC 秒） */
export function getWorkOrders(
  params?: ApiPageParams & {
    institution_id?: number
    wo_status?: WoStatus
    member_id?: number
    member_name?: string
    order_id?: number
    order_no?: string
    start_time?: number
    end_time?: number
  },
) {
  return http.get<ApiPageResult<WorkOrderDTO>>('/admin/work-orders', { ...params })
}

/** 工单详情 GET /api/admin/work-orders/:id（含排单、服务留痕、证据、改派记录） */
export function getWorkOrder(id: number) {
  return http.get<WorkOrderDTO>(`/admin/work-orders/${id}`)
}
