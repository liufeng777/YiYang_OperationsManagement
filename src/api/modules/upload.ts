/**
 * 文件上传（共通-API设计 §7 上传契约）
 * 先上传得到 URL，再随业务接口提交；幂等可携带 client_trace_id
 * 说明：后端实际上传端点为 /admin/upload（经 vite proxy 前缀映射为 /api/v1/admin/upload），
 *       入参为 multipart/form-data 的 file 字段，返回 { url, key, size, mime_type }
 */
import { http } from '@/utils/request'
import type { UploadResult } from '@/types/api'

/** 文件上传 POST /admin/upload（multipart/form-data，字段 file） */
export function uploadFile(file: File, clientTraceId?: string) {
  const formData = new FormData()
  formData.append('file', file)
  if (clientTraceId) {
    formData.append('client_trace_id', clientTraceId)
  }
  return http.post<UploadResult>('/admin/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** 删除文件 DELETE /admin/upload/:key（软删除 OSS 对象，可选） */
export function deleteFile(key: string) {
  return http.delete<null>(`/admin/upload/${encodeURIComponent(key)}`)
}

/**
 * 上传图片并返回可提交的 URL（页面通用入口）
 * - 非图片文件直接拒绝并抛出，调用方无需重复校验
 * - 返回值为后端文件地址，可直接写入业务的封面/图片字段
 */
export async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请上传图片文件')
  }
  const result = await uploadFile(file)
  return result.url
}
