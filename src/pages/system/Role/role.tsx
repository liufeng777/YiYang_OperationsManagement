/**
 * 系统设置 - 角色管理
 * 数据来源：
 * - 角色列表 systemApi.getRoles({ all: 1 })（字段：id / name / code / description / status / built_in，1-普通 2-内置）
 * - 角色详情 systemApi.getRoleDetail(roleId)（含 built_in / permission_ids / permissions，切换角色时拉取并渲染勾选态）
 * - 权限面板 systemApi.getPermissions()（返回 { modules, list }，按 module 分组渲染）
 * - 权限保存 systemApi.assignRolePermissions(roleId, permissionIds)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { App, Button, Card, Spin } from 'antd'
import { CheckOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import { systemApi } from '@/api'
import type { PermissionItem, RoleItem } from '@/api/modules/system'
import RoleEditor from './RoleEditor'
import './role.less'

/** 权限模块 → 中文标题 */
const MODULE_TITLE: Record<string, string> = {
  activity: '活动管理',
  admin: '管理员账号',
  all: '全部功能',
  consultation: '咨询管理',
  content: '内容管理',
  dashboard: '数据看板',
  institution: '机构管理',
  lead: '线索管理',
  log: '操作日志',
  member: '会员管理',
  message: '消息通知',
  order: '订单与工单',
  payment: '支付配置',
  role: '角色管理',
  service: '服务项目',
  setting: '系统设置',
  staff: '员工管理',
  user: '用户管理',
}

const moduleTitle = (module: string) => MODULE_TITLE[module] ?? module

export default function RoleManage() {
  const { message, modal } = App.useApp()
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [permissions, setPermissions] = useState<PermissionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null)
  /** 勾选态：roleId → permissionId[]（切换角色时由 getRoleDetail 服务端数据初始化，勾选为本地修改） */
  const [permMap, setPermMap] = useState<Record<number, number[]>>({})
  /** 角色详情（已分配权限）加载中 */
  const [permLoading, setPermLoading] = useState(false)
  /** 详情请求序号：仅最后一次请求生效，避免快速切换角色时旧响应覆盖新勾选 */
  const detailSeq = useRef(0)

  /** 拉取角色详情（已分配权限），写入勾选态 */
  const fetchRoleDetail = useCallback(async (roleId: number) => {
    const seq = ++detailSeq.current
    setPermLoading(true)
    try {
      const detail = await systemApi.getRoleDetail(roleId)
      if (seq !== detailSeq.current) return
      /** 勾选态以 permission_ids 为准，permissions 兜底 */
      const ids = detail.permission_ids ?? (detail.permissions ?? []).map((item) => item.id)
      setPermMap((prev) => ({ ...prev, [roleId]: ids }))
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      if (seq === detailSeq.current) setPermLoading(false)
    }
  }, [])

  /** 拉取角色列表与权限清单 */
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [rolesRes, permsRes] = await Promise.all([
        systemApi.getRoles({ all: 1, page: 1, page_size: 1000 }),
        systemApi.getPermissions(),
      ])
      const list = rolesRes.list ?? []
      setRoles(list)
      setPermissions(permsRes.list ?? [])
      setActiveId((prev) => (prev && list.some((item) => item.id === prev) ? prev : (list[0]?.id ?? null)))
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
      setRoles([])
      setPermissions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  /** 切换角色（含列表加载后的默认选中）：拉取角色详情，按已分配权限渲染勾选态 */
  useEffect(() => {
    if (activeId == null) return
    void fetchRoleDetail(activeId)
  }, [activeId, fetchRoleDetail])

  const activeRole = useMemo(
    () => roles.find((item) => item.id === activeId) ?? null,
    [roles, activeId],
  )

  /** 内置判定：built_in 1-普通 2-内置（不允许删除、不允许修改权限） */
  const isBuiltIn = (role: RoleItem | null) => !!role && role.built_in === 2

  /** 按模块分组的权限清单（顺序沿用接口返回的 modules） */
  const permissionGroups = useMemo(() => {
    const groupMap = new Map<string, PermissionItem[]>()
    permissions.forEach((item) => {
      const list = groupMap.get(item.module) ?? []
      list.push(item)
      groupMap.set(item.module, list)
    })
    const ordered = [...groupMap.keys()]
    return ordered.map((module) => ({
      key: module,
      title: moduleTitle(module),
      items: groupMap.get(module) ?? [],
    }))
  }, [permissions])

  const activePermIds = activeRole ? (permMap[activeRole.id] ?? []) : []
  const allPermissionIds = permissions.map((item) => item.id)
  /** 内置角色视为拥有全部权限 */
  const checkedIds = useMemo(
    () => (isBuiltIn(activeRole) ? allPermissionIds : activePermIds),
    [activeRole, activePermIds, allPermissionIds],
  )

  const otherCodes = useMemo(
    () => roles.filter((role) => role.id !== editingRole?.id).map((role) => role.code),
    [roles, editingRole],
  )

  const openCreate = () => {
    setEditingRole(null)
    setEditorOpen(true)
  }

  const openEdit = (role: RoleItem) => {
    setEditingRole(role)
    setEditorOpen(true)
  }

  /** 删除角色二次确认（仅自定义角色可删） */
  const confirmDeleteRole = (role: RoleItem) => {
    if (role.built_in === 2) return
    modal.confirm({
      title: `确认删除角色「${role.name}」？`,
      content: '删除后不可恢复，请确认该角色下已无用户。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await systemApi.deleteRole(role.id)
        message.success(`角色「${role.name}」已删除`)
        await fetchData()
      },
    })
  }

  /** 勾选 / 取消勾选权限（本地态，保存后写入后端） */
  const togglePermission = (permissionId: number) => {
    if (!activeRole) return
    if (isBuiltIn(activeRole)) {
      message.warning('系统内置角色权限不可修改')
      return
    }
    setPermMap((prev) => {
      const current = prev[activeRole.id] ?? []
      return {
        ...prev,
        [activeRole.id]: current.includes(permissionId)
          ? current.filter((id) => id !== permissionId)
          : [...current, permissionId],
      }
    })
  }

  /** 保存权限 */
  const handleSavePermissions = async () => {
    if (!activeRole) return
    if (isBuiltIn(activeRole)) return
    setSaving(true)
    try {
      await systemApi.assignRolePermissions(activeRole.id, activePermIds)
      message.success(`「${activeRole.name}」权限已保存`)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = () => {
    if (!activeRole || isBuiltIn(activeRole)) return
    setPermMap((prev) => ({ ...prev, [activeRole.id]: [] }))
    message.success('已清空勾选，保存后生效')
  }

  const rolePanelHint = useMemo(() => {
    if (!activeRole) return '请选择左侧角色查看权限'
    return isBuiltIn(activeRole)
      ? '系统内置角色，拥有全部平台功能权限，仅可查看。'
      : '权限勾选保存后对该角色下所有用户统一生效。'
  }, [activeRole])

  return (
    <PageContainer
      fixed
      title="角色管理"
      description="先建立角色并配置菜单与操作权限，再到用户管理中分配给用户"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增角色
        </Button>
      }
    >
      <Spin spinning={loading}>
        <div className="role-manage">
          <Card variant="borderless" className="role-list">
            <div className="role-list__header">
              <h3>角色列表</h3>
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
                    <strong>{role.name}</strong>
                    <span>{role.code}</span>
                  </div>
                  <p>{role.description || '暂无描述'}</p>
                  <div className="role-item__foot">
                    <em>{role.built_in === 2 ? '系统内置' : '自定义角色'}</em>
                    {role.built_in !== 2 && (
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
              {!roles.length && !loading && (
                <p className="role-list__tip">暂无角色，请先新增角色</p>
              )}
            </div>
          </Card>

          <Card variant="borderless" className="role-panel">
            <div className="role-panel__header">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <h3>{activeRole?.name ?? '—'}</h3>
                <span>{rolePanelHint}</span>
              </div>
            </div>
            <div className="role-panel__banner">
              用户不单独配置权限，也不设置机构数据范围；角色权限统一生效。
            </div>
            <div className="role-panel__groups">
              <Spin spinning={permLoading} size="small">
              {permissionGroups.map((group) => (
                <div className="perm-group" key={group.key}>
                  <div className="perm-group__info">
                    <strong>{group.title}</strong>
                    <span>{group.key}</span>
                  </div>
                  <div className="perm-group__items">
                    {group.items.map((item) => {
                      const checked = checkedIds.includes(item.id)
                      return (
                        <button
                          type="button"
                          key={item.id}
                          className={`perm-pill${checked ? ' is-checked' : ''}`}
                          onClick={() => togglePermission(item.id)}
                        >
                          {checked ? <CheckOutlined /> : <i className="perm-pill__dot" />}
                          {item.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              {!permissionGroups.length && !loading && (
                <p className="role-list__tip">暂无权限数据</p>
              )}
              </Spin>
            </div>
            <div className="role-panel__footer">
              <span>
                已选择 {checkedIds.length} / {allPermissionIds.length} 项权限
              </span>
              <div>
                <Button onClick={handleRestore} disabled={!activeRole || isBuiltIn(activeRole)}>
                  清空勾选
                </Button>
                <Button
                  type="primary"
                  loading={saving}
                  disabled={!activeRole || isBuiltIn(activeRole)}
                  onClick={handleSavePermissions}
                >
                  保存权限
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </Spin>

      <RoleEditor
        open={editorOpen}
        initial={editingRole}
        otherCodes={otherCodes}
        onClose={() => setEditorOpen(false)}
        onSaved={() => {
          void fetchData()
          /** 编辑角色可能一并下发权限，保存后同步最新勾选态 */
          if (activeId != null) void fetchRoleDetail(activeId)
        }}
      />
    </PageContainer>
  )
}
