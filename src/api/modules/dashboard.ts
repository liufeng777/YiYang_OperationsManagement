/**
 * 数据看板（运营后台端-API设计 §11）
 * 权限 dashboard:view；聚合接口出参不受分页包装约束（共通 §1.4）
 * 说明：上半部分为运营首页展示用类型（mock），下半部分对齐文档 §11 看板接口。
 */
import { http } from '@/utils/request'

/* ------------------------------------------------------------------ */
/* 运营首页展示类型（mock，接后端后逐步切换到下方看板接口）                 */
/* ------------------------------------------------------------------ */

/** 经营指标总览（运营首页指标卡） */
export interface OverviewData {
  /** 今日订单数 */
  todayOrderCount: number
  /** 今日订单数较昨日增长率（%） */
  todayOrderRate: number
  /** 今日活动报名数 */
  activitySignupCount: number
  /** 今日活动报名较昨日增长率（%） */
  activitySignupRate: number
  /** 待审核退款笔数 */
  pendingRefundCount: number
  /** 待办事项总数 */
  pendingTodoCount: number
  /** 合作机构数 */
  totalInstitution: number
  /** 资料待完善机构数 */
  pendingInstitutionCount: number
}

/** 近期订单 */
export interface RecentOrder {
  /** 订单编号 */
  orderNo: string
  /** 业务类型：上门服务 / 活动报名 / 适老商品 / 老龄旅游 */
  bizType: string
  /** 服务机构 */
  institution: string
  /** 下单用户 */
  customer: string
  /** 实付金额（元） */
  amount: number
  /** 下单时间 */
  orderTime: string
  /** 订单状态：pending=待服务 confirmed=已确认 refunding=退款审核 finished=已完成 */
  status: 'pending' | 'confirmed' | 'refunding' | 'finished'
}

/** 待办提醒项 */
export interface DashboardTodo {
  /** 唯一标识：refund / institution / content */
  key: string
  /** 待办标题 */
  title: string
  /** 辅助描述 */
  desc?: string
  /** 待办数量（无数量时不展示） */
  count?: number
  /** 数量单位：笔 / 家 / 条 */
  unit?: string
}

/** 单日订单趋势点 */
export interface TrendPoint {
  /** 日期标签：如 7/31、今日 */
  label: string
  /** 当日订单量 */
  value: number
}

/** 近 7 日订单趋势统计 */
export interface TrendStat {
  /** 累计订单数 */
  totalOrders: number
  /** 较上周增长率（%） */
  totalRate: number
  /** 逐日订单量 */
  daily: TrendPoint[]
}

/* ------------------------------------------------------------------ */
/* §11 数据大屏看板（权限 dashboard:view）                               */
/* ------------------------------------------------------------------ */

/** 全局指标总览（§11.1） */
export interface DashboardOverview {
  /** 建档人数 */
  member_registered: number
  /** 已实名 */
  member_verified: number
  /** 活动报名数 */
  activity_registered: number
  /** 服务订单数 */
  service_order_count: number
  /** 服务预约数 */
  service_appointment_count: number
  /** 健康评估次数 */
  assessment_count: number
  /** 回访次数（含随访） */
  followup_count: number
  warn_pending: number
  warn_processing: number
  /** 服务完成率 */
  service_completion_rate: number
  /** AI 健康方案生成数 */
  ai_plan_generated: number
  /** AI 方案确认数 */
  ai_plan_confirmed: number
  /** 预警处置数（闭环） */
  warn_resolved: number
  /** 效果评估次数 */
  effect_assessment_count: number
}

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

/** 全局指标总览 GET /api/admin/dashboard/overview */
export function getDashboardOverview() {
  return http.get<DashboardOverview>('/admin/dashboard/overview')
}

/** 服务趋势 GET /api/admin/dashboard/service-trend?start&end&granularity */
export function getServiceTrend(params: {
  start: string
  end: string
  granularity?: 'day' | 'week' | 'month'
}) {
  return http.get<{ list: ServiceTrendPoint[]; total: number }>('/admin/dashboard/service-trend', {
    ...params,
  })
}

/** 服务完成率 GET /api/admin/dashboard/service-completion（按机构分组） */
export function getServiceCompletion() {
  return http.get<{ list: InstitutionRateItem[]; total: number }>('/admin/dashboard/service-completion')
}

/** 活动数据 GET /api/admin/dashboard/activity（活动报名/签到统计） */
export function getActivityStats() {
  return http.get<{ list: Array<Record<string, unknown>>; total: number }>('/admin/dashboard/activity')
}

/** 健康/预警 GET /api/admin/dashboard/health（评估/预警/方案/效果评估） */
export function getHealthStats() {
  return http.get<{ list: InstitutionRateItem[]; total: number }>('/admin/dashboard/health')
}
