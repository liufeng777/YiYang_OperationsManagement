/**
 * 路由懒加载恢复：发布新版本后，旧页面可能仍引用已下线的哈希 chunk。
 * 首次遇到动态模块加载失败时自动刷新当前路由；刷新后仍失败则展示可见错误页，避免白屏。
 */
import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'
import { Button, Result } from 'antd'

type LazyModule = { default: ComponentType }
type LazyFactory = () => Promise<LazyModule>

const RELOAD_KEY_PREFIX = 'yiyang:route-chunk-reload:'

const getReloadKey = () => `${RELOAD_KEY_PREFIX}${window.location.pathname}`

const hasReloaded = () => {
  try {
    return window.sessionStorage.getItem(getReloadKey()) === '1'
  } catch {
    return false
  }
}

const markReloaded = () => {
  try {
    window.sessionStorage.setItem(getReloadKey(), '1')
  } catch {
    /* 存储不可用时仍尝试刷新 */
  }
}

const clearReloaded = () => {
  try {
    window.sessionStorage.removeItem(getReloadKey())
  } catch {
    /* 忽略存储不可用 */
  }
}

const isDynamicImportError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(message)
}

function ChunkLoadFallback() {
  return (
    <Result
      status="warning"
      title="页面资源加载失败"
      subTitle="应用可能已发布新版本，或网络连接中断。请刷新页面后重试。"
      extra={
        <Button type="primary" onClick={() => window.location.reload()}>
          刷新页面
        </Button>
      }
    />
  )
}

export default function lazyWithReload(factory: LazyFactory): LazyExoticComponent<ComponentType> {
  return lazy(async () => {
    try {
      const module = await factory()
      clearReloaded()
      return module
    } catch (error) {
      if (!isDynamicImportError(error)) throw error

      if (!hasReloaded()) {
        markReloaded()
        window.location.reload()
        // 保持加载态，等待浏览器完成刷新，避免旧页面先渲染错误。
        return new Promise<LazyModule>(() => {})
      }

      return { default: ChunkLoadFallback }
    }
  })
}
