/**
 * 基础布局：侧边栏 + 顶部导航 + 内容区
 */
import { Layout } from 'antd'
import { Outlet, useLocation } from 'react-router-dom'
import SiderMenu from './SiderMenu'
import HeaderBar from './HeaderBar'
import { useAppStore } from '@/store/modules/app'
import './layout.less'

const { Sider, Content } = Layout

export default function BasicLayout() {
  const collapsed = useAppStore((state) => state.collapsed)
  const location = useLocation()
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
