import { http } from '@/utils/request'

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
  /** 唯一标识 */
  key: string
  /** 待办标题 */
  title: string
  /** 待办数量（无数量时不展示） */
  count?: number
}

/** 近 7 日订单趋势统计 */
export interface TrendStat {
  /** 累计订单数 */
  totalOrders: number
  /** 较上周增长率（%） */
  totalRate: number
}

/** 获取运营首页总览数据 */
export function getOverview() {
  return http.get<OverviewData>('/dashboard/overview')
}

/** 获取近期订单 */
export function getRecentOrders() {
  return http.get<RecentOrder[]>('/dashboard/recent-orders')
}

/** 获取近 7 日订单趋势统计 */
export function getTrendStat() {
  return http.get<TrendStat>('/dashboard/order-trend')
}
