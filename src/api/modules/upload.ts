/**
 * 文件上传（共通-API设计 §7 上传契约）
 * 先上传得到 URL，再随业务接口提交；幂等可携带 client_trace_id
 */
import { http } from '@/utils/request'
import type { UploadResult } from '@/types/api'

/** 文件上传 POST /upload（multipart/form-data，字段 file） */
export function uploadFile(file: File, clientTraceId?: string) {
  const formData = new FormData()
  formData.append('file', file)
  if (clientTraceId) {
    formData.append('client_trace_id', clientTraceId)
  }
  return http.post<UploadResult>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** 删除文件 DELETE /upload/:key（软删除 OSS 对象，可选） */
export function deleteFile(key: string) {
  return http.delete<null>(`/upload/${encodeURIComponent(key)}`)
}
