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

/** 根据路径构建面包屑（一级 -> 二级） */
export function findBreadcrumb(pathname: string): Array<{ title: string }> {
  for (const route of routes) {
    if (!pathname.startsWith(route.path)) continue
    const crumb: Array<{ title: string }> = [{ title: route.meta.title }]
    const child = route.children?.find((c) => pathname === joinPath(route.path, c.path))
    if (child) crumb.push({ title: child.meta.title })
    return crumb
  }
  return []
}

/** 根据路径查找页面标题（用于 document.title） */
export function findPageTitle(pathname: string): string {
  for (const route of routes) {
    if (!pathname.startsWith(route.path)) continue
    const child = route.children?.find((c) => pathname === joinPath(route.path, c.path))
    if (child) return `${child.meta.title} - ${route.meta.title}`
    return route.meta.title
  }
  return ''
}
