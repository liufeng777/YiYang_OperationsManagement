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

/** 活动关联机构配置（swagger admin.ActivityInstitution）：单家机构的活动时间与承接人数 */
export interface ActivityInstitutionConfig {
  /** 机构 ID，必填 */
  institution_id: number
  /** 该机构名额上限 */
  max_participants?: number
  /** 该机构场次开始时间（UTC 秒） */
  start_time?: number
  /** 该机构场次结束时间（UTC 秒） */
  end_time?: number
  contact_name?: string
  contact_phone?: string
  /** 启用状态：1-启用 9-禁用 */
  status?: number
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

/** 活动新增 / 编辑入参（swagger admin.ReqCreateActivity：仅 title 必填） */
export interface ActivitySaveBody {
  /** 活动标题，必填 */
  title: string
  title_en?: string
  /** 活动类型：1社区活动 / 2康养旅游 / 3健康课堂 / 4健康活动 / 5其他 */
  activity_type?: number
  cover_url?: string
  /** 富文本 JSON */
  description?: string
  /** 举办地点（区域） */
  location?: string
  /** 开始时间（UTC 秒） */
  start_date?: number
  /** 结束时间（UTC 秒） */
  end_date?: number
  /** 参与机构配置 */
  institutions?: ActivityInstitutionConfig[]
  /** 适用人群 */
  target_crowd?: string
  /** 活动状态：1-草稿 2-上架 9-已取消（空则新建默认草稿） */
  status?: number
}

/** 活动列表 GET /api/admin/activities（swagger：page / page_size / keyword / type / institution_id / status）
 *  筛选参数名以后端为准：类型为 type（swagger 标注 string 类型） */
export function getActivities(
  params?: ApiPageParams & {
    type?: string
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
export function updateActivity(id: number, data: ActivitySaveBody) {
  return http.put<null>(`/admin/activities/${id}`, data)
}

/** 发布/取消 POST /api/admin/activities/:id/status（swagger：body {status:1|2|3|9}，remark 为 query 选填） */
export function updateActivityStatus(id: number, status: number, remark?: string) {
  return http.post<null>(`/admin/activities/${id}/status`, { status }, { params: { remark } })
}

/** 活动关联机构列表 GET /api/admin/activities/:id/institutions */
export function getActivityInstitutions(id: number) {
  return http.get<ActivityInstitutionConfig[]>(`/admin/activities/${id}/institutions`)
}

/** 新增/修改单个活动机构配置 PUT /api/admin/activities/:id/institutions
 *  swagger：upsert（存在则更新，不存在则新建），body 为单个机构配置（institution_id 必填） */
export function upsertActivityInstitution(id: number, data: ActivityInstitutionConfig) {
  return http.put<null>(`/admin/activities/${id}/institutions`, data)
}

/** 删除活动下的单个机构配置 DELETE /api/admin/activities/:id/institutions/:institutionId
 *  swagger：remark 为 query 选填 */
export function deleteActivityInstitution(id: number, institutionId: number, remark?: string) {
  return http.delete<null>(`/admin/activities/${id}/institutions/${institutionId}`, { remark })
}

/** 删除活动 DELETE /api/admin/activities/:id（swagger：remark 为 query 选填） */
export function deleteActivity(id: number, remark?: string) {
  return http.delete<null>(`/admin/activities/${id}`, { remark })
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

/** 活动报名导出 GET /api/admin/activities/:id/registrations/export（swagger：institution_id / status 选填）
 *  后端返回 CSV 文件流（Content-Disposition 带文件名）；
 *  注意：响应拦截器对 responseType=blob 的请求返回整个 AxiosResponse，故此处类型为 AxiosResponse<Blob> */
export function exportActivityRegistrations(
  activityId: number,
  params?: { institution_id?: number; status?: number },
): Promise<AxiosResponse<Blob>> {
  return http.get<AxiosResponse<Blob>>(
    `/admin/activities/${activityId}/registrations/export`,
    { ...params },
    { responseType: 'blob' },
  )
}

/** 报名列表（跨活动）GET /api/admin/activity-registrations
 *  swagger：page / page_size / activity_id / institution_id / status / contact_phone（模糊匹配会员手机号）
 *  说明：活动内报名接口 /activities/:id/registrations 后端已下线（404），统一走本接口并用 activity_id 过滤 */
export function getActivityRegistrations(
  params?: ApiPageParams & {
    activity_id?: number
    institution_id?: number
    status?: number
    contact_phone?: string
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
    contact_phone?: string
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

/** 取消报名 POST /api/admin/activity-registrations/:id/cancel（swagger：remark 为 query 选填，无 body） */
export function cancelRegistration(id: number, remark?: string) {
  return http.post<null>(`/admin/activity-registrations/${id}/cancel`, undefined, { params: { remark } })
}
