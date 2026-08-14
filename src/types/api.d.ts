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
