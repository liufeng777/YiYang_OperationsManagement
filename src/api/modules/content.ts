import { http } from '@/utils/request'
import type { PageParams, PageResult } from '@/types/api'

/** 首页轮播图 */
export interface BannerItem {
  id: string
  title: string
  /** 分类标签，如 康养活动 */
  tag: string
  imageUrl: string
  /** 跳转目标展示，如 活动详情 */
  linkTarget: string
  sort: number
  enabled: boolean
}

/** 首页快捷入口（固定入口，仅调整显示与排序） */
export interface HomeEntryItem {
  id: string
  icon: string
  name: string
  visible: boolean
  sort: number
}

/** 首页推荐内容（已上架服务 / 已发布活动） */
export interface HomeRecommendItem {
  id: string
  icon: string
  name: string
  /** 备注，如 6 家机构可预约 */
  note: string
  /** 价格展示，如 ¥168 / 次 */
  price: string
  type: 'service' | 'activity'
  sort: number
}

/** 科普文章 */
export interface ArticleItem {
  id: string
  title: string
  category: string
  source: string
  author: string
  updatedAt: string
  /** 是否首页推荐 */
  recommended: boolean
  status: 'published' | 'draft' | 'offline'
}

/** 专业人员 */
export interface StaffItem {
  id: string
  name: string
  institutionName: string
  /** 职业 / 职称，如 主任医师 */
  title: string
  /** 擅长领域，如 心脑血管、慢病管理 */
  specialty: string
  /** 同步时间展示，如 08-10 15:30 */
  syncedAt: string
  /** 执业资质是否已同步 */
  qualified: boolean
  /** 患者端是否展示 */
  visible: boolean
  /** 是否首页推荐 */
  recommended: boolean
  /** 推荐顺序 */
  recommendSort?: number
  /** 患者端展示简介 */
  intro?: string
}

/** 获取首页配置 */
export function getHomeConfig() {
  return http.get<{
    banners: BannerItem[]
    entries: HomeEntryItem[]
    recommends: HomeRecommendItem[]
  }>('/content/home/config')
}

/** 发布首页配置 */
export function publishHomeConfig(data: Record<string, unknown>) {
  return http.post<null>('/content/home/publish', data)
}

/** 科普内容分页列表 */
export function getArticleList(params: PageParams & { keyword?: string; status?: string }) {
  return http.get<PageResult<ArticleItem>>('/content/article/list', { ...params })
}

/** 保存科普内容 */
export function saveArticle(data: Partial<ArticleItem>) {
  return data.id
    ? http.put<null>('/content/article/update', data)
    : http.post<null>('/content/article/create', data)
}

/** 科普内容发布 / 下架 */
export function toggleArticle(ids: string[], publish: boolean) {
  return http.post<null>('/content/article/toggle', { ids, publish })
}

/** 专业人员列表 */
export function getStaffList(params: PageParams & { keyword?: string }) {
  return http.get<PageResult<StaffItem>>('/content/staff/list', { ...params })
}

/** 同步工作台人员资料 */
export function syncStaff() {
  return http.post<null>('/content/staff/sync')
}

/** 保存人员展示设置 */
export function saveStaffDisplay(data: Partial<StaffItem>) {
  return http.post<null>('/content/staff/display', data)
}
