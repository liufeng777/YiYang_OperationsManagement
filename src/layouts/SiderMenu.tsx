/**
 * 侧边栏菜单
 * 菜单数据由 @/router/menu 根据路由配置自动生成
 */
import { useMemo } from 'react'
import { Menu } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import { buildMenuItems, findOpenKeys } from '@/router/menu'
import { useAppStore } from '@/store/modules/app'

export default function SiderMenu() {
  const navigate = useNavigate()
  const location = useLocation()
  const collapsed = useAppStore((state) => state.collapsed)

  const items = useMemo(() => buildMenuItems(), [])
  const selectedKeys = useMemo(() => {
    // 二级菜单取完整路径作为 key，一级菜单取一级路径
    const matched = items
      .flatMap((item: any) =>
        item?.children ? item.children.map((c: any) => c.key) : [item?.key],
      )
      .filter((key: string) => location.pathname.startsWith(key))
      // 父级默认页 key（如 /institution）是子级 key（如 /institution/audit）的前缀，
      // 会同时命中，取最长（最精确）的 key 作为选中项
      .sort((a: string, b: string) => b.length - a.length)
    return matched.length ? [matched[0]] : [location.pathname]
  }, [items, location.pathname])
  const openKeys = useMemo(() => findOpenKeys(location.pathname), [location.pathname])

  return (
    <Menu
      mode="inline"
      inlineCollapsed={collapsed}
      items={items}
      selectedKeys={selectedKeys}
      defaultOpenKeys={openKeys}
      onClick={({ key }) => navigate(key)}
      style={{ borderInlineEnd: 'none' }}
    />
  )
}
