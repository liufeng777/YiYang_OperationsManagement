/**
 * 系统设置 - 角色管理
 * 视觉对齐设计稿：左侧角色列表 + 右侧权限配置面板
 * 当前为 mock 数据，后端就绪后替换为 systemApi.getRoleList / createRole / updateRole
 */
import { useMemo, useState } from 'react'
import { App, Button, Card } from 'antd'
import { CheckOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import RoleEditor from './RoleEditor'
import './role.less'

/** 权限项（页面展示 / 与权限面板相互作用） */
export interface RolePermission {
  id: number
  code: string
  module: string
  name: string
}

/** 角色行（对齐接口契约 RoleDetail 并扩展内置标记与账号量） */
export interface RoleRow {
  id: number
  role_name: string
  role_code: string
  built_in: boolean
  description: string
  status: number
  userCount: number
  permissions: RolePermission[]
}

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

const permissionGroups: PermissionGroup[] = [
  {
    key: 'institution',
    title: '机构管理',
    description: '同步和维护自营机构资料',
    items: [
      { key: 'institution:view', label: '查看' },
      { key: 'institution:edit', label: '新建与编辑' },
      { key: 'institution:manage', label: '删除与管理' },
    ],
  },
  {
    key: 'service',
    title: '服务项目',
    description: '维护集团服务池与机构服务',
    items: [
      { key: 'service:view', label: '查看' },
      { key: 'service:edit', label: '新建与编辑' },
      { key: 'service:manage', label: '删除与管理' },
    ],
  },
  {
    key: 'activity',
    title: '活动与内容',
    description: '管理活动及患者端首页内容',
    items: [
      { key: 'activity:view', label: '查看' },
      { key: 'activity:edit', label: '新建与编辑' },
      { key: 'activity:manage', label: '删除与管理' },
    ],
  },
  {
    key: 'order',
    title: '订单与退款',
    description: '接收订单并处理整单退款',
    items: [
      { key: 'order:view', label: '查看' },
      { key: 'order:edit', label: '新建与编辑' },
      { key: 'order:manage', label: '删除与管理' },
    ],
  },
  {
    key: 'finance',
    title: '财务对账',
    description: '核对支付、退款和差异',
    items: [
      { key: 'finance:view', label: '查看' },
      { key: 'finance:edit', label: '新建与编辑' },
      { key: 'finance:manage', label: '删除与管理' },
    ],
  },
  {
    key: 'member',
    title: '系统管理',
    description: '维护平台用户、角色及权限',
    items: [
      { key: 'member:view', label: '查看' },
      { key: 'member:edit', label: '新建与编辑' },
      { key: 'member:manage', label: '删除与管理' },
    ],
  },
]

const allPermissionKeys = permissionGroups.flatMap((group) => group.items.map((item) => item.key))

let permSeq = 0
const toPerm = (key: string, module: string, name: string): RolePermission => ({
  id: ++permSeq,
  code: key,
  module,
  name,
})

const builtInPerms = permissionGroups.flatMap((group) =>
  group.items.map((item) => toPerm(item.key, group.key, item.label)),
)

const initialRoles: RoleRow[] = [
  {
    id: 1,
    role_name: '平台管理员',
    role_code: 'super',
    built_in: true,
    description: '拥有全部平台功能权限',
    status: 1,
    userCount: 2,
    permissions: builtInPerms,
  },
  {
    id: 2,
    role_name: '运营人员',
    role_code: 'operator',
    built_in: false,
    description: '机构、服务、活动与内容运营',
    status: 1,
    userCount: 4,
    permissions: [
      toPerm('institution:view', 'institution', '查看'),
      toPerm('institution:edit', 'institution', '新建与编辑'),
      toPerm('service:view', 'service', '查看'),
      toPerm('service:edit', 'service', '新建与编辑'),
      toPerm('activity:view', 'activity', '查看'),
      toPerm('activity:edit', 'activity', '新建与编辑'),
      toPerm('order:view', 'order', '查看订单'),
    ],
  },
  {
    id: 3,
    role_name: '财务人员',
    role_code: 'finance',
    built_in: false,
    description: '订单、退款与财务对账',
    status: 1,
    userCount: 2,
    permissions: [
      toPerm('order:view', 'order', '查看订单'),
      toPerm('order:manage', 'order', '管理订单'),
      toPerm('finance:view', 'finance', '查看'),
    ],
  },
  {
    id: 4,
    role_name: '订单客服',
    role_code: 'orderCustomerService',
    built_in: false,
    description: '订单查询与退款处理',
    status: 1,
    userCount: 4,
    permissions: [toPerm('order:view', 'order', '查看订单'), toPerm('order:manage', 'order', '管理订单')],
  },
]

export default function RoleManage() {
  const { message, modal } = App.useApp()
  const [roles, setRoles] = useState(initialRoles)
  const [activeId, setActiveId] = useState<number>(1)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null)

  const activeRole = roles.find((item) => item.id === activeId) ?? roles[0]

  const otherCodes = useMemo(
    () =>
      roles
        .filter((role) => (editingRole ? role.id !== editingRole.id : true))
        .map((role) => role.role_code),
    [roles, editingRole],
  )

  const selectedCount = activeRole.permissions.length
  const totalCount = allPermissionKeys.length

  const openCreate = () => {
    setEditingRole(null)
    setEditorOpen(true)
  }

  const openEdit = (role: RoleRow) => {
    setEditingRole(role)
    setEditorOpen(true)
  }

  /** 新增/编辑 保存：按 id 是否已存在决定插入或更新 */
  const saveRole = (role: RoleRow) => {
    setRoles((prev) =>
      prev.some((item) => item.id === role.id)
        ? prev.map((item) => (item.id === role.id ? role : item))
        : [...prev, role],
    )
  }

  /** 删除角色二次确认（仅自定义角色可删） */
  const confirmDeleteRole = (role: RoleRow) => {
    if (role.built_in) return
    modal.confirm({
      title: `确认删除角色「${role.role_name}」？`,
      content: '删除后不可恢复，请确认该角色下已无用户。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        setRoles((prev) => prev.filter((item) => item.id !== role.id))
        if (activeId === role.id) {
          const rest = roles.find((item) => item.id !== role.id)
          setActiveId(rest?.id ?? 0)
        }
        message.success(`角色「${role.role_name}」已删除（mock）`)
      },
    })
  }

  const togglePermission = (key: string) => {
    if (activeRole.built_in) {
      message.warning('系统内置角色权限不可修改')
      return
    }
    setRoles((prev) =>
      prev.map((role) => {
        if (role.id !== activeRole.id) return role
        const has = role.permissions.some((p) => p.code === key)
        const groupModule = permissionGroups.find((g) => g.key === key.split(':')[0])
        const label = groupModule
          ? groupModule.items.find((i) => i.key === key)?.label ?? key
          : key
        return {
          ...role,
          permissions: has
            ? role.permissions.filter((p) => p.code !== key)
            : [...role.permissions, toPerm(key, key.split(':')[0], label)],
        }
      }),
    )
  }

  const handleRestore = () => {
    if (activeRole.built_in) return
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
      activeRole.built_in
        ? '系统内置角色，拥有全部平台功能权限，仅可查看。'
        : `${activeRole.userCount} 个用户正在使用 · 修改角色权限后统一生效`,
    [activeRole],
  )

  return (
    <PageContainer
      title="角色管理"
      description="先建立角色并配置菜单与操作权限，再到用户管理中分配给用户"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增角色
        </Button>
      }
    >
      <div className="role-manage">
        <Card variant="borderless" className="role-list">
          <div className="role-list__header">
            <h3>角色列表</h3>
            {/* <Button size="small" icon={<PlusOutlined />} onClick={openCreate}>
              新增
            </Button> */}
          </div>
          <p className="role-list__tip">先建立角色，再到用户管理中分配给用户</p>
          <div className="role-list__items">
            {roles.map((role) => (
              <div
                key={role.id}
                className={`role-item${role.id === activeId ? ' is-active' : ''}`}
                onClick={() => setActiveId(role.id)}
              >
                <div className="role-item__head">
                  <strong>{role.role_name}</strong>
                  <span>{role.userCount} 个账号</span>
                </div>
                <p>{role.description}</p>
                <div className="role-item__foot">
                  <em>{role.built_in ? '系统内置' : '自定义角色'}</em>
                  {role.built_in ? (
                    <span>查看权限</span>
                  ) : (
                    <div
                      className="role-item__actions"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEdit(role)}
                      >
                        编辑
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => confirmDeleteRole(role)}
                      >
                        删除
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card variant="borderless" className="role-panel">
          <div className="role-panel__header">
            <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
              <h3>{activeRole.role_name}</h3>
              <span>{rolePanelHint}</span>
            </div>
          </div>
          <div className="role-panel__banner">
            用户不单独配置权限，也不设置机构数据范围；角色权限统一生效。
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
                    const checked = activeRole.permissions.some((p) => p.code === item.key)
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
              <Button onClick={handleRestore} disabled={activeRole.built_in}>
                恢复默认
              </Button>
              <Button
                type="primary"
                disabled={activeRole.built_in}
                onClick={() => message.success(`「${activeRole.role_name}」权限已保存（mock）`)}
              >
                保存权限
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <RoleEditor
        open={editorOpen}
        initial={editingRole}
        otherCodes={otherCodes}
        onClose={() => setEditorOpen(false)}
        onSaved={saveRole}
      />
    </PageContainer>
  )
}
