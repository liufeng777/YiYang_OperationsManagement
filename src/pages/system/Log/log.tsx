/**
 * 系统设置 - 操作日志
 * 数据来源：systemApi.getOperationLogs
 * 字段按后端实测：operator / module / action / target / params / path / ip / operated_at / create_at / error_message
 * 筛选：关键字 / 模块 / 动作 / 时间范围全部下推后端（前端不做本地过滤）
 * 请求参数：JSON 字符串，列内以「查看」按钮触发 Popover 展示格式化后的 JSON
 */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, DatePicker, Input, Popover, Select, Space, Tag } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined, UndoOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import PageContainer from '@/components/PageContainer'
import { systemApi } from '@/api'
import type { OperationLogItem } from '@/api/modules/system'
import { formatDateTime } from '@/utils'
import './log.less'

const { RangePicker } = DatePicker

/** 请求参数（JSON 字符串）→ 缩进后的 JSON 文本；非 JSON 内容原样返回 */
function formatParams(raw?: string): string {
  const text = (raw ?? '').trim()
  if (!text) return ''
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}

/** 操作动作 → 展示文案 / 标签色 */
const actionMeta: Record<string, { text: string; color: string }> = {
  create: { text: '新增', color: 'blue' },
  update: { text: '修改', color: 'cyan' },
  delete: { text: '删除', color: 'red' },
  login: { text: '登录', color: 'green' },
  logout: { text: '登出', color: 'default' },
  export: { text: '导出', color: 'geekblue' },
  import: { text: '导入', color: 'geekblue' },
  review: { text: '审核', color: 'orange' },
  dispatch: { text: '派单', color: 'purple' },
  run: { text: '执行', color: 'magenta' },
  publish: { text: '发布', color: 'green' },
  offline: { text: '下线', color: 'default' },
  assign: { text: '分配', color: 'gold' },
  reset: { text: '重置', color: 'volcano' },
}

/** 业务模块 → 展示文案 / 标签色（覆盖后端 /admin/permissions/modules 返回的模块） */
const moduleMeta: Record<string, { text: string; color: string }> = {
  activity: { text: '活动管理', color: 'geekblue' },
  admin: { text: '管理员', color: 'orange' },
  consultation: { text: '咨询管理', color: 'cyan' },
  content: { text: '内容管理', color: 'lime' },
  dashboard: { text: '数据看板', color: 'blue' },
  institution: { text: '机构管理', color: 'green' },
  lead: { text: '线索管理', color: 'purple' },
  log: { text: '操作日志', color: 'default' },
  member: { text: '会员管理', color: 'magenta' },
  message: { text: '消息通知', color: 'gold' },
  order: { text: '订单/工单', color: 'cyan' },
  payment: { text: '支付配置', color: 'volcano' },
  reconciliation: { text: '财务对账', color: 'gold' },
  role: { text: '角色管理', color: 'purple' },
  service: { text: '服务项目', color: 'lime' },
  setting: { text: '系统设置', color: 'default' },
  staff: { text: '员工管理', color: 'blue' },
  user: { text: '用户管理', color: 'orange' },
}

const actionOptions = Object.keys(actionMeta).map((key) => ({
  label: actionMeta[key].text,
  value: key,
}))

const moduleOptions = Object.keys(moduleMeta).map((key) => ({
  label: moduleMeta[key].text,
  value: key,
}))

interface LogFilters {
  keyword: string
  action: string
  module: string
  range: [Dayjs | null, Dayjs | null] | null
}

const emptyFilters: LogFilters = { keyword: '', action: 'all', module: 'all', range: null }

const PAGE_SIZE = 10

export default function SystemLog() {
  const [rows, setRows] = useState<OperationLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [action, setAction] = useState('all')
  const [module, setModule] = useState('all')
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [applied, setApplied] = useState<LogFilters>(emptyFilters)
  const [page, setPage] = useState(1)

  /** 组装查询参数（筛选全部下推；时间范围按操作时间转 UTC 秒） */
  const buildParams = useCallback(
    (targetPage: number, filters: LogFilters) => ({
      page: targetPage,
      page_size: PAGE_SIZE,
      keyword: filters.keyword || undefined,
      action: filters.action === 'all' ? undefined : filters.action,
      module: filters.module === 'all' ? undefined : filters.module,
      start_time: filters.range?.[0] ? filters.range[0].startOf('day').unix() : undefined,
      end_time: filters.range?.[1] ? filters.range[1].endOf('day').unix() : undefined,
    }),
    [],
  )

  /** 拉取操作日志 */
  const fetchList = useCallback(
    async (targetPage: number, filters: LogFilters) => {
      setLoading(true)
      try {
        const res = await systemApi.getOperationLogs(buildParams(targetPage, filters))
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

  useEffect(() => {
    void fetchList(1, emptyFilters)
  }, [fetchList])

  const applyFilters = () => {
    const nextFilters: LogFilters = { keyword: keyword.trim(), action, module, range }
    setApplied(nextFilters)
    setPage(1)
    void fetchList(1, nextFilters)
  }

  const handleReset = () => {
    setKeyword('')
    setAction('all')
    setModule('all')
    setRange(null)
    setApplied(emptyFilters)
    setPage(1)
    void fetchList(1, emptyFilters)
  }

  const columns: ColumnsType<OperationLogItem> = [
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 130,
      render: (value: string) => value || '—',
    },
    {
      title: '业务模块',
      dataIndex: 'module',
      key: 'module',
      width: 150,
      render: (value: string) => {
        const meta = moduleMeta[value]
        return (
          <Tag variant="outlined" color={meta?.color ?? 'default'}>
            {meta?.text ?? value ?? '—'}
          </Tag>
        )
      },
    },
    {
      title: '动作',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (value: string) => {
        const meta = actionMeta[value]
        return <Tag color={meta?.color ?? 'default'}>{meta?.text ?? value ?? '—'}</Tag>
      },
    },
    {
      title: '操作对象',
      dataIndex: 'target',
      key: 'target',
      width: 160,
      render: (value: string) => value || '—',
    },
    {
      title: '请求参数',
      dataIndex: 'params',
      key: 'params',
      width: 110,
      render: (value: string) => {
        const formatted = formatParams(value)
        if (!formatted) return '—'
        return (
          <Popover
            trigger="click"
            placement="left"
            title="请求参数"
            content={<pre className="log-params">{formatted}</pre>}
          >
            <Button type="link" size="small">
              查看
            </Button>
          </Popover>
        )
      },
    },
    {
      title: 'IP 地址',
      dataIndex: 'ip',
      key: 'ip',
      width: 130,
      render: (value: string) => value || '—',
    },
    {
      title: '操作时间',
      key: 'operated_at',
      width: 170,
      render: (_, record) =>
        record.operated_at || formatDateTime((record.create_at ?? 0) * 1000),
    },
  ]

  return (
    <PageContainer fixed title="操作日志" description="查看系统操作记录，追踪每个管理员的审计动作">
      <div className="log-page">
        <Card variant="borderless" className="filter-bar log-page__filter">
          <Input
            allowClear
            placeholder="按操作人 / IP / 操作对象 / 请求地址搜索"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Select
            value={module}
            onChange={setModule}
            allowClear
            placeholder="业务模块"
            options={[{ label: '全部模块', value: 'all' }, ...moduleOptions]}
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

        <Card variant="borderless" className="list-card list-card--fill">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">操作记录</span>
            </div>
          </div>
          <FillTable<OperationLogItem>
            rowKey="id"
            size="small"
            loading={loading}
            columns={columns}
            dataSource={rows}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total,
              showSizeChanger: false,
              showTotal: (t) => `共 ${t} 条`,
              onChange: (nextPage) => {
                setPage(nextPage)
                void fetchList(nextPage, applied)
              },
            }}
          />
        </Card>
      </div>
    </PageContainer>
  )
}
