/**
 * 内容管理与轮播（运营后台端-API设计 §10）
 * - §10.1 内容管理 cms_content（cms:manage）
 * - §10.2 轮播/焦点图 banners（cms:banner-manage）
 * - §10.3 内容分类 cms_categories（cms:manage）
 */
import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult, BatchResult, CommonStatus } from '@/types/api'

/* ------------------------------------------------------------------ */
/* §10.1 内容管理（权限 cms:manage）                                     */
/* ------------------------------------------------------------------ */

/** 内容类型：1-图文 2-视频 */
export type CmsContentType = 1 | 2
/** 发布状态：1-草稿 2-已发布 3-已下线 */
export type CmsPublishStatus = 1 | 2 | 3

/** 内容 DTO（映射 cms_content；操作人由服务端会话注入，前端不传） */
export interface CmsContentDTO {
  id: number
  category_id: number
  title: string
  summary: string
  content_type: CmsContentType
  cover_url: string
  /** content_type=2 时使用 */
  video_url?: string
  /** 正文 Markdown */
  body_md: string
  tags: string[]
  author_name: string
  source: string
  is_top: 0 | 1
  /** 投放端：all / user-app / staff-app / admin（多端逗号分隔） */
  platform: string
  publish_status: CmsPublishStatus
  /** 计划发布时间 UTC 秒，NULL=立即发布 */
  publish_at: number | null
}

/** 内容新增 / 编辑入参 */
export type CmsContentSaveBody = Omit<CmsContentDTO, 'id' | 'publish_status'>

/** 内容列表 GET /api/admin/cms/contents（按分类/状态/关键字，含草稿） */
export function getCmsContents(
  params?: ApiPageParams & { category_id?: number; publish_status?: CmsPublishStatus },
) {
  return http.get<ApiPageResult<CmsContentDTO>>('/admin/cms/contents', { ...params })
}

/** 内容详情 GET /api/admin/cms/contents/:id */
export function getCmsContent(id: number) {
  return http.get<CmsContentDTO>(`/admin/cms/contents/${id}`)
}

/** 新增内容 POST /api/admin/cms/contents */
export function createCmsContent(data: CmsContentSaveBody) {
  return http.post<null>('/admin/cms/contents', data)
}

/** 编辑内容 PUT /api/admin/cms/contents/:id */
export function updateCmsContent(id: number, data: Partial<CmsContentSaveBody>) {
  return http.put<null>(`/admin/cms/contents/${id}`, data)
}

/** 内容审核 POST /api/admin/cms/contents/:id/review */
export function reviewCmsContent(id: number, approved: boolean, note?: string) {
  return http.post<null>(`/admin/cms/contents/${id}/review`, { approved, note })
}

/** 批量审核 POST /api/admin/cms/contents/batch-review */
export function batchReviewCmsContents(ids: number[], approved: boolean, note?: string) {
  return http.post<BatchResult>('/admin/cms/contents/batch-review', { ids, approved, note })
}

/** 发布 POST /api/admin/cms/contents/:id/publish */
export function publishCmsContent(id: number) {
  return http.post<null>(`/admin/cms/contents/${id}/publish`)
}

/** 下架 POST /api/admin/cms/contents/:id/offline */
export function offlineCmsContent(id: number) {
  return http.post<null>(`/admin/cms/contents/${id}/offline`)
}

/** 批量发布/下架 POST /api/admin/cms/contents/batch-status */
export function batchUpdateCmsContentStatus(ids: number[], action: 'publish' | 'offline') {
  return http.post<BatchResult>('/admin/cms/contents/batch-status', { ids, action })
}

/** 定时上下架 POST /api/admin/cms/contents/:id/schedule */
export function scheduleCmsContent(id: number, data: { publish_at?: number; offline_at?: number }) {
  return http.post<null>(`/admin/cms/contents/${id}/schedule`, data)
}

/** 批量删除 DELETE /api/admin/cms/contents/batch（软删） */
export function batchDeleteCmsContents(ids: number[]) {
  return http.delete<null>('/admin/cms/contents/batch', { ids })
}

/** 删除内容 DELETE /api/admin/cms/contents/:id（软删） */
export function deleteCmsContent(id: number) {
  return http.delete<null>(`/admin/cms/contents/${id}`)
}

/* ------------------------------------------------------------------ */
/* §10.3 内容分类 cms_categories（权限 cms:manage）                      */
/* ------------------------------------------------------------------ */

/** 内容分类 DTO（两级分类树） */
export interface CmsCategoryDTO {
  id: number
  parent_id: number
  name: string
  /** 唯一编码 */
  code: string
  /** 0-不限 1-图文 2-视频 */
  content_type: 0 | 1 | 2
  sort: number
  status: CommonStatus
  children?: CmsCategoryDTO[]
}

/** 分类树 GET /api/admin/cms/categories */
export function getCmsCategories() {
  return http.get<CmsCategoryDTO[]>('/admin/cms/categories')
}

/** 新增分类 POST /api/admin/cms/categories */
export function createCmsCategory(data: Omit<CmsCategoryDTO, 'id' | 'children'>) {
  return http.post<null>('/admin/cms/categories', data)
}

/** 编辑分类 PUT /api/admin/cms/categories/:id */
export function updateCmsCategory(id: number, data: Partial<Omit<CmsCategoryDTO, 'id' | 'children'>>) {
  return http.put<null>(`/admin/cms/categories/${id}`, data)
}

/** 启停分类 POST /api/admin/cms/categories/:id/status */
export function updateCmsCategoryStatus(id: number, status: CommonStatus) {
  return http.post<null>(`/admin/cms/categories/${id}/status`, { status })
}

/** 删除分类 DELETE /api/admin/cms/categories/:id（有内容引用不可物理删） */
export function deleteCmsCategory(id: number) {
  return http.delete<null>(`/admin/cms/categories/${id}`)
}

/* ------------------------------------------------------------------ */
/* §10.2 轮播/焦点图 banners（权限 cms:banner-manage）                   */
/* ------------------------------------------------------------------ */

/** 投放端：1-用户小程序 2-医护小程序 3-管理后台 */
export type BannerPlatform = 1 | 2 | 3
/** 跳转类型：1-无跳转 2-站内内容 3-活动详情 4-服务详情 5-外链 */
export type BannerLinkType = 1 | 2 | 3 | 4 | 5

/** 轮播 DTO（出参含跳转目标平铺片段 link_id/link_title） */
export interface BannerDTO {
  id: number
  title: string
  image_url: string
  platform: BannerPlatform
  /** 投放位置：home_top / activity_ad 等 */
  position: string
  link_type: BannerLinkType
  /** 跳转目标（内容ID/活动ID/路由/URL），link_type=1 可空 */
  link_value?: string
  link_id?: number
  link_title?: string
  sort: number
  /** 生效起始 UTC 秒，NULL=立即 */
  start_at: number | null
  /** 生效结束 UTC 秒，NULL=长期 */
  end_at: number | null
  status: CommonStatus
}

/** 轮播新增 / 编辑入参 */
export type BannerSaveBody = Omit<BannerDTO, 'id' | 'link_id' | 'link_title'>

/** 轮播列表 GET /api/admin/banners（按平台/位置/状态/时间，含分页） */
export function getBanners(
  params?: ApiPageParams & { platform?: BannerPlatform; position?: string; status?: CommonStatus },
) {
  return http.get<ApiPageResult<BannerDTO>>('/admin/banners', { ...params })
}

/** 轮播新增 POST /api/admin/banners */
export function createBanner(data: BannerSaveBody) {
  return http.post<null>('/admin/banners', data)
}

/** 轮播编辑 PUT /api/admin/banners/:id */
export function updateBanner(id: number, data: Partial<BannerSaveBody>) {
  return http.put<null>(`/admin/banners/${id}`, data)
}

/** 启停 POST /api/admin/banners/:id/status */
export function updateBannerStatus(id: number, status: CommonStatus) {
  return http.post<null>(`/admin/banners/${id}/status`, { status })
}

/** 批量启停 POST /api/admin/banners/batch-status */
export function batchUpdateBannerStatus(ids: number[], status: CommonStatus) {
  return http.post<BatchResult>('/admin/banners/batch-status', { ids, status })
}

/** 排序 POST /api/admin/banners/:id/sort */
export function sortBanner(id: number, sort: number) {
  return http.post<null>(`/admin/banners/${id}/sort`, { sort })
}

/** 批量排序 PUT /api/admin/banners/sort（按数组顺序整体重排） */
export function batchSortBanners(data: { position: string; platform: BannerPlatform; ordered_ids: number[] }) {
  return http.put<null>('/admin/banners/sort', data)
}

/** 删除轮播 DELETE /api/admin/banners/:id（软删） */
export function deleteBanner(id: number) {
  return http.delete<null>(`/admin/banners/${id}`)
}
