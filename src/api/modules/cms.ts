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

/** 发布状态：1-草稿 2-已发布 3-已下线 */
export type CmsPublishStatus = 1 | 2 | 3

/** 内容 DTO（swagger admin.ReqCreateCmsContent 出参同构；操作人由服务端会话注入，前端不传） */
export interface CmsContentDTO {
  id: number
  category_id: number
  title: string
  /** 摘要 */
  summary: string
  cover_url: string
  /** 正文（JSON） */
  body: string
  tags: string[]
  author_name: string
  source: string
  /** 投放端：all / user-app / staff-app / admin */
  platform: string
  publish_status: CmsPublishStatus
  /** 计划发布时间 UTC 秒，NULL=立即发布 */
  publish_at: number | null
  /** 排序（升序，0-置顶） */
  sort: number
}

/** 内容新增 / 编辑入参（swagger admin.ReqCreateCmsContent：仅 title 必填） */
export type CmsContentSaveBody = Partial<Omit<CmsContentDTO, 'id'>> & { title: string }

/** 内容列表 GET /api/admin/cms/contents（swagger：page / page_size / category_id / status / keyword） */
export function getCmsContents(
  params?: ApiPageParams & { category_id?: number; status?: CmsPublishStatus; keyword?: string },
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
export function updateCmsContent(id: number, data: CmsContentSaveBody) {
  return http.put<null>(`/admin/cms/contents/${id}`, data)
}

/** 发布 POST /api/admin/cms/contents/:id/publish（swagger：remark 为 query 选填） */
export function publishCmsContent(id: number, remark?: string) {
  return http.post<null>(`/admin/cms/contents/${id}/publish`, undefined, { params: { remark } })
}

/** 下架 POST /api/admin/cms/contents/:id/offline（swagger：remark 为 query 选填） */
export function offlineCmsContent(id: number, remark?: string) {
  return http.post<null>(`/admin/cms/contents/${id}/offline`, undefined, { params: { remark } })
}

/** 批量删除 DELETE /api/admin/cms/contents/batch（swagger：body {ids}，remark 为 query 选填） */
export function batchDeleteCmsContents(ids: number[], remark?: string) {
  return http.delete<null>('/admin/cms/contents/batch', { remark }, { data: { ids } })
}

/** 删除内容 DELETE /api/admin/cms/contents/:id（swagger：remark 为 query 选填） */
export function deleteCmsContent(id: number, remark?: string) {
  return http.delete<null>(`/admin/cms/contents/${id}`, { remark })
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

/** 分类新增 / 编辑入参（swagger admin.ReqCreateCmsCategory：仅 name 必填） */
export interface CmsCategorySaveBody {
  name: string
  /** 分类编码（唯一） */
  code?: string
  /** 1-启用 9-禁用 */
  status?: CommonStatus
}

/** 分类列表 GET /api/admin/cms/categories（swagger：page / page_size / parent_id，0 为顶级） */
export function getCmsCategories(params?: ApiPageParams & { parent_id?: number }) {
  return http.get<ApiPageResult<CmsCategoryDTO>>('/admin/cms/categories', { ...params })
}

/** 新增分类 POST /api/admin/cms/categories */
export function createCmsCategory(data: CmsCategorySaveBody) {
  return http.post<null>('/admin/cms/categories', data)
}

/** 编辑分类 PUT /api/admin/cms/categories/:id */
export function updateCmsCategory(id: number, data: CmsCategorySaveBody) {
  return http.put<null>(`/admin/cms/categories/${id}`, data)
}

/** 启停分类 POST /api/admin/cms/categories/:id/status（swagger：body {status}，remark 为 query 选填） */
export function updateCmsCategoryStatus(id: number, status: CommonStatus, remark?: string) {
  return http.post<null>(`/admin/cms/categories/${id}/status`, { status }, { params: { remark } })
}

/** 删除分类 DELETE /api/admin/cms/categories/:id（swagger：remark 为 query 选填） */
export function deleteCmsCategory(id: number, remark?: string) {
  return http.delete<null>(`/admin/cms/categories/${id}`, { remark })
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

/** 轮播新增 / 编辑入参（swagger admin.ReqCreateBanner：image_url / title 必填） */
export type BannerSaveBody = Omit<BannerDTO, 'id' | 'link_id' | 'link_title'>

/** 轮播列表 GET /api/admin/banners（swagger：page / page_size / status） */
export function getBanners(
  params?: ApiPageParams & { status?: CommonStatus },
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

/** 启停 POST /api/admin/banners/:id/status（swagger：body {status}，remark 为 query 选填） */
export function updateBannerStatus(id: number, status: CommonStatus, remark?: string) {
  return http.post<null>(`/admin/banners/${id}/status`, { status }, { params: { remark } })
}

/** 批量启停 POST /api/admin/banners/batch-status（swagger：body {ids,status}，remark 为 query 选填） */
export function batchUpdateBannerStatus(ids: number[], status: CommonStatus, remark?: string) {
  return http.post<BatchResult>('/admin/banners/batch-status', { ids, status }, { params: { remark } })
}

/** 排序 POST /api/admin/banners/:id/sort（swagger：body {sort}，remark 为 query 选填） */
export function sortBanner(id: number, sort: number, remark?: string) {
  return http.post<null>(`/admin/banners/${id}/sort`, { sort }, { params: { remark } })
}

/** 删除轮播 DELETE /api/admin/banners/:id（swagger：remark 为 query 选填） */
export function deleteBanner(id: number, remark?: string) {
  return http.delete<null>(`/admin/banners/${id}`, { remark })
}
