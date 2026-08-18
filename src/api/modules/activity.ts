import { http } from '@/utils/request'
import type { PageParams, PageResult } from '@/types/api'

/** 活动状态 */
export type ActivityStatus = 'draft' | 'pending' | 'signup' | 'ongoing' | 'full' | 'finished'
/** 发布状态 */
export type PublishStatus = 'published' | 'unpublished' | 'pending' | 'offline'

/** 活动列表项 */
export interface ActivityItem {
  id: string
  /** 活动编号，如 HD20260807001 */
  code: string
  name: string
  /** 活动类型：社区活动 / 康养旅游 / 健康课堂 / 健康活动 */
  type: string
  /** 承接机构数量 */
  institutionCount: number
  /** 已报名人数（草稿无报名数据时为 null） */
  signupCount: number | null
  /** 承接容量 */
  capacity: number
  status: ActivityStatus
  publishStatus: PublishStatus
  /** 活动时间展示，如 09-20 09:00 */
  activityTime: string
}

/** 活动报名记录 */
export interface ActivitySignup {
  id: string
  /** 报名编号，如 BM20260818001 */
  code: string
  userName: string
  /** 脱敏手机号，如 138****1026 */
  phone: string
  institutionName: string
  /** 机构区域，如 拱墅区·申花街道 */
  institutionArea: string
  status: 'signed' | 'cancelled'
  signupTime: string
  remark?: string
}

/** 配置参与机构：单家机构的活动时间与承接人数 */
export interface ActivityInstitutionConfig {
  id: string
  name: string
  area: string
  /** 活动时间展示，如 09-20 09:00 */
  activityTime: string
  /** 承接人数 */
  capacity: number
}

/** 活动分页列表 */
export function getActivityList(params: PageParams & { keyword?: string; status?: string }) {
  return http.get<PageResult<ActivityItem>>('/activity/list', { ...params })
}

/** 活动详情 */
export function getActivityDetail(id: string) {
  return http.get<ActivityItem>(`/activity/${id}`)
}

/** 创建 / 更新活动 */
export function saveActivity(data: Partial<ActivityItem>) {
  return data.id
    ? http.put<null>('/activity/update', data)
    : http.post<null>('/activity/create', data)
}

/** 发布活动 */
export function publishActivity(id: string) {
  return http.post<null>(`/activity/${id}/publish`)
}

/** 活动报名记录分页 */
export function getActivitySignups(params: PageParams & { activityId?: string; status?: string }) {
  return http.get<PageResult<ActivitySignup>>('/activity/signups', { ...params })
}

/** 取消报名 */
export function cancelSignup(id: string) {
  return http.post<null>(`/activity/signup/${id}/cancel`)
}
