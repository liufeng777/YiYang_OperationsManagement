/**
 * 自定义 Hooks 统一出口
 */
import { useCallback, useEffect, useState } from 'react'
import { App } from 'antd'
import { uploadApi } from '@/api'

/** 同步页面标题 */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} - ${import.meta.env.VITE_APP_TITLE}` : import.meta.env.VITE_APP_TITLE
  }, [title])
}

/**
 * 图片上传（本地预览 + 后台上传）
 * 用法：`const { uploading, upload } = useImageUpload()`
 * - upload(file, onLocalPreview) 先回调本地预览地址（立即出图），再上传后端
 * - 上传成功回调 onUploaded(serverUrl)，供业务保存「可直接提交的地址」
 * - 上传失败提示错误并回调 onError（调用方可回退本地预览）
 * 说明：后端上传接口返回 url/key/size/mime_type，业务字段直接存 url
 */
export function useImageUpload() {
  const { message } = App.useApp()
  const [uploading, setUploading] = useState(false)

  const upload = useCallback(
    async (
      file: File,
      handlers?: {
        /** 本地预览地址回调（上传前立即触发） */
        onLocalPreview?: (localUrl: string) => void
        /** 上传成功回调，参数为后端文件地址 */
        onUploaded?: (url: string, result: { url: string; key: string }) => void
        /** 上传失败回调（可在此回退本地预览） */
        onError?: (error: unknown) => void
      },
    ) => {
      if (!file.type.startsWith('image/')) {
        message.error('请上传图片文件')
        return null
      }
      const localUrl = URL.createObjectURL(file)
      handlers?.onLocalPreview?.(localUrl)
      setUploading(true)
      try {
        const result = await uploadApi.uploadFile(file)
        handlers?.onUploaded?.(result.url, { url: result.url, key: result.key })
        return result.url
      } catch (error) {
        // 上传失败：提示由 request 拦截器统一处理，这里仅回调供页面回退
        handlers?.onError?.(error)
        return null
      } finally {
        setUploading(false)
        // 本地预览已由页面替换为服务器地址，避免内存泄漏
        URL.revokeObjectURL(localUrl)
      }
    },
    [message],
  )

  return { uploading, upload }
}
