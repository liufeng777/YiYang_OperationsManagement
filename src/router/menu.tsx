/**
 * 菜单构建工具
 * 将 routes 配置转换为 antd Menu items，并辅助面包屑等查找
 */
import type { MenuProps } from 'antd'
import { routes } from './routes'

export type MenuItems = NonNullable<MenuProps['items']>

/** 拼接子路由完整路径 */
function joinPath(parent: string, child: string) {
  if (!child) return parent
  return `${parent}/${child}`.replace(/\/+/g, '/')
}

/**
 * 构建侧边栏菜单项
 * - 仅含默认页的一级导航：渲染为一级菜单项
 * - 含多个二级导航：渲染为子菜单（二级导航预留设计）
 */
export function buildMenuItems(): MenuItems {
  return routes.map((route) => {
    const { meta, children = [] } = route
    const visibleChildren = children.filter((c) => !c.meta.hideInMenu)

    // 只有一个默认页：作为一级菜单项展示
    if (visibleChildren.length === 1 && visibleChildren[0].path === '') {
      return {
        key: route.path,
        icon: meta.icon,
        label: meta.title,
      }
    }

    // 多个二级导航：渲染子菜单
    if (visibleChildren.length > 0) {
      return {
        key: route.path,
        icon: meta.icon,
        label: meta.title,
        children: visibleChildren.map((child) => ({
          key: joinPath(route.path, child.path),
          label: child.meta.title,
        })),
      }
    }

    // 无子级
    return {
      key: route.path,
      icon: meta.icon,
      label: meta.title,
    }
  })
}

/** 根据当前路径查找菜单中的父级 key（用于展开子菜单） */
export function findOpenKeys(pathname: string): string[] {
  const keys: string[] = []
  for (const route of routes) {
    if (pathname.startsWith(route.path) && route.children?.some((c) => !c.meta.hideInMenu)) {
      keys.push(route.path)
      break
    }
  }
  return keys
}

/** 面包屑项：title 展示文案，path 用于点击跳转 */
export interface BreadcrumbItem {
  title: string
  path: string
}

interface PagePattern {
  /** 完整路径模式，如 /activity/detail/:id/edit */
  pattern: string
  title: string
}

/** 展开某一级路由下的所有页面路径模式（默认页 '' 不重复占位） */
function expandPages(route: (typeof routes)[number], base: string): PagePattern[] {
  const list: PagePattern[] = []
  for (const child of route.children ?? []) {
    if (!child.path) continue
    const pattern = joinPath(base, child.path)
    list.push({ pattern, title: child.meta.title })
    list.push(...expandPages(child, pattern))
  }
  return list
}

/** 路径模式与给定路径段精确匹配（':xxx' 为参数段，段数需一致） */
function matchPattern(pattern: string, segments: string[]): boolean {
  const patternSegs = pattern.split('/').filter(Boolean)
  if (patternSegs.length !== segments.length) return false
  return patternSegs.every((seg, index) => seg.startsWith(':') || seg === segments[index])
}

/**
 * 根据路径构建面包屑（支持多级嵌套与路径参数）
 * - 一级导航默认页只显示一级标题（如 活动管理）
 * - 详情 / 编辑等隐藏页逐级补全（如 活动管理 / 活动详情 / 编辑活动）
 * - 每一项携带可跳转路径，末级为当前页
 */
export function findBreadcrumb(pathname: string): BreadcrumbItem[] {
  for (const route of routes) {
    if (!(pathname === route.path || pathname.startsWith(`${route.path}/`))) continue

    // 一级导航落点：有默认页（''）时用一级路径；无默认页（如系统设置）落到第一个可见二级导航，
    // 避免面包屑点击一级项时跳到无匹配路由的空白页
    const defaultChild = route.children?.find((c) => !c.path && !c.meta.hideInMenu)
    const firstVisibleChild = route.children?.find((c) => !c.meta.hideInMenu)
    const landingPath = defaultChild
      ? route.path
      : firstVisibleChild
        ? joinPath(route.path, firstVisibleChild.path)
        : route.path

    const crumbs: BreadcrumbItem[] = [{ title: route.meta.title, path: landingPath }]
    const pages = expandPages(route, route.path)
    const segments = pathname.split('/').filter(Boolean)

    // 逐级累积前缀，前缀恰好完整匹配某个页面路径模式时补一级面包屑
    for (let depth = 2; depth <= segments.length; depth += 1) {
      const prefixSegs = segments.slice(0, depth)
      const hit = pages.find((page) => matchPattern(page.pattern, prefixSegs))
      if (hit) {
        crumbs.push({ title: hit.title, path: `/${prefixSegs.join('/')}` })
      }
    }
    return crumbs
  }
  return []
}

/** 根据路径查找页面标题（用于 document.title），取最深匹配页面 */
export function findPageTitle(pathname: string): string {
  for (const route of routes) {
    if (!(pathname === route.path || pathname.startsWith(`${route.path}/`))) continue
    const segments = pathname.split('/').filter(Boolean)
    const hit = expandPages(route, route.path).find((page) => matchPattern(page.pattern, segments))
    if (hit) return `${hit.title} - ${route.meta.title}`
    const defaultChild = route.children?.find((c) => !c.path)
    if (defaultChild && pathname === route.path && defaultChild.meta.title !== route.meta.title) {
      return `${defaultChild.meta.title} - ${route.meta.title}`
    }
    return route.meta.title
  }
  return ''
}
