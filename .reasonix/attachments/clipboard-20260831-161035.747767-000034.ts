/**
 * 活动管理（运营后台端-API设计 §8.1 活动 + §8.2 报名记录）
 * 权限 activity:manage；活动/报名状态枚举见共通 §6.12 / §6.13
 * 说明：上半部分为页面展示用类型（mock），下半部分 DTO 对齐文档契约。
 */
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult, BatchResult } from '@/types/api'

/* ------------------------------------------------------------------ */
/* 页面展示类型（mock，接后端后逐步切换到下方 DTO）                       */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* §8.1 活动管理（权限 activity:manage）                                 */
/* ------------------------------------------------------------------ */

/** 活动状态（共通 §6.12）：1-草稿 2-进行中 3-已结束 9-已取消 */
export type ActivityStatusCode = 1 | 2 | 3 | 9

/** 活动参与机构配置（入参嵌套） */
export interface ActivityInstitutionBody {
  institution_id: number
  max_participants: number
  start_time?: number
  end_time?: number
}

/** 活动参与机构（出参，含报名数） */
export interface ActivityInstitutionDTO extends ActivityInstitutionBody {
  institution_id: number
  max_participants: number // 该机构名额上限
  contact_name: string // 联系人
  contact_phone: string // 联系电话
  start_time: number // UTC秒
  end_time: number // 该机构场次开始时间
}

/** 活动 DTO */
export interface ActivityDTO {
  title: string
  title_en: string | null
  description: Record<string, unknown>
  cover_image: string
  activity_type: number /** 活动类型：1 社区活动 / 2 康养旅游 / 3 健康课堂 / 4 健康活动 / 5 其他 */
  /** UTC 秒；入参接受 yyyy-MM-dd*/
  start_date: number
  end_date: number
  location: string
  institutions: ActivityInstitutionDTO[]
}


/** 活动新增 / 编辑入参 */
export type ActivitySaveBody = Omit<ActivityDTO, 'id' | 'status' | 'registration_summary'>

/** 活动列表 GET /api/admin/activities（按类型/机构/状态/关键字） */
export function getActivities(
  params?: ApiPageParams & {
    activity_type?: number
    institution_id?: number
    status?: ActivityStatusCode
  },
) {
  return http.get<ApiPageResult<ActivityDTO>>('/admin/activities', { ...params })
}

/** 活动详情 GET /api/admin/activities/:id（含指定机构列表、报名情况） */
export function getActivity(id: number) {
  return http.get<ActivityDTO>(`/admin/activities/${id}`)
}

/** 新增活动 POST /api/admin/activities（含指定参与机构） */
export function createActivity(data: ActivitySaveBody) {
  return http.post<null>('/admin/activities', data)
}

/** 编辑活动 PUT /api/admin/activities/:id */
export function updateActivity(id: number, data: Partial<ActivitySaveBody>) {
  return http.put<null>(`/admin/activities/${id}`, data)
}

/** 发布/取消 POST /api/admin/activities/:id/status，body {status:1|2|3|9} */
export function updateActivityStatus(id: number, status: ActivityStatusCode) {
  return http.post<null>(`/admin/activities/${id}/status`, { status })
}

/** 批量发布/取消 POST /api/admin/activities/batch-status */
export function batchUpdateActivityStatus(ids: number[], status: 1 | 9) {
  return http.post<BatchResult>('/admin/activities/batch-status', { ids, status })
}

/** 指定机构配置 PUT /api/admin/activities/:id/institutions */
export function saveActivityInstitutions(id: number, institutions: ActivityInstitutionBody[]) {
  return http.put<null>(`/admin/activities/${id}/institutions`, { institutions })
}

/** 删除活动 DELETE /api/admin/activities/:id */
export function deleteActivity(id: number) {
  return http.delete<null>(`/admin/activities/${id}`)
}

/* ------------------------------------------------------------------ */
/* §8.2 报名记录                                                        */
/* ------------------------------------------------------------------ */

/** 报名状态（共通 §6.13）：1-已报名 2-已参加 3-已取消 */
export type RegistrationStatus = 1 | 2 | 3

/** 报名记录 DTO */
export interface ActivityRegistrationDTO {
  id: number
  activity_id: number
  activity_title: string
  institution_id: number
  member_id: number
  member_name: string
  member_phone: string
  participant_count: number
  /** 报名来源，如 miniapp */
  registration_source: string
  signed_at: number | null
  status: RegistrationStatus
  referral_mem_id: number | null
  registered_at: number
}

/** 活动报名列表 GET /api/admin/activities/:id/registrations（按签到状态） */
export function getActivityRegistrations(
  activityId: number,
  params?: ApiPageParams & { status?: RegistrationStatus },
) {
  return http.get<ApiPageResult<ActivityRegistrationDTO>>(
    `/admin/activities/${activityId}/registrations`,
    { ...params },
  )
}

/** 活动报名导出 GET /api/admin/activities/:id/registrations/export */
export function exportActivityRegistrations(activityId: number) {
  return http.get<Blob>(
    `/admin/activities/${activityId}/registrations/export`,
    undefined,
    { responseType: 'blob' },
  )
}

/** 报名列表（跨活动）GET /api/admin/activity-registrations */
export function getRegistrations(
  params?: ApiPageParams & {
    activity_id?: number
    institution_id?: number
    status?: RegistrationStatus
  },
) {
  return http.get<ApiPageResult<ActivityRegistrationDTO>>('/admin/activity-registrations', {
    ...params,
  })
}

/** 签到 POST /api/admin/activity-registrations/:id/checkin（扫码核销或运营代签到） */
export function checkinRegistration(id: number) {
  return http.post<null>(`/admin/activity-registrations/${id}/checkin`)
}
