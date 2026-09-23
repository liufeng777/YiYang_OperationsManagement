/**
 * 财务对账 - 账单汇总列表
 * 数据来源：financeApi.getReconciliations（分页 + 对账类型 / 状态 / 对账日期范围筛选）
 * 顶部统计：各状态各取 1 条取 total（与退款列表同一轻量方案）
 * 金额单位：后端返回「分」，展示统一换算为「元」
 * 入口：列表「查看详情」进入对账详情页（detail_lines 仅在详情页展示）
 */
import { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, DatePicker, Select } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { Dayjs } from 'dayjs'
import PageContainer from '@/components/PageContainer'
import { financeApi } from '@/api'
import type { ReconcileItem } from '@/api/modules/finance'
import { formatAmount, formatDateTime } from '@/utils'
import './index.less'

/** 对账状态（共通 §6.4）：1-对账中 2-已平账 3-有差异 */
const RECONCILE_STATUS_TEXT: Record<number, string> = {
  1: '对账中',
  2: '已平账',
  3: '有差异',
}

/** 对账类型：契约未给出枚举，先按常见周期映射，未命中时回显原始值 */
const RECONCILE_TYPE_TEXT: Record<number, string> = {
  1: '日对账',
  2: '周对账',
  3: '月对账',
}

/** 分 → 元 */
const fenToYuan = (fen?: number) => (fen ?? 0) / 100

const PAGE_SIZE = 10

interface ReconcileFilters {
  reconciliation_type: number | null
  status: number | null
  range: [Dayjs, Dayjs] | null
}

const emptyFilters: ReconcileFilters = {
  reconciliation_type: null,
  status: null,
  range: null,
}

export default function ReconcileList() {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const [rows, setRows] = useState<ReconcileItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  /** 顶部统计：全部 / 对账中 / 已平账 / 有差异 */
  const [stats, setStats] = useState({ all: 0, checking: 0, balanced: 0, diff: 0 })

  const [type, setType] = useState<number | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [applied, setApplied] = useState<ReconcileFilters>(emptyFilters)

  /** 组装查询参数（对账日期范围格式化为 YYYY-MM-DD 字符串） */
  const buildParams = useCallback(
    (targetPage: number, filters: ReconcileFilters) => ({
      page: targetPage,
      page_size: PAGE_SIZE,
      reconciliation_type: filters.reconciliation_type ?? undefined,
      status: filters.status ?? undefined,
      start_date: filters.range?.[0] ? filters.range[0].format('YYYY-MM-DD') : undefined,
      end_date: filters.range?.[1] ? filters.range[1].format('YYYY-MM-DD') : undefined,
    }),
    [],
  )

  /** 拉取对账单列表 */
  const fetchList = useCallback(
    async (targetPage: number, filters: ReconcileFilters) => {
      setLoading(true)
      try {
        const res = await financeApi.getReconciliations(buildParams(targetPage, filters))
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

  /** 顶部统计：各状态各取 1 条拿 total */
  const fetchStats = useCallback(async () => {
    try {
      const [all, checking, balanced, diff] = await Promise.all([
        financeApi.getReconciliations({ page: 1, page_size: 1 }),
        financeApi.getReconciliations({ page: 1, page_size: 1, status: 1 }),
        financeApi.getReconciliations({ page: 1, page_size: 1, status: 2 }),
        financeApi.getReconciliations({ page: 1, page_size: 1, status: 3 }),
      ])
      setStats({
        all: all.total ?? 0,
        checking: checking.total ?? 0,
        balanced: balanced.total ?? 0,
        diff: diff.total ?? 0,
      })
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    }
  }, [])

  useEffect(() => {
    void fetchStats()
  }, [fetchStats])

  const applyFilters = () => {
    const nextFilters: ReconcileFilters = { reconciliation_type: type, status, range }
    setApplied(nextFilters)
    setPage(1)
    void fetchList(1, nextFilters)
  }

  const handleReset = () => {
    setType(null)
    setStatus(null)
    setRange(null)
    setApplied(emptyFilters)
    setPage(1)
    void fetchList(1, emptyFilters)
  }

  /** 平账：对账中 / 有差异的单据可标记平账 */
  const handleFinish = (record: ReconcileItem) => {
    modal.confirm({
      title: '确认平账',
      content: `确认将 ${record.report_no}（${record.channel_name || record.channel_code}）标记为已平账？平账后单据状态不可回退。`,
      okText: '确认平账',
      cancelText: '取消',
      onOk: async () => {
        try {
          await financeApi.finishReconciliation(Number(record.id))
          message.success('该对账单已平账')
          void fetchList(page, applied)
          void fetchStats()
        } catch {
          /* 错误提示由 request 拦截器统一处理 */
        }
      },
    })
  }

  const columns: ColumnsType<ReconcileItem> = [
    {
      title: '对账批次 / 周期',
      key: 'report_no',
      render: (_, record) => (
        <div className="reconcile-no">
          <strong>{record.report_no}</strong>
          <span>
            {record.start_date ? formatDateTime(record.start_date * 1000, 'YYYY-MM-DD') : '—'} ~{' '}
            {record.end_date ? formatDateTime(record.end_date * 1000, 'YYYY-MM-DD') : '—'}
          </span>
        </div>
      ),
    },
    {
      title: '支付渠道',
      key: 'channel',
      width: 120,
      render: (_, record) => (
        <span className="channel-pill">{record.channel_name || record.channel_code || '—'}</span>
      ),
    },
    {
      title: '对账类型',
      key: 'reconciliation_type',
      width: 100,
      render: (_, record) =>
        RECONCILE_TYPE_TEXT[record.reconciliation_type] ?? record.reconciliation_type ?? '—',
    },
    {
      title: '平台金额',
      key: 'platform_amount',
      width: 120,
      align: 'right',
      render: (_, record) => formatAmount(fenToYuan(record.platform_amount)),
    },
    {
      title: '渠道金额',
      key: 'channel_amount',
      width: 120,
      align: 'right',
      render: (_, record) => formatAmount(fenToYuan(record.channel_amount)),
    },
    {
      title: '差异金额',
      key: 'diff_amount',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <span className={record.diff_amount ? 'diff-amount' : ''}>
          {formatAmount(fenToYuan(record.diff_amount))}
        </span>
      ),
    },
    {
      title: '平台 / 渠道笔数',
      key: 'counts',
      width: 130,
      render: (_, record) => `${record.platform_count} / ${record.channel_count}`,
    },
    {
      title: '对账状态',
      key: 'status',
      width: 100,
      render: (_, record) => (
        <span className={`reconcile-status reconcile-status--${record.status}`}>
          {RECONCILE_STATUS_TEXT[record.status] ?? '—'}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/finance/detail/${record.id}`)}
          >
            查看详情
          </Button>
          {record.status !== 2 && (
            <Button type="link" size="small" onClick={() => handleFinish(record)}>
              平账
            </Button>
          )}
        </>
      ),
    },
  ]

  const metrics = [
    { key: 'all', label: '全部账单', value: stats.all, note: '当前系统全部对账单', tone: 'success' },
    { key: 'checking', label: '对账中', value: stats.checking, note: '等待核对完成', tone: 'warning' },
    { key: 'balanced', label: '已平账', value: stats.balanced, note: '平台与渠道金额一致', tone: 'info' },
    { key: 'diff', label: '有差异', value: stats.diff, note: '存在金额或笔数差异', tone: 'danger' },
  ]

  return (
    <PageContainer
      fixed
      title="账单汇总"
      description="按支付渠道与周期汇总平台与渠道的收款差异，差异明细见对账详情"
    >
      <div className="reconcile-list">
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

        <Card variant="borderless" className="filter-bar reconcile-list__filter">
          <Select
            value={type}
            onChange={(value) => setType(value ?? null)}
            options={Object.entries(RECONCILE_TYPE_TEXT).map(([key, label]) => ({
              label,
              value: Number(key),
            }))}
            allowClear
            placeholder="对账类型"
          />
          <Select
            value={status}
            onChange={(value) => setStatus(value ?? null)}
            options={Object.entries(RECONCILE_STATUS_TEXT).map(([key, label]) => ({
              label,
              value: Number(key),
            }))}
            allowClear
            placeholder="对账状态"
          />
          <DatePicker.RangePicker
            value={range}
            onChange={(value) => setRange(value as [Dayjs, Dayjs] | null)}
            placeholder={['对账开始日期', '对账结束日期']}
          />
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={applyFilters}>
            查询
          </Button>
        </Card>

        <Card variant="borderless" className="list-card list-card--fill">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">账单汇总</span>
            </div>
          </div>
          <FillTable<ReconcileItem>
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
    </PageContainer>
  )
}
