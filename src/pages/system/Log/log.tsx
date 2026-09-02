/**
 * 系统设置 - 操作日志
 * 视觉对齐系统设置其他页面：筛选栏 + 日志表格
 * 当前为 mock 数据，后端就绪后替换为 systemApi.getOperationLogs
 */
import { useMemo, useState } from 'react'
import { Button, Card, DatePicker, Input, Select, Space, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined, UndoOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import PageContainer from '@/components/PageContainer'
import type { OperationLogItem } from '@/api/modules/system'
import { formatDateTime } from '@/utils'
import './log.less'

const { RangePicker } = DatePicker

/** 操作动作 → 展示文案 / 标签色 */
const actionMeta: Record<string, { text: string; color: string }> = {
  create: { text: '新增', color: 'default' },
  update: { text: '修改', color: 'default' },
  delete: { text: '删除', color: 'default' },
  login: { text: '登录', color: 'default' },
  logout: { text: '登出', color: 'default' },
  export: { text: '导出', color: 'default' },
  import: { text: '导入', color: 'default' },
  review: { text: '审核', color: 'default' },
  dispatch: { text: '派单', color: 'default' },
}

const resourceMeta: Record<string, { text: string; color: string }> = {
  institution: { text: '机构管理', color: 'green' },
  refund: { text: '退款管理', color: 'blue' },
  order: { text: '订单管理', color: 'cyan' },
  consumable: { text: '服务管理', color: 'lime' },
  'work-order': { text: '排班管理', color: 'volcano' },
  role: { text: '角色管理', color: 'magenta' },
  member: { text: '用户管理', color: 'purple' },
  auth: { text: '权限管理', color: 'orange' },
  activity: { text: '活动管理', color: 'geekblue' },
}

/** 状态码 → 标签色 */
const statusColor = (status: number): string => {
  if (status >= 500) return 'error'
  if (status >= 400) return 'warning'
  if (status >= 200) return 'success'
  return 'default'
}

const actionOptions = Object.keys(actionMeta).map((key) => ({
  label: actionMeta[key].text,
  value: key,
}))

/** mock 操作日志（接口未实现，先本地造数） */
const now = Math.floor(Date.now() / 1000)
const mockLogs: OperationLogItem[] = [
  { id: 1, admin_id: 1, admin_name: 'admin', action: 'login', resource: 'auth', resource_id: 0, ip_address: '127.0.0.1', request_method: 'POST', request_url: '/api/admin/auth/login', request_params: null, response_status: 200, duration_ms: 18, created_at: now - 3600 },
  { id: 2, admin_id: 1, admin_name: 'admin', action: 'create', resource: 'institution', resource_id: 8, ip_address: '127.0.0.1', request_method: 'POST', request_url: '/api/admin/institutions', request_params: { name: '幸福护理院' }, response_status: 201, duration_ms: 32, created_at: now - 3200 },
  { id: 3, admin_id: 2, admin_name: 'li.caiwu', action: 'review', resource: 'refund', resource_id: 12, ip_address: '10.0.1.23', request_method: 'POST', request_url: '/api/admin/refunds/12/approve', request_params: { approve: true }, response_status: 200, duration_ms: 41, created_at: now - 2800 },
  { id: 4, admin_id: 3, admin_name: 'wang.kefu', action: 'update', resource: 'order', resource_id: 96, ip_address: '10.0.1.31', request_method: 'PUT', request_url: '/api/admin/orders/96', request_params: null, response_status: 200, duration_ms: 25, created_at: now - 2400 },
  { id: 5, admin_id: 1, admin_name: 'admin', action: 'export', resource: 'order', resource_id: 0, ip_address: '127.0.0.1', request_method: 'GET', request_url: '/api/admin/orders/export', request_params: null, response_status: 200, duration_ms: 156, created_at: now - 2000 },
  { id: 6, admin_id: 2, admin_name: 'li.caiwu', action: 'delete', resource: 'consumable', resource_id: 5, ip_address: '10.0.1.23', request_method: 'DELETE', request_url: '/api/admin/consumables/5', request_params: null, response_status: 400, duration_ms: 19, created_at: now - 1600 },
  { id: 7, admin_id: 3, admin_name: 'wang.kefu', action: 'dispatch', resource: 'work-order', resource_id: 33, ip_address: '10.0.1.31', request_method: 'POST', request_url: '/api/admin/work-orders/33/dispatch', request_params: { staff_id: 12 }, response_status: 200, duration_ms: 37, created_at: now - 1200 },
  { id: 8, admin_id: 1, admin_name: 'admin', action: 'create', resource: 'role', resource_id: 9, ip_address: '127.0.0.1', request_method: 'POST', request_url: '/api/admin/roles', request_params: { role_name: '财务专员' }, response_status: 201, duration_ms: 28, created_at: now - 800 },
  { id: 9, admin_id: 2, admin_name: 'li.caiwu', action: 'import', resource: 'member', resource_id: 0, ip_address: '10.0.1.23', request_method: 'POST', request_url: '/api/admin/members/import', request_params: null, response_status: 200, duration_ms: 212, created_at: now - 600 },
  { id: 10, admin_id: 3, admin_name: 'wang.kefu', action: 'logout', resource: 'auth', resource_id: 0, ip_address: '10.0.1.31', request_method: 'POST', request_url: '/api/admin/auth/logout', request_params: null, response_status: 500, duration_ms: 12, created_at: now - 300 },
  { id: 11, admin_id: 1, admin_name: 'admin', action: 'update', resource: 'activity', resource_id: 4, ip_address: '127.0.0.1', request_method: 'PUT', request_url: '/api/admin/activities/4', request_params: { title: '社区讲座' }, response_status: 200, duration_ms: 22, created_at: now - 120 },
  { id: 12, admin_id: 1, admin_name: 'admin', action: 'create', resource: 'member', resource_id: 101, ip_address: '127.0.0.1', request_method: 'POST', request_url: '/api/admin/members', request_params: { name: '张大爷' }, response_status: 201, duration_ms: 20, created_at: now - 60 },
]

const resourceOptions = Object.keys(resourceMeta).map(v => ({
  label: resourceMeta[v].text,
  value: v
}))

interface LogFilters {
  keyword: string
  action: string
  resource: string
  range: [Dayjs | null, Dayjs | null] | null
}

const emptyFilters: LogFilters = { keyword: '', action: 'all', resource: 'all', range: null }

export default function SystemLog() {
  const [keyword, setKeyword] = useState('')
  const [action, setAction] = useState('all')
  const [resource, setResource] = useState('all')
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [applied, setApplied] = useState<LogFilters>(emptyFilters)
  const [page, setPage] = useState(1)
  const pageSize = 10

  /** 筛选 + 分页 */
  const { list, total } = useMemo(() => {
    const filtered = mockLogs.filter((item) => {
      const keywordHit =
        !applied.keyword ||
        item.admin_name.toLowerCase().includes(applied.keyword.toLowerCase()) ||
        item.ip_address.includes(applied.keyword) ||
        item.request_url.toLowerCase().includes(applied.keyword.toLowerCase())
      const actionHit = applied.action === 'all' || item.action === applied.action
      const resourceHit = applied.resource === 'all' || item.resource === applied.resource
      const timeHit =
        !applied.range ||
        !applied.range[0] ||
        !applied.range[1] ||
        (item.created_at >= Math.floor(applied.range[0].startOf('day').valueOf() / 1000) &&
          item.created_at <= Math.floor(applied.range[1].endOf('day').valueOf() / 1000))
      return keywordHit && actionHit && resourceHit && timeHit
    })
    const start = (page - 1) * pageSize
    return { list: filtered.slice(start, start + pageSize), total: filtered.length }
  }, [applied, page])

  const applyFilters = () => {
    setApplied({ keyword: keyword.trim(), action, resource, range })
    setPage(1)
  }

  const handleReset = () => {
    setKeyword('')
    setAction('all')
    setResource('all')
    setRange(null)
    setApplied(emptyFilters)
    setPage(1)
  }

  const columns: ColumnsType<OperationLogItem> = useMemo(
    () => [
      {
        title: '操作人',
        key: 'admin_name',
        dataIndex: 'admin_name',
      },
      {
        title: '业务对象',
        key: 'resource',
        dataIndex: 'resource',
        width: 170,
        render: (value) => {
          const meta = resourceMeta[value]
          return <Tag color={meta.color} variant='outlined' >{meta?.text}</Tag>
        },
      },
      {
        title: '动作',
        dataIndex: 'action',
        key: 'action',
        width: 90,
        render: (value: string) => {
          const meta = actionMeta[value]
          return <Tag color={meta?.color ?? 'default'}>{meta?.text ?? value}</Tag>
        },
      },
      {
        title: '请求',
        key: 'request',
        render: (_, record) => (
          <span className="log-request">
            <Tag>{record.request_method}</Tag>
            <span className="log-request__url">{record.request_url}</span>
          </span>
        ),
      },
      {
        title: 'IP 地址',
        dataIndex: 'ip_address',
        key: 'ip_address',
        width: 130,
      },
      {
        title: '状态',
        dataIndex: 'response_status',
        key: 'response_status',
        width: 80,
        render: (value: number) => <Tag color={statusColor(value)} variant='solid'>{value}</Tag>,
      },
      {
        title: '耗时',
        key: 'duration',
        width: 90,
        render: (_, record) => `${record.duration_ms}ms`,
      },
      {
        title: '操作时间',
        dataIndex: 'created_at',
        key: 'created_at',
        width: 170,
        render: (value: number) => formatDateTime(value * 1000),
      },
    ],
    [],
  )

  return (
    <PageContainer title="操作日志" description="查看系统操作记录，追踪每个管理员的审计动作">
      <div className="log-page">
        <Card variant="borderless" className="filter-bar log-page__filter">
          <Input
            allowClear
            placeholder="按操作人 / IP / 请求地址搜索"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Select
            value={resource}
            onChange={setResource}
            allowClear
            placeholder="业务模块"
            options={[{ label: '全部模块', value: 'all' }, ...resourceOptions]}
          />
          <Select
            value={action}
            onChange={setAction}
            allowClear
            placeholder="操作类型"
            options={[{ label: '全部类型', value: 'all' }, ...actionOptions]}
          />
          
          <RangePicker value={range} onChange={(value) => setRange(value)} />
          <Space>
            <Button type="primary" icon={<SearchOutlined />} onClick={applyFilters}>
              查询
            </Button>
            <Button icon={<UndoOutlined />} onClick={handleReset}>
              重置
            </Button>
          </Space>
        </Card>

        <Card variant="borderless" className="list-card">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">操作记录</span>
            </div>
          </div>
          <Table<OperationLogItem>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={list}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: false,
              showTotal: (t) => `共 ${t} 条`,
              onChange: (nextPage) => setPage(nextPage),
            }}
          />
        </Card>
      </div>
    </PageContainer>
  )
}
