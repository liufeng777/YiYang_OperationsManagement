import { http } from '@/utils/request'
import type { ApiPageResult } from '@/types/api'

export interface tagItem {
  id: number
  institution_id: number
  tag_name: string
  tag_type: number
  tag_color: string
}

export function getTags() {
  return http.get<ApiPageResult<tagItem>>('/admin/tag-dicts', { page:1, pageSize: 1000})
}