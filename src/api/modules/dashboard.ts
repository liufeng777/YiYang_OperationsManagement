/**
 * 数据看板（运营后台端-API设计 §11）
 * 权限 dashboard:view；聚合接口出参不受分页包装约束（共通 §1.4）
 * 说明：运营首页使用 getDashboardOverview 一次性取回
 *       { accounts / dataset_dura / recent_orders / todos } 四块数据。
 */
import { http } from '@/utils/request'

/* ------------------------------------------------------------------ */
/* 运营首页总览（GET /admin/dashboard/overview 返回结构）                  */
/* ------------------------------------------------------------------ */

/** 账号统计 */
export interface DashboardAccounts {
  /** 建档会员数 */
  health_members: number
  /** 注册用户数 */
  registered_users: number
  /** 员工数 */
  staff_count: number
}

/** 趋势数据点
 *  实际返回：ts 为字符串（月视图 "2026-10-01"/"10-02"，日视图 "2026-10-20 00:00"/"10-20 01:00"），
 *  val 为金额/数量字符串（如 "0.00"）；均兼容数值型 */
export interface DashboardTrendPoint {
  /** 时间点：日期/小时字符串（可能省略年份）或 UTC 秒 */
  ts: string | number
  /** 数值（字符串或数字） */
  val: string | number
}

/** 时间范围数据集（注册 / 首成交 / 支付总额 + 趋势数组） */
export interface DashboardDatasetDura {
  /** 首成交用户数 */
  first_deal_users: number
  /** 切割粒度：day / week / month */
  granularity: string
  /** 支付总额（元） */
  paid_amount: number
  /** 支付金额趋势 */
  paid_trend: DashboardTrendPoint[]
  /** 注册用户趋势 */
  registered_trend: DashboardTrendPoint[]
}

/** 近期订单（字段与订单列表一致，防御性全部可选） */
export interface DashboardRecentOrder {
  /** 订单 ID（部分返回用 order_id） */
  id?: number
  order_id?: number
  order_no?: string
  institution_name?: string
  institution_id?: number
  contact_name?: string
  member_name?: string
  nickname?: string
  /** 下单会员姓名 / 手机号 */
  user_name?: string
  user_phone?: string
  /** 实付金额：可能为元（字符串）或分（数值），渲染时兼容 */
  paid_amount?: string | number
  created_at?: number
  /** 订单状态：1-待支付 2-待确认 3-生效中 4-已完成 5-已取消 6-已退款 */
  order_status?: number
}

/** 待办统计（key 由后端约定，页面按 label 映射渲染） */
export type DashboardTodos = Record<string, number>

/** 全局指标总览响应 */
export interface DashboardOverviewResult {
  accounts: DashboardAccounts
  dataset_dura: DashboardDatasetDura
  recent_orders: DashboardRecentOrder[]
  todos: DashboardTodos
}

/** 全局指标总览 GET /api/admin/dashboard/overview
 *  swagger：scope（self/all，默认 self）/ institution_id / start_ts / end_ts（UTC 秒，选填）/ limit（近期订单条数） */
export function getDashboardOverview(params?: {
  scope?: 'self' | 'all'
  institution_id?: number
  start_ts?: number
  end_ts?: number
  limit?: number
}) {
  return http.get<DashboardOverviewResult>('/admin/dashboard/overview', { ...params })
}

/* ------------------------------------------------------------------ */
/* §11 其余看板接口（服务趋势 / 完成率 / 活动 / 健康预警）                 */
/* ------------------------------------------------------------------ */

/** 服务趋势点（§11.2，按日） */
export interface ServiceTrendPoint {
  /** yyyy-MM-dd */
  date: string
  order_count: number
  work_order_count: number
  service_count: number
}

/** 服务完成率（按机构分组，§11.3 同型） */
export interface InstitutionRateItem {
  institution_id: number
  warn_total?: number
  warn_resolved?: number
  resolve_rate?: number
  completion_rate?: number
}

/** 服务趋势 GET /api/admin/dashboard/service-trend
 *  swagger：start / end（UTC 秒）/ granularity（day/week/month，默认 day） */
export function getServiceTrend(params: {
  start: number
  end: number
  granularity?: 'day' | 'week' | 'month'
}) {
  return http.get<{ list: ServiceTrendPoint[]; total: number }>('/admin/dashboard/service-trend', {
    ...params,
  })
}

/** 服务完成率 GET /api/admin/dashboard/service-completion（按机构分组；swagger：institution_id 选填） */
export function getServiceCompletion(params?: { institution_id?: number }) {
  return http.get<{ list: InstitutionRateItem[]; total: number }>('/admin/dashboard/service-completion', {
    ...params,
  })
}

/** 活动数据 GET /api/admin/dashboard/activity（活动报名/签到统计；swagger：start_ts / end_ts 选填） */
export function getActivityStats(params?: { start_ts?: number; end_ts?: number }) {
  return http.get<{ list: Array<Record<string, unknown>>; total: number }>('/admin/dashboard/activity', {
    ...params,
  })
}

/** 健康/预警 GET /api/admin/dashboard/health（评估/预警/方案/效果评估；swagger：start_ts / end_ts 选填） */
export function getHealthStats(params?: { start_ts?: number; end_ts?: number }) {
  return http.get<{ list: InstitutionRateItem[]; total: number }>('/admin/dashboard/health', {
    ...params,
  })
}
