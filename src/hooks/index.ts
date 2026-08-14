/**
 * 自定义 Hooks 统一出口
 */
import { useEffect } from 'react'

/** 同步页面标题 */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} - ${import.meta.env.VITE_APP_TITLE}` : import.meta.env.VITE_APP_TITLE
  }, [title])
}
