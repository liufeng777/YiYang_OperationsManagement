/**
 * 财务对账 - 渠道流水
 * 数据来源：financeApi.getPaymentChannelLogs
 * 支持渠道、交易状态、匹配状态及支付时间范围筛选；金额单位为元
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, DatePicker, Input, Select } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import { financeApi } from '@/api'
import type { PaymentChannelLog } from '@/api/modules/finance'
import { formatAmount, formatDateTime } from '@/utils'
import {
  CHANNEL_LOG_STATUS_TEXT,
  CHANNEL_LOG_STATUS_TONE,
  CHANNEL_TYPE_TEXT,
  MATCH_STATUS_TEXT,
  ORDER_TYPE_TEXT,
} from './constants'
import './index.less'

const PAGE_SIZE = 10

interface ChannelLogFilters {
  channelType: number | null
  status: number | null
  matchStatus: number | null
  range: [Dayjs, Dayjs] | null
}

const emptyFilters: ChannelLogFilters = {
  channelType: null,
  status: null,
  matchStatus: null,
  range: null,
}

const fmtTime = (seconds?: number | null) =>
  seconds ? formatDateTime(seconds * 1000, 'YYYY-MM-DD HH:mm') : '—'

export default function ChannelLogList() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<PaymentChannelLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)

  const [keyword, setKeyword] = useState('')
  const [channelType, setChannelType] = useState<number | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [matchStatus, setMatchStatus] = useState<number | null>(null)
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [applied, setApplied] = useState<ChannelLogFilters>(emptyFilters)
  const [appliedKeyword, setAppliedKeyword] = useState('')

  const buildParams = useCallback(
    (targetPage: number, filters: ChannelLogFilters, size: number = PAGE_SIZE) => ({
      page: targetPage,
      page_size: size,
      channel_type: filters.channelType ?? undefined,
      status: filters.status ?? undefined,
      match_status: filters.matchStatus ?? undefined,
      start_time: filters.range?.[0]?.startOf('day').unix(),
      end_time: filters.range?.[1]?.endOf('day').unix(),
    }),
    [],
  )

  const fetchList = useCallback(
    async (targetPage: number, filters: ChannelLogFilters, size: number = PAGE_SIZE) => {
      setLoading(true)
      try {
        const res = await financeApi.getPaymentChannelLogs(buildParams(targetPage, filters, size))
        const list = res.list ?? []
        setRows(list)
        setTotal(res.total ?? list.length)
      } catch {
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
    const nextFilters: ChannelLogFilters = { channelType, status, matchStatus, range }
    setApplied(nextFilters)
    setAppliedKeyword(keyword.trim())
    setPage(1)
    void fetchList(1, nextFilters, pageSize)
  }

  const handleReset = () => {
    setKeyword('')
    setChannelType(null)
    setStatus(null)
    setMatchStatus(null)
    setRange(null)
    setApplied(emptyFilters)
    setAppliedKeyword('')
    setPage(1)
    void fetchList(1, emptyFilters, pageSize)
  }

  /** 接口未提供关键字参数，仅在当前页兜底匹配流水号和订单信息。 */
  const filteredRows = useMemo(() => {
    const value = appliedKeyword.trim().toLowerCase()
    if (!value) return rows
    return rows.filter(
      (item) =>
        item.transaction_id.toLowerCase().includes(value) ||
        item.order_no.toLowerCase().includes(value) ||
        String(item.order_id).includes(value),
    )
  }, [appliedKeyword, rows])

  const columns = useMemo<ColumnsType<PaymentChannelLog>>(
    () => [
      {
        title: '渠道流水号',
        key: 'transaction_id',
        dataIndex: 'transaction_id',
        width: 200,
        ellipsis: true,
        // render: (_, record) => (
        //   <div className="channel-log-order">
        //     <strong>{record.transaction_id || '—'}</strong>
        //     <span>流水 ID {record.log_id}</span>
        //   </div>
        // ),
      },
      {
        title: '支付渠道',
        key: 'channel_type',
        width: 110,
        align: 'center',
        render: (_, record) => (
          <span className="status-btn status--info">
            {CHANNEL_TYPE_TEXT[record.channel_type] ?? `渠道 ${record.channel_type}`}
          </span>
        ),
      },
      {
        title: '关联订单',
        key: 'order_id',
        dataIndex: 'order_id',
        width: 60,
        align: 'center',
        render: (v) => (
          <Button type="link" style={{padding: 0, margin: 0}} onClick={() => navigate(`/order/detail/${v}`)}>查看订单</Button>
        ),
      },
      {
        title: '交易金额',
        key: 'amount',
        width: 110,
        align: 'center',
        render: (_, record) => formatAmount(record.amount),
      },
      {
        title: '手续费',
        key: 'transaction_fee',
        width: 110,
        align: 'center',
        render: (_, record) => formatAmount(record.transaction_fee),
      },
      {
        title: '交易状态',
        key: 'status',
        width: 110,
        align: 'center',
        render: (_, record) => (
          <span className={`status-btn status--${CHANNEL_LOG_STATUS_TONE[record.status] ?? 'cancel'}`}>
            {CHANNEL_LOG_STATUS_TEXT[record.status] ?? record.status ?? '—'}
          </span>
        ),
      },
      {
        title: '支付时间',
        key: 'paid_at',
        width: 150,
        render: (_, record) => fmtTime(record.paid_at),
      },
      {
        title: '匹配时间',
        key: 'matched_at',
        width: 150,
        render: (_, record) => fmtTime(record.matched_at),
      },
      {
        title: '创建时间',
        key: 'create_at',
        width: 150,
        render: (_, record) => fmtTime(record.create_at),
      },
      // {
      //   title: '操作',
      //   key: 'action',
      //   width: 90,
      //   fixed: 'right',
      //   render: (_, record) => (
      //     <Button
      //       type="link"
      //       size="small"
      //       onClick={() => navigate(`/finance/channel-log/${record.log_id}`)}
      //     >
      //       查看详情
      //     </Button>
      //   ),
      // },
    ],
    [navigate],
  )

  return (
    <PageContainer
      fixed
      title="渠道流水"
      description="查看支付渠道交易流水及平台订单匹配情况"
    >
      <div className="channel-log">
        <Card variant="borderless" className="filter-bar channel-log__filter">
          <Input
            allowClear
            placeholder="渠道流水号 / 订单号 / 订单ID"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Select
            value={channelType}
            onChange={(value) => setChannelType(value ?? null)}
            options={Object.entries(CHANNEL_TYPE_TEXT).map(([key, label]) => ({
              label,
              value: Number(key),
            }))}
            allowClear
            placeholder="支付渠道"
          />
          <Select
            value={status}
            onChange={(value) => setStatus(value ?? null)}
            options={Object.entries(CHANNEL_LOG_STATUS_TEXT).map(([key, label]) => ({
              label,
              value: Number(key),
            }))}
            allowClear
            placeholder="交易状态"
          />
          <Select
            value={matchStatus}
            onChange={(value) => setMatchStatus(value ?? null)}
            options={Object.entries(MATCH_STATUS_TEXT).map(([key, label]) => ({
              label,
              value: Number(key),
            }))}
            allowClear
            placeholder="匹配状态"
          />
          <DatePicker.RangePicker
            value={range}
            onChange={(value) => setRange(value as [Dayjs, Dayjs] | null)}
            placeholder={['支付开始日期', '支付结束日期']}
          />
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={applyFilters}>查询</Button>
        </Card>

        <Card variant="borderless" className="list-card list-card--fill">
          <div className="list-card__header">
            <span className="list-card__header__title">渠道流水列表</span>
          </div>
          <FillTable<PaymentChannelLog>
            rowKey="log_id"
            size="small"
            loading={loading}
            columns={columns}
            dataSource={filteredRows}
            scroll={{ x: 1400 }}
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
