import { http } from '@/utils/request'
import type { PageParams, PageResult } from '@/types/api'

export interface ActivityItem {
  id: number
  title: string
  coverUrl: string
  status: number // 0 未开始 1 进行中 2 已结束 3 已下架
  startTime: string
  endTime: string
}

/** 活动分页列表 */
export function getActivityList(params: PageParams) {
  return http.get<PageResult<ActivityItem>>('/activity/list', { ...params })
}

/** 活动详情 */
export function getActivityDetail(id: number) {
  return http.get<ActivityItem>(`/activity/${id}`)
}

/** 创建 / 更新活动 */
export function saveActivity(data: Partial<ActivityItem>) {
  return data.id
    ? http.put<null>('/activity/update', data)
    : http.post<null>('/activity/create', data)
}

/** 活动上下架 */
export function toggleActivity(id: number, enabled: boolean) {
  return http.post<null>(`/activity/${id}/toggle`, { enabled })
}
