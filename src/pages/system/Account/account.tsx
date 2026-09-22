/**
 * 系统设置 - 用户管理
 * 数据来源：systemApi.getAdminList（服务端分页；筛选条件全部下推后端，前端不做本地过滤）
 * 字段按后端实测：username / nickname / mobile(phone) / role_ids / role_names /
 *                status(1 启用 9 停用) / last_login_at('YYYY-MM-DD HH:mm:ss')
 * 统计卡片：暂不接入（待后端提供统计接口后填充，不用列表接口凑数）
 * 重置密码：弹框填写 new_password 后调用 systemApi.resetAdminPassword
 */
import { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, Form, Input, Modal, Select, Space, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined, PlusOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import { systemApi } from '@/api'
import type { AdminItem, RoleItem } from '@/api/modules/system'
import type { CommonStatus } from '@/types/api'
import AddAccount from './AddAccount'
import './account.less'

/** 用户状态：1 启用 / 9 停用（后端 CommonStatus） */
const STATUS_ENABLED: CommonStatus = 1
const STATUS_DISABLED: CommonStatus = 9

const PAGE_SIZE = 10

interface AccountFilters {
  keyword: string
  role: number | null
  status: number | null
}

const emptyFilters: AccountFilters = { keyword: '', role: null, status: null}

/** 用户状态文案：1-已激活 9-已禁用 */
const statusText: Record<number, string> = {
  1: '已激活',
  9: '已禁用',
}

export default function AccountList() {
  const { message, modal } = App.useApp()
  const [rows, setRows] = useState<AdminItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [keyword, setKeyword] = useState('')
  const [role, setRole] = useState<number| null>(null)
  const [status, setStatus] = useState<number| null>(null)
  const [applied, setApplied] = useState<AccountFilters>(emptyFilters)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<AdminItem | null>(null)
  const [page, setPage] = useState(1)
  /** 重置密码弹框：目标用户 + 新密码 */
  const [resetTarget, setResetTarget] = useState<AdminItem | null>(null)
  const [resetting, setResetting] = useState(false)
  const [resetForm] = Form.useForm<{ new_password: string }>()

  /** 组装查询参数：筛选条件全部下推后端（登录时间按 UTC 秒区间传递） */
  const buildParams = useCallback((targetPage: number, filters: AccountFilters) => {
    return {
      page: targetPage,
      page_size: PAGE_SIZE,
      keyword: filters.keyword || undefined,
      role_id: !filters.role ? undefined : Number(filters.role),
      status:
        !filters.status
          ? undefined
          : Number(filters.status)
    }
  }, [])

  /** 拉取用户列表（分页 + 筛选） */
  const fetchList = useCallback(
    async (targetPage: number, filters: AccountFilters) => {
      setLoading(true)
      try {
        const res = await systemApi.getAdminList(buildParams(targetPage, filters))
        setRows(res.list ?? [])
        setTotal(res.total ?? 0)
      } catch {
        /* 错误提示由 request 拦截器统一处理 */
        setRows([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    [buildParams],
  )

  /** 角色下拉数据源 */
  const fetchRoles = useCallback(async () => {
    try {
      const res = await systemApi.getRoles({ all: 1, page: 1, page_size: 1000 })
      setRoles(res.list ?? [])
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    }
  }, [])

  useEffect(() => {
    void fetchList(1, emptyFilters)
    void fetchRoles()
  }, [fetchList, fetchRoles])

  const refresh = useCallback(
    (targetPage = page) => {
      void fetchList(targetPage, applied)
    },
    [fetchList, applied, page],
  )

  /** 打开新增用户 Drawer */
  const openCreate = () => {
    setEditing(null)
    setDrawerOpen(true)
  }

  /** 打开编辑用户 Drawer */
  const openEdit = (record: AdminItem) => {
    setEditing(record)
    setDrawerOpen(true)
  }

  const applyFilters = (next?: Partial<AccountFilters>) => {
    const merged: AccountFilters = {
      keyword: keyword.trim(),
      role,
      status,
      ...next,
    }
    setApplied(merged)
    setPage(1)
    void fetchList(1, merged)
  }

  /** 用户状态筛选：与状态下拉同维度，切换即下推查询 */
  const changeStatus = (value: AccountFilters['status']) => {
    setStatus(value)
    applyFilters({ status: value })
  }

  const handleReset = () => {
    setKeyword('')
    setRole(null)
    setStatus(null)
    setApplied(emptyFilters)
    setPage(1)
    void fetchList(1, emptyFilters)
  }

  /** 停用/启用二次确认 */
  const confirmToggle = (record: AdminItem) => {
    const toDisable = record.status === STATUS_ENABLED
    modal.confirm({
      title: toDisable ? `确认停用用户「${record.nickname}」？` : `确认启用用户「${record.nickname}」？`,
      content: toDisable ? '停用后该用户将无法登录运营平台。' : '启用后该用户可正常登录运营平台。',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        await systemApi.updateAdminStatus(record.id, toDisable ? STATUS_DISABLED : STATUS_ENABLED)
        message.success(`${record.username} 已${toDisable ? '停用' : '启用'}`)
        refresh()
      },
    })
  }

  /** 删除二次确认 */
  const confirmDelete = (record: AdminItem) => {
    modal.confirm({
      title: `确认删除用户「${record.nickname}」？`,
      content: '删除后不可恢复。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await systemApi.deleteAdmin(record.id)
        message.success(`用户 ${record.username} 已删除`)
        refresh()
      },
    })
  }

  /** 打开重置密码弹框 */
  const openResetPassword = (record: AdminItem) => {
    setResetTarget(record)
    resetForm.resetFields()
  }

  /** 提交重置密码：需填写 new_password */
  const handleResetPassword = async () => {
    if (!resetTarget) return
    let values: { new_password: string }
    try {
      values = await resetForm.validateFields()
    } catch {
      return // 校验失败由 Form.Item 就地提示
    }
    setResetting(true)
    try {
      await systemApi.resetAdminPassword(resetTarget.id, { new_password: values.new_password })
      message.success(`用户 ${resetTarget.username} 的密码已重置`)
      setResetTarget(null)
      resetForm.resetFields()
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setResetting(false)
    }
  }

  const columns: ColumnsType<AdminItem> = [
    {
      title: '用户名 / 昵称',
      key: 'username',
      render: (_, record) => (
        <div className="account-name">
          <strong>{record.username}</strong>
          <span>{record.nickname || '—'}</span>
        </div>
      ),
    },
    {
      title: '角色',
      key: 'roles',
      render: (_, record) => {
        const names = record.role_names ?? []
        if (!names.length) return '—'
        return (
          <Space wrap>
            {names.map((name, index) => (
              <Tag key={`${record.id}-${index}`}>{name}</Tag>
            ))}
          </Space>
        )
      },
    },
    {
      title: '手机号',
      key: 'mobile',
      width: 120,
      render: (_, record) => record.mobile || record.phone || '—',
    },
    {
      title: '用户状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: number) => (
        <span className={`account-status${value === STATUS_ENABLED ? ' is-on' : ''}`}>
          {statusText[value] ?? '—'}
        </span>
      ),
    },
    {
      title: '最近登录',
      key: 'last_login_at',
      width: 160,
      render: (_, record) => <span className="account-name">
        {record.last_login_ip && <span>IP: <strong>{record.last_login_ip}</strong></span>}
        <span>{record.last_login_at || '—'}</span>
      </span>
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <div className="account-actions">
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" danger={record.status === 1} onClick={() => confirmToggle(record)}>
            {record.status === STATUS_ENABLED ? '禁用' : '激活'}
          </Button>
          <Button type="link" size="small" onClick={() => openResetPassword(record)}>
            重置密码
          </Button>
          <Button type="link" size="small" danger onClick={() => confirmDelete(record)}>
            删除
          </Button>
        </div>
      ),
    },
  ]

  /** 统计卡片：待后端统计接口接入，先占位 */
  const metrics = [
    { key: 'all', label: '全部用户', note: '运营平台内部用户', tone: 'primary' },
    { key: 'enabled', label: '启用用户', note: '可登录运营平台', tone: 'info' },
    { key: 'disabled', label: '停用用户', note: '停用后不允许登录', tone: 'warning' },
    { key: 'role', label: '角色数量', note: '在角色管理中统一维护', tone: 'danger' },
  ]

  return (
    <PageContainer
      title="用户管理"
      description="创建运营平台用户并分配角色，用户权限全部继承所属角色"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增用户
        </Button>
      }
    >
      <div className="account-list">
        <div className="metric-cards">
          {metrics.map((metric) => (
            <Card variant="borderless" className="metric-card" key={metric.key}>
              <div className="metric-card__head">
                <span className="metric-card__label">{metric.label}</span>
                <i className={`metric-card__icon metric-card__icon--${metric.tone}`}>
                  <BarChartOutlined />
                </i>
              </div>
              {/* 统计接口未接入，暂以占位展示 */}
              <strong className="metric-card__value">—</strong>
              <em className={`metric-card__note metric-card__note--${metric.tone}`}>
                {metric.note}
              </em>
            </Card>
          ))}
        </div>

        <Card variant="borderless" className="filter-bar account-list__filter">
          <Input
            allowClear
            placeholder="用户名 / 昵称"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={() => applyFilters()}
          />
          <Select
            placeholder="用户角色"
            allowClear
            value={role}
            onChange={setRole}
            options={[
              ...roles.map((item) => ({ label: item.name, value: String(item.id) })),
            ]}
          />
          <Select
            placeholder="用户状态"
            allowClear
            value={status}
            onChange={(value) => changeStatus(value as AccountFilters['status'])}
            options={[
              { label: '激活', value: 1 },
              { label: '禁用', value: 9 },
            ]}
          />
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={() => applyFilters()}>
            查询
          </Button>
        </Card>

        <Card variant="borderless" className="list-card">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">用户列表</span>
            </div>
          </div>
          <Table<AdminItem>
            rowKey="id"
            size="small"
            loading={loading}
            columns={columns}
            dataSource={rows}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total,
              onChange: (nextPage) => {
                setPage(nextPage)
                void fetchList(nextPage, applied)
              },
              showTotal: (count) => `共 ${count} 条`,
            }}
          />
        </Card>
      </div>

      <AddAccount
        open={drawerOpen}
        initial={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => refresh()}
      />

      {/* 重置密码：需填写 new_password */}
      <Modal
        open={!!resetTarget}
        title={`重置用户「${resetTarget?.nickname ?? ''}」的密码`}
        okText="确认重置"
        cancelText="取消"
        confirmLoading={resetting}
        onOk={handleResetPassword}
        onCancel={() => {
          setResetTarget(null)
          resetForm.resetFields()
        }}
        destroyOnClose
      >
        <Form form={resetForm} layout="vertical" preserve={false}>
          <Form.Item
            name="new_password"
            label="新密码"
            extra="重置后该用户需使用新密码登录运营平台"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少 6 位' },
            ]}
          >
            <Input.Password placeholder="请输入新的登录密码" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
