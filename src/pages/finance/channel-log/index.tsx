/**
 * 财务对账 - 渠道流水
 * 数据来源：financeApi.getPaymentChannelLogs（分页 + 状态 / 交易时间范围筛选）
 * 金额单位：后端返回「分」，展示统一换算为「元」
 * 说明：渠道枚举契约未给出，筛选仅提供状态与时间；关键字由当前页本地兜底过滤
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, DatePicker, Input, Select } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import PageContainer from '@/components/PageContainer'
import { financeApi } from '@/api'
import type { PaymentChannelLog } from '@/api/modules/finance'
import { formatAmount, formatDateTime } from '@/utils'
import './index.less'

/** 流水状态：契约未给出枚举，先按常见交易状态映射，未命中时回显原始值 */
const LOG_STATUS_TEXT: Record<number, string> = {
  1: '交易成功',
  2: '已退款',
  3: '交易失败',
}

/** 分 → 元 */
const fenToYuan = (fen?: number) => (fen ?? 0) / 100

const PAGE_SIZE = 10

interface ChannelLogFilters {
  status: number | null
  range: [Dayjs, Dayjs] | null
}

const emptyFilters: ChannelLogFilters = {
  status: null,
  range: null,
}

export default function ChannelLogList() {
  const [rows, setRows] = useState<PaymentChannelLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)

  const [status, setStatus] = useState<number | null>(null)
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [applied, setApplied] = useState<ChannelLogFilters>(emptyFilters)
  /** 关键字：后端未提供筛选参数，当前页本地兜底过滤（渠道流水号 / 关联订单ID） */
  const [keyword, setKeyword] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')

  /** 组装查询参数（交易时间范围按秒时间戳下推，与退款列表一致） */
  const buildParams = useCallback(
    (targetPage: number, filters: ChannelLogFilters, size: number = PAGE_SIZE) => ({
      page: targetPage,
      page_size: size,
      status: filters.status ?? undefined,
      start_time: filters.range?.[0] ? filters.range[0].startOf('day').unix() : undefined,
      end_time: filters.range?.[1] ? filters.range[1].endOf('day').unix() : undefined,
    }),
    [],
  )

  /** 拉取渠道流水列表 */
  const fetchList = useCallback(
    async (targetPage: number, filters: ChannelLogFilters, size: number = PAGE_SIZE) => {
      setLoading(true)
      try {
        const res = await financeApi.getPaymentChannelLogs(buildParams(targetPage, filters, size))
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
    const nextFilters: ChannelLogFilters = { status, range }
    setApplied(nextFilters)
    setAppliedKeyword(keyword.trim())
    setPage(1)
    void fetchList(1, nextFilters)
  }

  const handleReset = () => {
    setStatus(null)
    setRange(null)
    setKeyword('')
    setApplied(emptyFilters)
    setAppliedKeyword('')
    setPage(1)
    void fetchList(1, emptyFilters)
  }

  const statusText = (value?: number) =>
    value == null ? '—' : (LOG_STATUS_TEXT[value] ?? value)

  /** 当前页兜底过滤：关键字匹配渠道流水号 / 关联订单ID（后端未提供该筛选参数） */
  const filteredRows = useMemo(() => {
    const kw = appliedKeyword.trim()
    if (!kw) return rows
    const lower = kw.toLowerCase()
    return rows.filter(
      (item) =>
        (item.channel_trade_no ?? '').toLowerCase().includes(lower) ||
        String(item.order_id ?? '').includes(kw),
    )
  }, [appliedKeyword, rows])

  const columns: ColumnsType<PaymentChannelLog> = [
    {
      title: '渠道流水号',
      dataIndex: 'channel_trade_no',
      key: 'channel_trade_no',
      ellipsis: true,
      render: (value?: string) => value || '—',
    },
    {
      title: '渠道',
      dataIndex: 'channel_code',
      key: 'channel_code',
      width: 110,
      render: (value?: string) => (value ? <span className="channel-pill">{value}</span> : '—'),
    },
    {
      title: '关联订单',
      key: 'order',
      width: 140,
      render: (_, record) => (
        <div className="channel-log-order">
          <strong>订单ID {record.order_id ?? '—'}</strong>
          <span>订单类型 {record.order_type ?? '—'}</span>
        </div>
      ),
    },
    {
      title: '交易金额',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (_, record) => formatAmount(fenToYuan(record.amount)),
    },
    {
      title: '手续费',
      key: 'transaction_fee',
      width: 100,
      align: 'right',
      render: (_, record) => formatAmount(fenToYuan(record.transaction_fee)),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, record) => (
        <span className={`channel-log-status channel-log-status--${record.status}`}>
          {statusText(record.status)}
        </span>
      ),
    },
    {
      title: '对账时间',
      key: 'matched_at',
      width: 150,
      render: (_, record) =>
        record.matched_at ? formatDateTime(record.matched_at * 1000, 'YYYY-MM-DD HH:mm') : '—',
    },
    {
      title: '创建时间',
      key: 'created_at',
      width: 150,
      render: (_, record) =>
        record.created_at ? formatDateTime(record.created_at * 1000, 'YYYY-MM-DD HH:mm') : '—',
    },
  ]

  return (
    <PageContainer
      fixed
      title="渠道流水"
      description="查看支付渠道侧的交易流水，用于与平台账单核对（只读）"
    >
      <div className="channel-log">
        <Card variant="borderless" className="filter-bar channel-log__filter">
          <Input
            allowClear
            placeholder="渠道流水号 / 关联订单ID"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Select
            value={status}
            onChange={(value) => setStatus(value ?? null)}
            options={Object.entries(LOG_STATUS_TEXT).map(([key, label]) => ({
              label,
              value: Number(key),
            }))}
            allowClear
            placeholder="交易状态"
          />
          <DatePicker.RangePicker
            value={range}
            onChange={(value) => setRange(value as [Dayjs, Dayjs] | null)}
            placeholder={['交易开始日期', '交易结束日期']}
          />
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={applyFilters}>
            查询
          </Button>
        </Card>

        <Card variant="borderless" className="list-card list-card--fill">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">渠道流水</span>
            </div>
          </div>
          <FillTable<PaymentChannelLog>
            rowKey="id"
            size="small"
            loading={loading}
            columns={columns}
            dataSource={filteredRows}
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
