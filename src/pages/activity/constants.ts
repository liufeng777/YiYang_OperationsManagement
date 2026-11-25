import dayjs from 'dayjs'
import type { ActivityItem } from '@/api/modules/activity'

/** 活动后端状态：仅由 status 决定，不与活动时间或报名名额混算。 */
export const activityStatusText: Record<number, string> = {
  0: '未知',
  1: '待发布',
  2: '报名中',
  3: '已结束',
  9: '已取消',
}

const activityStatusTone: Record<number, string> = {
  0: 'cancel',
  1: 'warning',
  2: 'success',
  3: 'cancel',
  9: 'danger',
}

export const activityTypeText: Record<number, string> = {
  1: '社区活动',
  2: '康养旅游',
  3: '健康课堂',
  4: '健康活动',
  5: '其他',
}

export function resolveActivityStatus(
  record: Pick<ActivityItem, 'status'>,
): { label: string; className: string } {
  return {
    label: activityStatusText[record.status] ?? '未知',
    className: `status--${activityStatusTone[record.status] ?? 'cancel'}`,
  }
}

export type ActivityTimeStatus = 'notStarted' | 'inProgress' | 'ended'

const activityTimeStatusOptions: Array<{
  value: ActivityTimeStatus
  label: string
  className: string
}> = [
  { value: 'notStarted', label: '未开始', className: 'status--info' },
  { value: 'inProgress', label: '活动中', className: 'status--success' },
  { value: 'ended', label: '已结束', className: 'status--cancel' },
]

/** 时间状态只根据当前时间与活动起止时间计算。 */
export function resolveActivityTimeStatus(
  record: Pick<ActivityItem, 'start_date' | 'end_date'>,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): { key: ActivityTimeStatus; label: string; className: string } {
  const key: ActivityTimeStatus = record.start_date && nowSeconds < record.start_date
    ? 'notStarted'
    : record.end_date && nowSeconds > record.end_date
      ? 'ended'
      : 'inProgress'
  const status = activityTimeStatusOptions.find((item) => item.value === key)!
  return { key, label: status.label, className: status.className }
}

/** UTC 秒 → 日期文案：当年只显示「MM-DD」，跨年显示「YYYY-MM-DD」；缺值显示 -。 */
export function formatActivityDate(
  seconds?: number,
  nowYear: number = dayjs().year(),
): string {
  if (!seconds) return '-'
  const value = dayjs(seconds * 1000)
  return value.year() === nowYear ? value.format('MM-DD') : value.format('YYYY-MM-DD')
}
