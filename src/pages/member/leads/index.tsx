/**
 * 会员管理 - 线索管理
 * 数据来源：leadApi.getLeads（分页 + 来源/状态/机构/优先级筛选）
 * 视觉对齐设计稿：顶部统计卡 + 筛选 + 运营线索列表 + 线索详情 Drawer（指定服务机构）
 * 状态枚举（共通 §6.5）：1-新线索 2-已联系 3-有意向 4-洽谈中 5-已转化 6-已流失 9-已忽略
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Input, Select, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import { leadApi } from '@/api'
import type { LeadDTO } from '@/api/modules/lead'
import { formatDateTime } from '@/utils'
import LeadDetailDrawer from './components/LeadDetailDrawer'
import { LEAD_PRIORITY_TEXT, LEAD_SOURCE_TEXT, LEAD_STATUS_TEXT } from './constants'
import './index.less'

const PAGE_SIZE = 10

interface LeadFilters {
  status: number | null
  source_type: number | null
}

const emptyFilters: LeadFilters = {
  status: null,
  source_type: null,
}

export default function LeadList() {
  const [rows, setRows] = useState<LeadDTO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  /** 顶部统计：全部 / 新线索(待指定) / 有意向 / 已转化 */
  const [stats, setStats] = useState({ all: 0, fresh: 0, intent: 0, converted: 0 })

  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<number | null>(null)
  const [sourceType, setSourceType] = useState<number | null>(null)
  const [applied, setApplied] = useState<LeadFilters>(emptyFilters)
  const [appliedKeyword, setAppliedKeyword] = useState('')
  /** 线索详情 Drawer：当前查看的线索 id */
  const [activeLeadId, setActiveLeadId] = useState<number | null>(null)

  /** 拉取线索列表 */
  const fetchList = useCallback(async (targetPage: number, filters: LeadFilters) => {
    setLoading(true)
    try {
      const res = await leadApi.getLeads({
        page: targetPage,
        page_size: PAGE_SIZE,
        status: (filters.status ?? undefined) as LeadDTO['status'] | undefined,
        source_type: filters.source_type ?? undefined,
      })
      setRows(res.list ?? [])
      setTotal(res.total ?? 0)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  /** 顶部统计：各状态各取 1 条拿 total */
  const fetchStats = useCallback(async () => {
    try {
      const [all, fresh, intent, converted] = await Promise.all([
        leadApi.getLeads({ page: 1, page_size: 1 }),
        leadApi.getLeads({ page: 1, page_size: 1, status: 1 }),
        leadApi.getLeads({ page: 1, page_size: 1, status: 3 }),
        leadApi.getLeads({ page: 1, page_size: 1, status: 5 }),
      ])
      setStats({
        all: all.total ?? 0,
        fresh: fresh.total ?? 0,
        intent: intent.total ?? 0,
        converted: converted.total ?? 0,
      })
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    }
  }, [])

  useEffect(() => {
    void fetchList(1, emptyFilters)
    void fetchStats()
  }, [fetchList, fetchStats])

  const applyFilters = () => {
    const nextFilters: LeadFilters = { status, source_type: sourceType }
    setApplied(nextFilters)
    setAppliedKeyword(keyword.trim())
    setPage(1)
    void fetchList(1, nextFilters)
  }

  const handleReset = () => {
    setKeyword('')
    setStatus(null)
    setSourceType(null)
    setApplied(emptyFilters)
    setAppliedKeyword('')
    setPage(1)
    void fetchList(1, emptyFilters)
  }

  /** 当前页兜底过滤：关键字匹配联系人 / 手机号（后端未提供该筛选参数） */
  const filteredRows = useMemo(() => {
    const kw = appliedKeyword.trim()
    if (!kw) return rows
    return rows.filter(
      (item) =>
        (item.contact_name ?? '').includes(kw) || (item.contact_phone ?? '').includes(kw),
    )
  }, [appliedKeyword, rows])

  const columns: ColumnsType<LeadDTO> = [
    {
      title: '联系人',
      key: 'contact',
      width: 150,
      render: (_, record) => (
        <div className="lead-contact">
          <strong>{record.contact_name}</strong>
          <span>{record.contact_phone || '—'}</span>
        </div>
      ),
    },
    {
      title: '意向服务',
      dataIndex: 'demand_detail',
      key: 'demand_detail',
      ellipsis: true,
      render: (value?: string) => value || '—',
    },
    {
      title: '线索来源',
      key: 'source_type',
      width: 100,
      render: (_, record) => LEAD_SOURCE_TEXT[record.source_type] ?? record.source_type ?? '—',
    },
    {
      title: '负责人',
      key: 'owner',
      width: 110,
      render: (_, record) => record.owner_staff_name || <span className="lead-owner--empty">待指定</span>,
    },
    {
      title: '优先级',
      key: 'priority',
      width: 80,
      render: (_, record) => LEAD_PRIORITY_TEXT[record.priority] ?? record.priority ?? '—',
    },
    {
      title: '线索状态',
      key: 'status',
      width: 100,
      render: (_, record) => (
        <span className={`lead-status lead-status--${record.status}`}>
          {LEAD_STATUS_TEXT[record.status] ?? record.status}
        </span>
      ),
    },
    {
      title: '创建时间',
      key: 'created_at',
      width: 150,
      render: (_, record) =>
        record.created_at ? formatDateTime(record.created_at * 1000, 'YYYY-MM-DD HH:mm') : '—',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => setActiveLeadId(record.id)}>
          详情
        </Button>
      ),
    },
  ]

  const metrics = [
    { key: 'all', label: '全部线索', value: stats.all, note: '运营线索总量', tone: 'success' },
    { key: 'fresh', label: '待指定', value: stats.fresh, note: '新线索待分配负责人', tone: 'warning' },
    { key: 'intent', label: '有意向', value: stats.intent, note: '已有明确服务意向', tone: 'info' },
    { key: 'converted', label: '已转化', value: stats.converted, note: '已转化为注册会员', tone: 'success' },
  ]

  return (
    <PageContainer
      title="线索管理"
      description="客服指定机构，健管师跟进；运营查看业务进度与转化结果"
    >
      <div className="lead-list">
        <div className="metric-cards">
          {metrics.map((metric) => (
            <Card variant="borderless" className="metric-card" key={metric.key}>
              <div className="metric-card__head">
                <span className="metric-card__label">{metric.label}</span>
                <i className={`metric-card__icon status--${metric.tone}`}>
                  <BarChartOutlined />
                </i>
              </div>
              <strong className="metric-card__value">{metric.value}</strong>
              <em className={`metric-card__note status--${metric.tone}`}>{metric.note}</em>
            </Card>
          ))}
        </div>

        <Card variant="borderless" className="filter-bar lead-list__filter">
          <Input
            allowClear
            placeholder="联系人 / 手机号"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Select
            value={status}
            onChange={(value) => setStatus(value ?? null)}
            options={Object.entries(LEAD_STATUS_TEXT).map(([key, label]) => ({
              label,
              value: Number(key),
            }))}
            allowClear
            placeholder="全部线索状态"
          />
          <Select
            value={sourceType}
            onChange={(value) => setSourceType(value ?? null)}
            options={Object.entries(LEAD_SOURCE_TEXT).map(([key, label]) => ({
              label,
              value: Number(key),
            }))}
            allowClear
            placeholder="全部线索来源"
          />
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={applyFilters}>
            查询
          </Button>
        </Card>

        <Card variant="borderless" className="list-card">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">运营线索列表</span>
              <span className="list-card__header__tips">
                共 {stats.all} 条线索 · 待指定 {stats.fresh} 条
                {appliedKeyword.trim() ? ` · 当前页过滤“${appliedKeyword.trim()}”` : ''}
              </span>
            </div>
          </div>
          <Table<LeadDTO>
            rowKey="id"
            size="small"
            loading={loading}
            columns={columns}
            dataSource={filteredRows}
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

      <LeadDetailDrawer
        leadId={activeLeadId}
        open={activeLeadId != null}
        onClose={() => setActiveLeadId(null)}
        onChanged={() => {
          void fetchList(page, applied)
          void fetchStats()
        }}
      />
    </PageContainer>
  )
}
