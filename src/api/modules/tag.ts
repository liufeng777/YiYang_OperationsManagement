import { http } from '@/utils/request'
import type { ApiPageParams, ApiPageResult } from '@/types/api'

export interface tagItem {
  id: number
  institution_id: number
  tag_name: string
  tag_type: number
  tag_color: string
}

/** 标签字典列表 GET /admin/tag-dicts（swagger：page / page_size / institution_id / tag_type）
 *  默认拉取大页用于下拉选择 */
export function getTags(params?: ApiPageParams & { institution_id?: number; tag_type?: number }) {
  return http.get<ApiPageResult<tagItem>>('/admin/tag-dicts', { page: 1, page_size: 1000, ...params })
}
