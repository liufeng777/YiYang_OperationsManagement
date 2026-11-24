/**
 * 财务对账 - 账单汇总列表
 * 数据来源：financeApi.getReconciliations（分页 + 对账类型 / 状态 / 对账日期范围筛选）
 * 金额单位：后端 DECIMAL 以字符串返回，单位为元，直接格式化展示
 * 入口：列表「查看详情」进入对账详情页；支持按当前类型 / 状态筛选导出 CSV
 */
import { useCallback, useEffect, useState, useMemo } from 'react'
import { App, Button, Card, DatePicker, Select } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined, DownloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs, { type Dayjs } from 'dayjs'
import PageContainer from '@/components/PageContainer'
import { financeApi } from '@/api'
import type { ReconcileItem } from '@/api/modules/finance'
import { downloadBlob, formatAmount, formatDateTime } from '@/utils'
import './index.less'

/** 对账状态：1-对账中 2-已平账 3-有差异 */
const RECONCILE_STATUS_TEXT: Record<number, string> = {
  1: '对账中',
  2: '已平账',
  3: '有差异',
}

/** 对账类型：1-日结 2-周结 3-月结 */
const RECONCILE_TYPE_TEXT: Record<number, string> = {
  1: '日结',
  2: '周结',
  3: '月结',
}

/** 支付渠道：列表仅返回 channel_type，不再依赖旧版渠道名称字段 */
const CHANNEL_TYPE_TEXT: Record<number, string> = {
  1: '微信支付',
  2: '支付宝',
  3: '银联',
  9: '其他',
}

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
  const [exporting, setExporting] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  /** 顶部统计：全部 / 对账中 / 已平账 / 有差异 */
  const [stats, setStats] = useState<any>(null)

  const [type, setType] = useState<number | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [applied, setApplied] = useState<ReconcileFilters>(emptyFilters)

  /** 组装查询参数（对账日期范围格式化为 YYYY-MM-DD 字符串） */
  const buildParams = useCallback(
    (targetPage: number, filters: ReconcileFilters, size: number = PAGE_SIZE) => ({
      page: targetPage,
      page_size: size,
      reconciliation_type: filters.reconciliation_type ?? undefined,
      status: filters.status ?? undefined,
      start_date: filters.range?.[0] ? filters.range[0].format('YYYY-MM-DD') : undefined,
      end_date: filters.range?.[1] ? filters.range[1].format('YYYY-MM-DD') : undefined,
    }),
    [],
  )

  /** 拉取对账单列表；接口未返回 total / stats 时使用当前列表长度并隐藏统计值 */
  const fetchList = useCallback(
    async (targetPage: number, filters: ReconcileFilters, size: number = PAGE_SIZE) => {
      setLoading(true)
      try {
        const res = await financeApi.getReconciliations(buildParams(targetPage, filters, size))
        const list = res.list ?? []
        setRows(list)
        setTotal(res.total ?? list.length)
        setStats(res.stats ?? null)
      } catch {
        /* 错误提示由 request 拦截器统一处理 */
        setRows([])
        setTotal(0)
        setStats(null)
      } finally {
        setLoading(false)
      }
    },
    [buildParams],
  )

  useEffect(() => {
    void fetchList(1, emptyFilters, pageSize)
  }, [fetchList])

  const changeStatus = (nextStatus: number | null) => {
    setStatus(nextStatus)
    const nextFilters: ReconcileFilters = { ...applied, status: nextStatus }
    setApplied(nextFilters)
    setPage(1)
    void fetchList(1, nextFilters, pageSize)
  }

  const applyFilters = () => {
    const nextFilters: ReconcileFilters = { reconciliation_type: type, status, range }
    setApplied(nextFilters)
    setPage(1)
    void fetchList(1, nextFilters, pageSize)
  }

  const handleReset = () => {
    setType(null)
    setStatus(null)
    setRange(null)
    setApplied(emptyFilters)
    setPage(1)
    void fetchList(1, emptyFilters, pageSize)
  }

  /** 按已生效的对账类型与状态筛选导出 CSV */
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await financeApi.exportReconciliations({
        reconciliation_type: applied.reconciliation_type ?? undefined,
        status: applied.status ?? undefined,
      })
      if (!res.data || res.data.size === 0) {
        message.warning('导出内容为空')
        return
      }
      const disposition = String(res.headers?.['content-disposition'] ?? '')
      const matched = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i)
      const filename = matched?.[1]
        ? decodeURIComponent(matched[1])
        : `账单汇总_${dayjs().format('YYYYMMDDHHmmss')}.csv`
      downloadBlob(res.data, filename)
      message.success('导出成功，已开始下载')
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setExporting(false)
    }
  }

  /** 平账：对账中 / 有差异的单据可标记平账 */
  const handleFinish = (record: ReconcileItem) => {
    modal.confirm({
      title: '确认平账',
      content: `确认将 ${record.rec_no} 标记为已平账？平账后单据状态不可回退。`,
      okText: '确认平账',
      cancelText: '取消',
      onOk: async () => {
        try {
          await financeApi.finishReconciliation(record.reconcile_id)
          message.success('该对账单已平账')
          void fetchList(page, applied, pageSize)
        } catch {
          /* 错误提示由 request 拦截器统一处理 */
        }
      },
    })
  }

  const columns: ColumnsType<ReconcileItem> = [
    {
      title: '对账批次 / 周期',
      key: 'rec_no',
      render: (_, record) => (
        <div className="reconcile-no">
          <strong>{record.rec_no}</strong>
          <span>
            {formatDateTime(record.start_date, 'YYYY-MM-DD')} ~{' '}
            {formatDateTime(record.end_date, 'YYYY-MM-DD')}
          </span>
        </div>
      ),
    },
    // {
    //   title: '支付渠道',
    //   key: 'channel_type',
    //   width: 110,
    //   render: (_, record) => (
    //     <span className="channel-pill">{CHANNEL_TYPE_TEXT[record.channel_type] ?? '—'}</span>
    //   ),
    // },
    {
      title: '对账类型',
      key: 'reconciliation_type',
      width: 100,
      align: 'center',
      render: (_, record) => <span className="channel-pill">{
        RECONCILE_TYPE_TEXT[record.reconciliation_type] ?? record.reconciliation_type ?? '—'}</span>
    },
    {
      title: '账单金额',
      key: 'amount',
      align: 'right',
      render: (_, record) => formatAmount(record.amount),
    },
    {
      title: '平台金额',
      key: 'platform_amount',
      align: 'right',
      render: (_, record) => formatAmount(record.platform_amount),
    },
    {
      title: '渠道金额',
      key: 'channel_amount',
      align: 'right',
      render: (_, record) => formatAmount(record.channel_amount),
    },
    {
      title: '差异笔数',
      key: 'diff_count',
      align: 'center',
      width: 100,
      render: (_, record) => (
        <span className={record.diff_count > 0 ? 'diff-amount' : ''}>
          {record.diff_count ?? 0} 笔
        </span>
      ),
    },
    {
      title: '平台 / 渠道笔数',
      key: 'counts',
      align: 'center',
      width: 120,
      render: (_, record) => `${record.platform_count} / ${record.channel_count}`,
    },
    {
      title: '对账状态',
      key: 'status',
      width: 100,
      align: 'center',
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
            onClick={() => navigate(`/finance/summary/${record.reconcile_id}`)}
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

  const metrics = useMemo(() => {
    return [
      { key: 'all', status: null, label: '全部账单', value: stats?.total ?? total, note: '当前系统全部对账单', tone: 'success' },
      { key: 'checking', status: 1, label: '对账中', value: stats?.reconciling ?? '—', note: '等待核对完成', tone: 'warning' },
      { key: 'balanced', status: 2, label: '已平账', value: stats?.balanced ?? '—', note: '平台与渠道金额一致', tone: 'info' },
      { key: 'diff', status: 3, label: '有差异', value: stats?.diff ?? '—', note: '存在金额或笔数差异', tone: 'danger' },
    ]
  }, [stats, total])


  return (
    <PageContainer
      fixed
      title="账单汇总"
      description="按支付渠道与周期汇总平台与渠道的收款差异，差异明细见对账详情"
    >
      <div className="reconcile-list">
        <div className="metric-cards">
          {metrics.map((metric) => (
            <Card
              variant="borderless"
              className={`metric-card metric-card--clickable${applied.status === metric.status ? ' is-active' : ''}`}
              key={metric.key}
              role="button"
              tabIndex={0}
              onClick={() => changeStatus(metric.status)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  changeStatus(metric.status)
                }
              }}
            >
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
            onChange={(value) => changeStatus(value ?? null)}
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
            <Button
              icon={<DownloadOutlined />}
              loading={exporting}
              onClick={handleExport}
            >
              导出 CSV
            </Button>
          </div>
          <FillTable<ReconcileItem>
            rowKey="reconcile_id"
            size="small"
            loading={loading}
            columns={columns}
            dataSource={rows}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPage)
                setPageSize(nextPageSize)
                void fetchList(nextPage, applied, nextPageSize)
              },
              showTotal: (count) => `共 ${count} 条`,
            }}
          />
        </Card>
      </div>
    </PageContainer>
  )
}
