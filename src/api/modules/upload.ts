/**
 * 文件上传（swagger：系统与权限-文件上传）
 * 先上传得到 URL，再随业务接口提交
 * 说明：后端上传端点为 /admin/upload（经 vite proxy 前缀映射为 /api/v1/admin/upload），
 *       入参为 multipart/form-data 的 file 字段，可选 dir 业务子目录（留空默认 uploads/admin），
 *       返回 { url, key, size, mime_type }
 */
import { http } from '@/utils/request'
import type { UploadResult } from '@/types/api'

/** 文件上传 POST /admin/upload（swagger：formData file 必填，dir 选填，如 institution/avatar、service/cover） */
export function uploadFile(file: File, dir?: string) {
  const formData = new FormData()
  formData.append('file', file)
  if (dir) {
    formData.append('dir', dir)
  }
  return http.post<UploadResult>('/admin/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** 批量上传 POST /admin/upload/batch（swagger：formData files 可多个，dir 选填） */
export function uploadFiles(files: File[], dir?: string) {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  if (dir) {
    formData.append('dir', dir)
  }
  return http.post<UploadResult[]>('/admin/upload/batch', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** 删除已上传的文件 DELETE /admin/upload/:key */
export function deleteFile(key: string) {
  return http.delete<null>(`/admin/upload/${encodeURIComponent(key)}`)
}

/**
 * 上传图片并返回可提交的 URL（页面通用入口）
 * - 非图片文件直接拒绝并抛出，调用方无需重复校验
 * - 返回值为后端文件地址，可直接写入业务的封面/图片字段
 */
export async function uploadImage(file: File, dir?: string): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请上传图片文件')
  }
  const result = await uploadFile(file, dir)
  return result.url
}
