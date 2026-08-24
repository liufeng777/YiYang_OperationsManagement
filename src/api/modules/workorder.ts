/**
 * 工单管理（运营后台端-API设计 §7）
 * 权限 work-order:view / work-order:manage；工单状态枚举见共通 §6.2
 */
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult, BatchResult } from '@/types/api'

/**
 * 工单状态（共通 §6.2）：
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

/** 派单入参 */
export interface DispatchBody {
  staff_id: number
  /** yyyy-MM-dd */
  service_date: string
  planned_start: string
  planned_stop: string
}

/** 工单列表 GET /api/admin/work-orders（按机构/状态/时间/会员） */
export function getWorkOrders(
  params?: ApiPageParams & {
    institution_id?: number
    wo_status?: WoStatus
    member_id?: number
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

/** 工单排单/派单 POST /api/admin/work-orders/:id/dispatch */
export function dispatchWorkOrder(id: number, data: DispatchBody) {
  return http.post<null>(`/admin/work-orders/${id}/dispatch`, data)
}

/** 工单改派 POST /api/admin/work-orders/:id/reassign（留痕） */
export function reassignWorkOrder(id: number, newStaffId: number, reason: string) {
  return http.post<null>(`/admin/work-orders/${id}/reassign`, {
    new_staff_id: newStaffId,
    reason,
  })
}

/** 工单取消 POST /api/admin/work-orders/:id/cancel */
export function cancelWorkOrder(id: number, reason: string) {
  return http.post<null>(`/admin/work-orders/${id}/cancel`, { reason })
}

/** 工单批量派单 POST /api/admin/work-orders/batch-dispatch */
export function batchDispatchWorkOrders(workOrderIds: number[], data: DispatchBody) {
  return http.post<BatchResult>('/admin/work-orders/batch-dispatch', {
    work_order_ids: workOrderIds,
    ...data,
  })
}

/** 工单批量改派 POST /api/admin/work-orders/batch-reassign（逐单留痕） */
export function batchReassignWorkOrders(workOrderIds: number[], newStaffId: number, reason: string) {
  return http.post<BatchResult>('/admin/work-orders/batch-reassign', {
    work_order_ids: workOrderIds,
    new_staff_id: newStaffId,
    reason,
  })
}

/** 工单导出 GET /api/admin/work-orders/export */
export function exportWorkOrders(params?: ApiPageParams & { wo_status?: WoStatus }) {
  return http.get<Blob>('/admin/work-orders/export', { ...params }, { responseType: 'blob' })
}
