/**
 * 系统设置 - 操作日志
 * 数据来源：systemApi.getOperationLogs
 * 字段按后端实测：operator / module / action / target / params / path / ip / operated_at / create_at / error_message
 * 各列按后端返回值原样展示（模块 / 动作等不做中文映射，仅用标签色区分）
 * 筛选：关键字 / 模块 / 动作 / 时间范围全部下推后端（前端不做本地过滤）
 * 请求参数：JSON 字符串，列内以「查看」按钮触发 Popover 展示格式化后的 JSON
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, DatePicker, Divider, Input, Popover, Select, Space, Tag } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
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

/** 操作动作 → 标签色（动作值按后端原值展示，不做中文映射） */
const actionColor: Record<string, string> = {
  create: 'blue',
  update: 'cyan',
  delete: 'red',
  login: 'green',
  logout: 'default',
  export: 'geekblue',
  import: 'geekblue',
  review: 'orange',
  dispatch: 'purple',
  run: 'magenta',
  publish: 'green',
  offline: 'default',
  assign: 'gold',
  reset: 'volcano',
}

/** 业务模块 → 标签色（模块值按后端原值展示，不做中文映射） */
const moduleColor: Record<string, string> = {
  activity: 'geekblue',
  admin: 'orange',
  consultation: 'cyan',
  content: 'lime',
  dashboard: 'blue',
  institution: 'green',
  lead: 'purple',
  log: 'default',
  member: 'magenta',
  message: 'gold',
  order: 'cyan',
  payment: 'volcano',
  reconciliation: 'gold',
  role: 'purple',
  service: 'lime',
  setting: 'default',
  staff: 'blue',
  user: 'orange',
}

const actionOptions = Object.keys(actionColor).map((key) => ({ label: key, value: key }))

const moduleOptions = Object.keys(moduleColor).map((key) => ({ label: key, value: key }))

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
  const [pageSize, setPageSize] = useState(PAGE_SIZE)

  /** 组装查询参数：模块（resource）/ 动作 / 时间范围下推后端（swagger 无 keyword 参数，关键字当前页本地过滤） */
  const buildParams = useCallback(
    (targetPage: number, filters: LogFilters, size: number = PAGE_SIZE) => ({
      page: targetPage,
      page_size: size,
      action: filters.action === 'all' ? undefined : filters.action,
      resource: filters.module === 'all' ? undefined : filters.module,
      start_time: filters.range?.[0] ? filters.range[0].startOf('day').unix() : undefined,
      end_time: filters.range?.[1] ? filters.range[1].endOf('day').unix() : undefined,
    }),
    [],
  )

  /** 拉取操作日志 */
  const fetchList = useCallback(
    async (targetPage: number, filters: LogFilters, size: number = PAGE_SIZE) => {
      setLoading(true)
      try {
        const res = await systemApi.getOperationLogs(buildParams(targetPage, filters, size))
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
    void fetchList(1, emptyFilters, pageSize)
  }, [fetchList])

  const applyFilters = () => {
    const nextFilters: LogFilters = { keyword: keyword.trim(), action, module, range }
    setApplied(nextFilters)
    setPage(1)
    void fetchList(1, nextFilters, pageSize)
  }

  const handleReset = () => {
    setKeyword('')
    setAction('all')
    setModule('all')
    setRange(null)
    setApplied(emptyFilters)
    setPage(1)
    void fetchList(1, emptyFilters, pageSize)
  }

  /** 关键字后端未提供查询参数，对当前页结果本地过滤（操作人 / IP / 操作对象 / 请求地址） */
  const filteredRows = useMemo(() => {
    const kw = applied.keyword
    if (!kw) return rows
    return rows.filter(
      (r) =>
        (r.operator ?? '').includes(kw) ||
        (r.ip ?? '').includes(kw) ||
        (r.target ?? '').includes(kw) ||
        (r.path ?? '').includes(kw),
    )
  }, [rows, applied.keyword])

  const columns: ColumnsType<OperationLogItem> = [
    {
      title: '操作人 / 时间',
      dataIndex: 'operator',
      key: 'operator',
      width: 150,
      render: (value: string, record) => (
        <div className='table-cell'>
          <strong>{value}</strong>
          <span>{record.operated_at || formatDateTime((record.create_at ?? 0) * 1000)}</span>
        </div>
      ),
    },
    {
      title: '操作行为',
      dataIndex: 'action',
      key: 'action',
      render: (value: string) => <div>
        {value ? <Tag variant="outlined" color={'purple'}>{value}</Tag> : '—'}
      </div>
    },
    {
      title: '操作资源 | 资源ID',
      dataIndex: 'module',
      key: 'module',
      render: (value: string, record) => <div>
        {value ? <Tag variant="outlined" color={'geekblue'}>{value}</Tag> : '—'}
        <Divider type="vertical" />
        {record.id ? (<Tag variant="outlined" color={'default'}>{record.id}</Tag>) : ('—')}
      </div>
    },
    {
      title: '请求参数',
      dataIndex: 'params',
      key: 'params',
      width: 100,
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
      width: 140,
      render: (value: string) => value || '—',
    },
    {
      title: '错误信息',
      dataIndex: 'error_message',
      key: 'error_message',
      width: 120,
      ellipsis: true,
      render: (value: string) => value || '—'
    }
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
            <Button onClick={handleReset}>
              重置
            </Button>
            <Button type="primary" onClick={applyFilters}>
              查询
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
            dataSource={filteredRows}
            pagination={{
              current: page,
              pageSize,
              total,
              showTotal: (t) => `共 ${t} 条`,
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPage)
                setPageSize(nextPageSize)
                void fetchList(nextPage, applied, nextPageSize)
              },
            }}
          />
        </Card>
      </div>
    </PageContainer>
  )
}
