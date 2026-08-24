/**
 * 全局通用类型定义
 */

/** 后端统一响应结构（约定：code === 0 表示成功） */
export interface Result<T = unknown> {
  code: number
  message: string
  data: T
}

/** 分页返回结构 */
export interface PageResult<T = unknown> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/** 分页查询参数 */
export interface PageParams {
  page: number
  pageSize: number
  [key: string]: unknown
}

/** 选项项（下拉框通用） */
export interface OptionItem {
  label: string
  value: string | number
  disabled?: boolean
}

/* ------------------------------------------------------------------ */
/* 以下类型对齐《共通-API设计》契约（snake_case，时间为 UTC 秒）          */
/* ------------------------------------------------------------------ */

/** 文档契约：分页查询入参（共通 §2，page_size 最大 100） */
export interface ApiPageParams {
  page?: number
  page_size?: number
  keyword?: string
  [key: string]: unknown
}

/** 文档契约：列表分页响应（共通 §1.2，列表接口唯一契约） */
export interface ApiPageResult<T = unknown> {
  list: T[]
  total: number
  page: number
  page_size: number
}

/** 文档契约：批量操作结果（共通 §8） */
export interface BatchResult {
  success_count: number
  fail_count: number
  fail_list: Array<{ id: number | string; reason: string }>
}

/** 文档契约：文件上传结果（共通 §7） */
export interface UploadResult {
  url: string
  key: string
  size: number
  mime_type: string
}

/** 通用启停状态（共通 §6.15：1-启用/上架 9-下架/删除） */
export type CommonStatus = 1 | 9
