/**
 * 顶部导航栏：折叠按钮 + 面包屑 + 用户信息
 */
import { useMemo } from 'react'
import { Breadcrumb, Dropdown, Layout, Avatar, Space, Button } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { findBreadcrumb } from '@/router/menu'
import { useAppStore } from '@/store/modules/app'
import { useUserStore } from '@/store/modules/user'

export default function HeaderBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const collapsed = useAppStore((state) => state.collapsed)
  const toggleCollapsed = useAppStore((state) => state.toggleCollapsed)
  const userInfo = useUserStore((state) => state.userInfo)
  const logout = useUserStore((state) => state.logout)

  const breadcrumbItems = useMemo(() => findBreadcrumb(location.pathname), [location.pathname])

  /** 今日日期：2026 年 8 月 14 日 星期五 */
  const todayText = useMemo(() => {
    const now = new Date()
    const week = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()]
    return `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 星期${week}`
  }, [])

  return (
    <Layout.Header className="layout-header">
      <div className="layout-header__left">
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={toggleCollapsed}
          className="layout-header__trigger"
        />
        <Breadcrumb items={breadcrumbItems} />
      </div>
      <div className="layout-header__right">
        <span className="layout-header__date">{todayText}</span>
        <Dropdown
          menu={{
            items: [
              {
                key: 'profile',
                icon: <UserOutlined />,
                label: '个人中心',
              },
              { type: 'divider' },
              {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: '退出登录',
                onClick: () => {
                  logout()
                  navigate('/login', { replace: true })
                },
              },
            ],
          }}
        >
          <Space className="layout-header__user" size={8}>
            <Avatar size={28} icon={<UserOutlined />} style={{ background: '#27866B' }} />
            <span>{userInfo?.nickname || '管理员'}</span>
          </Space>
        </Dropdown>
      </div>
    </Layout.Header>
  )
}
