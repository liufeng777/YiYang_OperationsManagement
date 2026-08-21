/**
 * 基础布局：侧边栏 + 顶部导航 + 内容区
 */
import { useEffect } from 'react'
import { Layout } from 'antd'
import { Outlet, useLocation } from 'react-router-dom'
import SiderMenu from './SiderMenu'
import HeaderBar from './HeaderBar'
import { useAppStore } from '@/store/modules/app'
import { useNavigationStore } from '@/store/modules/navigation'
import { routes } from '@/router/routes'
import './layout.less'

const { Sider, Content } = Layout

/** 一级导航路径集合（用于识别当前路径所属导航分区） */
const sectionPaths = routes.map((route) => route.path)

export default function BasicLayout() {
  const collapsed = useAppStore((state) => state.collapsed)
  const remember = useNavigationStore((state) => state.remember)
  const location = useLocation()

  // 记录各一级导航下最近访问的页面（含查询参数），供侧边栏点击时恢复
  useEffect(() => {
    const section = sectionPaths.find(
      (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
    )
    if (section) {
      remember(section, location.pathname + location.search)
    }
  }, [location, remember])

  return (
    <Layout className="basic-layout">
      <Sider
        width={240}
        collapsedWidth={64}
        collapsed={collapsed}
        collapsible
        trigger={null}
        className="basic-layout__sider"
      >
        <div className="basic-layout__logo text-title-card">幸福颐养</div>
        <SiderMenu />
      </Sider>
      <Layout className="basic-layout__main">
        <HeaderBar />
        <Content className="basic-layout__content">
          {/* 路由切换过渡：按 pathname 重挂载，播放淡入+上移动画（见 layout.less） */}
          <div className="page-transition" key={location.pathname}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
