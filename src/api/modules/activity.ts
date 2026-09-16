/**
 * 活动管理（运营后台端-API设计 §8.1 活动 + §8.2 报名记录）
 * 权限 activity:manage；活动/报名状态枚举见共通 §6.12 / §6.13
 * 说明：DTO 对齐文档契约（snake_case，时间为 UTC 秒），字段名以后端实测返回为准
 */
import type { AxiosResponse } from 'axios'
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult } from '@/types/api'

/** 发布状态 */
export type PublishStatus = 'published' | 'unpublished' | 'pending' | 'offline'

/** 配置参与机构：单家机构的活动时间与承接人数 */
export interface ActivityInstitutionConfig {
  institution_id: string
  max_participants: number // 该机构名额上限
  start_time: number // UTC秒级
  end_time: number // UTC秒级
  contact_name: string
  contact_phone: string
}

/** 活动列表项 */
export interface ActivityItem {
  id: string
  code: string /** 活动编号，如 HD20260807001 */
  title: string
  title_en?: string
  /** 活动类型：1社区活动 / 2康养旅游 / 3健康课堂 / 4健康活动 / 5其他
   *  注意：后端出参与创建入参均为 activity_type（筛选入参为 type，见 getActivities） */
  activity_type: number
  status: number  // 1-待发布 2-报名中 9-已取消
  /** 封面图：创建 / 编辑入参字段名同为 cover_url */
  cover_url: string
  description?: string // 富文本json
  location?: string // 区域，用户输入活动举办的区域即可
  start_date: number // UTC秒级
  end_date: number // UTC秒级
  institutions: ActivityInstitutionConfig[]
  target_crowd?: string // 适用人群
  /** 以下为列表接口额外聚合字段（后端列表返回） */
  institution_count?: number
  total_max_participants?: number
  total_registered?: number
}

/* ------------------------------------------------------------------ */
/* §8.1 活动管理（权限 activity:manage）                                 */
/* ------------------------------------------------------------------ */

/** 活动新增 / 编辑入参 */
export type ActivitySaveBody = Omit<ActivityItem, 'id' | 'status'>

/** 活动列表 GET /api/admin/activities（按类型/机构/状态/关键字）
 *  筛选参数名以后端为准：类型为 type（实测生效），非 activity_type */
export function getActivities(
  params?: ApiPageParams & {
    type?: number
    institution_id?: number
    status?: number
  },
) {
  return http.get<ApiPageResult<ActivityItem>>('/admin/activities', { ...params })
}

/** 活动详情 GET /api/admin/activities/:id（含指定机构列表、报名情况） */
export function getActivity(id: number) {
  return http.get<ActivityItem>(`/admin/activities/${id}`)
}

/** 新增活动 POST /api/admin/activities（含指定参与机构） */
export function createActivity(data: ActivitySaveBody) {
  return http.post<null>('/admin/activities', data)
}

/** 编辑活动 PUT /api/admin/activities/:id（全量覆盖） */
export function updateActivity(id: number, data: Partial<ActivitySaveBody>) {
  return http.put<null>(`/admin/activities/${id}`, data)
}

/** 发布/取消 POST /api/admin/activities/:id/status，body {status:1|2|3|9} */
export function updateActivityStatus(id: number, status: number) {
  return http.post<null>(`/admin/activities/${id}/status`, { status })
}

/** 指定机构配置 PUT /api/admin/activities/:id/institutions */
export function saveActivityInstitutions(id: number, institutions: ActivityInstitutionConfig[]) {
  return http.put<null>(`/admin/activities/${id}/institutions`, { institutions })
}

/** 删除活动 DELETE /api/admin/activities/:id */
export function deleteActivity(id: number) {
  return http.delete<null>(`/admin/activities/${id}`)
}

/* ------------------------------------------------------------------ */
/* §8.2 报名记录                                                        */
/* ------------------------------------------------------------------ */

/** 报名记录 DTO（字段名以后端实测返回为准：name / phone / registered_source） */
export interface ActivityRegistrationDTO {
  id: number
  activity_id: number
  institution_id: number
  member_id: number
  /** 会员姓名 */
  name: string
  /** 手机号 */
  phone: string
  participant_count: number
  /** 报名来源，如 miniapp */
  registered_source: string
  /** 报名状态：1-已报名 2-已签到 3-已取消 */
  status: number
  /** 报名时间（UTC 秒；后端暂未填充，0 表示缺失） */
  registered_at: number
  /** 取消报名时间（UTC 秒；0 表示未取消） */
  unregistered_at: number
  remark: string
  user_id: number
}

/** 活动报名导出 GET /api/admin/activities/:id/registrations/export
 *  后端返回 CSV 文件流（Content-Disposition 带文件名）；
 *  注意：响应拦截器对 responseType=blob 的请求返回整个 AxiosResponse，故此处类型为 AxiosResponse<Blob> */
export function exportActivityRegistrations(activityId: number): Promise<AxiosResponse<Blob>> {
  return http.get<AxiosResponse<Blob>>(
    `/admin/activities/${activityId}/registrations/export`,
    undefined,
    { responseType: 'blob' },
  )
}

/** 报名列表（跨活动）GET /api/admin/activity-registrations
 *  说明：活动内报名接口 /activities/:id/registrations 后端已下线（404），统一走本接口并用 activity_id 过滤 */
export function getActivityRegistrations(
  params?: ApiPageParams & {
    activity_id?: number
    institution_id?: number
    status?: number
  },
) {
  return http.get<ApiPageResult<ActivityRegistrationDTO>>('/admin/activity-registrations', {
    ...params,
  })
}

/** 报名列表别名（跨活动，语义与 getActivityRegistrations 相同） */
export function getRegistrations(
  params?: ApiPageParams & {
    activity_id?: number
    institution_id?: number
    status?: number
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

/** 取消报名 POST /api/admin/activity-registrations/:id/cancel */
export function cancelRegistration(id: number, remark: string) {
  return http.post<null>(`/admin/activity-registrations/${id}/cancel`, { remark })
}
