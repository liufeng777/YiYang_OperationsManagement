/**
 * 系统设置 - 角色管理
 * 视觉对齐设计稿：左侧角色列表 + 右侧权限配置面板
 * 当前为 mock 数据，后端就绪后替换为 systemApi.getRoleList / saveRole
 */
import { useMemo, useState } from 'react'
import { App, Button, Card } from 'antd'
import { CheckOutlined, PlusOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import './role.less'

interface PermissionItem {
  key: string
  label: string
}

interface PermissionGroup {
  key: string
  title: string
  description: string
  items: PermissionItem[]
}

interface RoleRow {
  id: string
  name: string
  userCount: number
  description: string
  builtIn: boolean
  permissions: string[]
}

const permissionGroups: PermissionGroup[] = [
  {
    key: 'institution',
    title: '机构管理',
    description: '同步和维护自营机构资料',
    items: [
      { key: 'institution:view', label: '查看机构' },
      { key: 'institution:sync', label: '同步机构' },
      { key: 'institution:edit', label: '编辑资料' },
    ],
  },
  {
    key: 'service',
    title: '服务项目',
    description: '维护集团服务池与机构服务',
    items: [
      { key: 'service:view', label: '查看服务' },
      { key: 'service:add', label: '添加服务' },
      { key: 'service:toggle', label: '上下架' },
    ],
  },
  {
    key: 'content',
    title: '活动与内容',
    description: '管理活动及患者端首页内容',
    items: [
      { key: 'content:view', label: '查看' },
      { key: 'content:edit', label: '新建编辑' },
      { key: 'content:publish', label: '发布下架' },
      { key: 'content:home', label: '首页配置' },
    ],
  },
  {
    key: 'order',
    title: '订单与退款',
    description: '接收订单并处理整单退款',
    items: [
      { key: 'order:view', label: '查看订单' },
      { key: 'order:handle', label: '处理订单' },
      { key: 'order:refund', label: '退款审核' },
    ],
  },
  {
    key: 'finance',
    title: '财务对账',
    description: '核对支付、退款和差异',
    items: [
      { key: 'finance:view', label: '查看对账' },
      { key: 'finance:export', label: '导出对账单' },
      { key: 'finance:diff', label: '处理差异' },
    ],
  },
  {
    key: 'system',
    title: '系统设置',
    description: '维护平台用户、角色及权限',
    items: [
      { key: 'system:account', label: '用户管理' },
      { key: 'system:role', label: '角色管理' },
      { key: 'system:log', label: '操作日志' },
    ],
  },
]

const allPermissionKeys = permissionGroups.flatMap((group) => group.items.map((item) => item.key))

const initialRoles: RoleRow[] = [
  {
    id: '1',
    name: '运营人员',
    userCount: 4,
    description: '机构、服务、活动与内容运营',
    builtIn: false,
    permissions: [
      'institution:view',
      'institution:sync',
      'institution:edit',
      'service:view',
      'service:add',
      'service:toggle',
      'content:view',
      'content:edit',
      'content:publish',
      'content:home',
      'order:view',
      'order:handle',
    ],
  },
  {
    id: '2',
    name: '平台管理员',
    userCount: 2,
    description: '拥有全部平台功能权限',
    builtIn: true,
    permissions: allPermissionKeys,
  },
  {
    id: '3',
    name: '财务人员',
    userCount: 2,
    description: '订单、退款与财务对账',
    builtIn: false,
    permissions: ['order:view', 'order:refund', 'finance:view', 'finance:export', 'finance:diff'],
  },
  {
    id: '4',
    name: '订单客服',
    userCount: 4,
    description: '订单查询与退款处理',
    builtIn: false,
    permissions: ['order:view', 'order:handle'],
  },
]

export default function RoleManage() {
  const { message } = App.useApp()
  const [roles, setRoles] = useState(initialRoles)
  const [activeId, setActiveId] = useState('1')
  const activeRole = roles.find((item) => item.id === activeId) ?? roles[0]

  const selectedCount = activeRole.permissions.length
  const totalCount = allPermissionKeys.length

  const togglePermission = (key: string) => {
    if (activeRole.builtIn) {
      message.warning('系统内置角色权限不可修改')
      return
    }
    setRoles((prev) =>
      prev.map((role) =>
        role.id === activeRole.id
          ? {
              ...role,
              permissions: role.permissions.includes(key)
                ? role.permissions.filter((item) => item !== key)
                : [...role.permissions, key],
            }
          : role,
      ),
    )
  }

  const handleRestore = () => {
    if (activeRole.builtIn) return
    const origin = initialRoles.find((item) => item.id === activeRole.id)
    if (!origin) return
    setRoles((prev) =>
      prev.map((role) =>
        role.id === activeRole.id ? { ...role, permissions: [...origin.permissions] } : role,
      ),
    )
    message.success('已恢复默认权限（mock）')
  }

  const rolePanelHint = useMemo(
    () =>
      activeRole.builtIn
        ? '系统内置角色，拥有全部平台功能权限，仅可查看。'
        : `${activeRole.userCount} 个用户正在使用 · 修改角色权限后统一生效`,
    [activeRole],
  )

  return (
    <PageContainer
      title="角色管理"
      description="先建立角色并配置菜单与操作权限，再到用户管理中分配给用户"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => message.info('新增角色开发中')}>
          新增角色
        </Button>
      }
    >
      <div className="role-manage">
        <Card variant="borderless" className="role-list">
          <div className="role-list__header">
            <h3>角色列表</h3>
            <Button size="small" icon={<PlusOutlined />} onClick={() => message.info('新增角色开发中')}>
              新增
            </Button>
          </div>
          <p className="role-list__tip">先建立角色，再到用户管理中分配给用户</p>
          <div className="role-list__items">
            {roles.map((role) => (
              <button
                type="button"
                key={role.id}
                className={`role-item${role.id === activeId ? ' is-active' : ''}`}
                onClick={() => setActiveId(role.id)}
              >
                <div className="role-item__head">
                  <strong>{role.name}</strong>
                  <span>{role.userCount} 个账号</span>
                </div>
                <p>{role.description}</p>
                <div className="role-item__foot">
                  <em>{role.builtIn ? '系统内置' : '自定义角色'}</em>
                  <span>
                    {role.builtIn ? '查看权限' : role.id === activeId ? '正在编辑' : '编辑权限'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card variant="borderless" className="role-panel">
          <div className="role-panel__header">
            <div>
              <h3>{activeRole.name}</h3>
              <span>{rolePanelHint}</span>
            </div>
            <Button size="small" onClick={() => message.info('全部展开/收起开发中')}>
              全部展开
            </Button>
          </div>
          <div className="role-panel__banner">
            一期一个用户只分配一个角色；用户不单独配置权限，也不设置机构数据范围。
          </div>
          <div className="role-panel__groups">
            {permissionGroups.map((group) => (
              <div className="perm-group" key={group.key}>
                <div className="perm-group__info">
                  <strong>{group.title}</strong>
                  <span>{group.description}</span>
                </div>
                <div className="perm-group__items">
                  {group.items.map((item) => {
                    const checked = activeRole.permissions.includes(item.key)
                    return (
                      <button
                        type="button"
                        key={item.key}
                        className={`perm-pill${checked ? ' is-checked' : ''}`}
                        onClick={() => togglePermission(item.key)}
                      >
                        {checked ? <CheckOutlined /> : <i className="perm-pill__dot" />}
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="role-panel__footer">
            <span>
              已选择 {selectedCount} / {totalCount} 项权限
            </span>
            <div>
              <Button onClick={handleRestore} disabled={activeRole.builtIn}>
                恢复默认
              </Button>
              <Button
                type="primary"
                disabled={activeRole.builtIn}
                onClick={() => message.success(`「${activeRole.name}」权限已保存（mock）`)}
              >
                保存权限
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  )
}
