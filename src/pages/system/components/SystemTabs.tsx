/**
 * 系统设置 - 页内导航 Tab（平台账号 / 角色权限 / 协议与授权 / 消息模板 / 帮助与电话 / 操作日志）
 * 与侧边栏二级菜单一致，点击跳转对应路由
 */
import { useLocation, useNavigate } from 'react-router-dom'
import './system-tabs.less'

const tabs = [
  { key: '/system', label: '平台账号', exact: true },
  { key: '/system/role', label: '角色权限' },
  { key: '/system/agreement', label: '协议与授权' },
  { key: '/system/message', label: '消息模板' },
  { key: '/system/help', label: '帮助与电话' },
  { key: '/system/log', label: '操作日志' },
]

export default function SystemTabs() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (key: string, exact?: boolean) =>
    exact ? location.pathname === key : location.pathname.startsWith(key)

  return (
    <div className="system-tabs">
      {tabs.map((tab) => (
        <button
          type="button"
          key={tab.key}
          className={isActive(tab.key, tab.exact) ? 'is-active' : ''}
          onClick={() => navigate(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
