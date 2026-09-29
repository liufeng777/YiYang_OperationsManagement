/**
 * 订单中心 - 订单列表
 * 数据来源：orderApi.getOrders（分页 + 订单号 / 机构 / 状态 / 下单时间范围筛选）
 * 金额单位：后端返回「分」，展示统一换算为「元」
 * 能力范围：订单列表 / 订单详情 / 订单导出（增删改与确认、取消、退款等流转操作暂不在此维护）
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { App, Button, Card, DatePicker, Input, Select } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined, DownloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs, { type Dayjs } from 'dayjs'
import PageContainer from '@/components/PageContainer'
import { institutionApi, orderApi } from '@/api'
import type { OrderDetail, OrderListParams } from '@/api/modules/order'
import { downloadBlob, formatAmount, formatDateTime } from '@/utils'
import './list.less'

const ORDER_STATUS_TEXT: Record<number, string> = {
  1: '待支付',
  2: '待确认',
  3: '生效中',
  4: '已完成',
  5: '已取消',
  6: '已退款',
  7: '退款中',
  8: '退款待审批'
}

/** 分 → 元 */
const fenToYuan = (fen?: number) => (fen ?? 0) / 100

interface OrderFilters {
  order_no: string
  institution_id: number | null
  order_status: number | null
  range: [Dayjs, Dayjs] | null
}

const emptyFilters: OrderFilters = {
  order_no: '',
  institution_id: null,
  order_status: null,
  range: null,
}

const PAGE_SIZE = 10

export default function OrderList() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [institutions, setInstitutions] = useState<Array<{ id: number; name: string }>>([])
  const [rows, setRows] = useState<OrderDetail[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  /** 顶部统计：全部 / 待确认 / 生效中 / 已完成 */
  const [stats, setStats] = useState({ all: 0, pending: 0, active: 0, finished: 0 })

  const [keyword, setKeyword] = useState('')
  const [institution, setInstitution] = useState<number | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [applied, setApplied] = useState<OrderFilters>(emptyFilters)

  const instMap = useMemo(
    () => new Map(institutions.map((item) => [item.id, item.name])),
    [institutions],
  )
  const institutionName = (record: OrderDetail) =>
    instMap.get(record.institution_id) ?? `机构 ${record.institution_id}`

  // 机构列表：用于筛选下拉与列表机构名展示
  useEffect(() => {
    let cancelled = false
    institutionApi
      .getInstitutions({ page: 1, page_size: 1000 })
      .then((res) => {
        if (!cancelled) setInstitutions(res.list ?? [])
      })
      .catch(() => {
        if (!cancelled) setInstitutions([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  /** 组装查询参数（时间范围转 UTC 秒） */
  const buildParams = useCallback(
    (targetPage: number, filters: OrderFilters, size: number = PAGE_SIZE): OrderListParams => ({
      page: targetPage,
      page_size: size,
      order_no: filters.order_no || undefined,
      institution_id: filters.institution_id ?? undefined,
      order_status: filters.order_status ?? undefined,
      start_time: filters.range?.[0] ? filters.range[0].startOf('day').unix() : undefined,
      end_time: filters.range?.[1] ? filters.range[1].endOf('day').unix() : undefined,
    }),
    [],
  )

  /** 拉取订单列表 */
  const fetchList = useCallback(
    async (targetPage: number, filters: OrderFilters, size: number = PAGE_SIZE) => {
      setLoading(true)
      try {
        const res = await orderApi.getOrders(buildParams(targetPage, filters, size))
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

  /** 顶部统计：各状态各取 1 条拿 total */
  const fetchStats = useCallback(async () => {
    try {
      const [all, pending, active, finished] = await Promise.all([
        orderApi.getOrders({ page: 1, page_size: 1 }),
        orderApi.getOrders({ page: 1, page_size: 1, order_status: 2 }),
        orderApi.getOrders({ page: 1, page_size: 1, order_status: 3 }),
        orderApi.getOrders({ page: 1, page_size: 1, order_status: 4 }),
      ])
      setStats({
        all: all.total ?? 0,
        pending: pending.total ?? 0,
        active: active.total ?? 0,
        finished: finished.total ?? 0,
      })
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    }
  }, [])

  // 进入页面：加载第 1 页与统计
  useEffect(() => {
    void fetchList(1, emptyFilters, pageSize)
    void fetchStats()
  }, [fetchList, fetchStats])

  /** 切换订单状态（状态下拉使用）：回到第 1 页 */
  const changeStatus = (nextStatus: number | null) => {
    setStatus(nextStatus)
    const nextFilters: OrderFilters = { ...applied, order_status: nextStatus }
    setApplied(nextFilters)
    setPage(1)
    void fetchList(1, nextFilters, pageSize)
  }

  const applyFilters = () => {
    const nextFilters: OrderFilters = {
      order_no: keyword.trim(),
      institution_id: institution,
      order_status: status,
      range,
    }
    setApplied(nextFilters)
    setPage(1)
    void fetchList(1, nextFilters, pageSize)
  }

  const handleReset = () => {
    setKeyword('')
    setInstitution(null)
    setStatus(null)
    setRange(null)
    setApplied(emptyFilters)
    setPage(1)
    void fetchList(1, emptyFilters, pageSize)
  }

  /**
   * 导出订单：后端当前返回 JSON（download_url）而非文件流，两种形态都兼容
   * - JSON：取 download_url 新窗口下载
   * - 二进制流：直接落盘
   */
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await orderApi.exportOrders(buildParams(1, applied))
      const blob = res.data
      const contentType = String(res.headers?.['content-type'] ?? blob?.type ?? '')
      if (contentType.includes('json')) {
        const text = await blob.text()
        let url = ''
        try {
          url = (JSON.parse(text) as { data?: { download_url?: string } })?.data?.download_url ?? ''
        } catch {
          /* 非 JSON 时按下载流处理 */
        }
        if (!url) {
          message.error('导出失败：未获取到下载地址')
          return
        }
        window.open(url, '_blank')
        message.success('导出文件已生成')
        return
      }
      if (!blob || blob.size === 0) {
        message.warning('导出内容为空')
        return
      }
      downloadBlob(blob, `订单导出_${dayjs().format('YYYYMMDDHHmmss')}.csv`)
      message.success('导出成功，已开始下载')
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setExporting(false)
    }
  }

  const metrics = [
    { key: 'all', label: '全部订单', value: stats.all, note: '当前系统全部订单', tone: 'primary' },
    { key: 'pending', label: '待确认', value: stats.pending, note: '需运营确认后生效', tone: 'warning' },
    { key: 'active', label: '生效中', value: stats.active, note: '服务履约进行中', tone: 'info' },
    { key: 'finished', label: '已完成', value: stats.finished, note: '服务已完成结算', tone: 'primary' },
  ]

  const columns = useMemo<ColumnsType<OrderDetail>>(
    () => [
      {
        title: '订单号',
        key: 'order_no',
        render: (_, record) => (
          <div className="order-service">
            <strong>{record.order_no}</strong>
            <span>{record.remark || '—'}</span>
          </div>
        ),
      },
      {
        title: '联系人',
        key: 'contact',
        width: 150,
        render: (_, record) => (
          <div className="order-user">
            <strong>{record.contact_name || '—'}</strong>
            <span>{record.contact_phone || '—'}</span>
          </div>
        ),
      },
      {
        title: '服务机构',
        key: 'institution',
        width: 150,
        render: (_, record) => institutionName(record),
      },
      {
        title: '服务次数',
        key: 'service_count',
        width: 110,
        render: (_, record) => `${record.served_count ?? 0} / ${record.service_count ?? 0} 次`,
      },
      {
        title: '实付金额',
        key: 'paid_amount',
        width: 120,
        render: (_, record) => formatAmount(fenToYuan(record.paid_amount)),
      },
      {
        title: '订单状态',
        key: 'order_status',
        width: 110,
        render: (_, record) => (
          <span className={`order-status order-status--${record.order_status}`}>
            {ORDER_STATUS_TEXT[record.order_status] ?? '—'}
          </span>
        ),
      },
      {
        title: '下单时间',
        key: 'created_at',
        width: 150,
        render: (_, record) =>
          formatDateTime(record.created_at && record.created_at * 1000, 'YYYY-MM-DD HH:mm'),
      },
      {
        title: '操作',
        key: 'action',
        width: 100,
        render: (_, record) => (
          <div className="order-actions">
            <Button type="link" size="small" onClick={() => navigate(`/order/detail/${record.id}`)}>
              查看详情
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [instMap, navigate],
  )

  return (
    <PageContainer
      fixed
      title="订单中心"
      description="统一查看交易订单与机构履约进度，支持按条件检索与导出"
    >
      <div className="order-list">
        <div className="metric-cards">
          {metrics.map((metric) => (
            <Card variant="borderless" className="metric-card" key={metric.key}>
              <div className="metric-card__head">
                <span className="metric-card__label">{metric.label}</span>
                <i className={`metric-card__icon metric-card__icon--${metric.tone}`}>
                  <BarChartOutlined />
                </i>
              </div>
              <strong className="metric-card__value">{metric.value}</strong>
              <em className={`metric-card__note metric-card__note--${metric.tone}`}>{metric.note}</em>
            </Card>
          ))}
        </div>

        <Card variant="borderless" className="filter-bar order-list__filter">
          <Input
            allowClear
            placeholder="订单号"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Select
            value={institution}
            onChange={(value) => setInstitution(value ?? null)}
            options={institutions.map((item) => ({ label: item.name, value: item.id }))}
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="服务机构"
          />
          <Select
            value={status}
            onChange={(value) => changeStatus(value ?? null)}
            options={Object.entries(ORDER_STATUS_TEXT).map(([key, label]) => ({
              label,
              value: Number(key),
            }))}
            allowClear
            placeholder="订单状态"
          />
          <DatePicker.RangePicker
            value={range}
            onChange={(value) => setRange(value as [Dayjs, Dayjs] | null)}
            placeholder={['下单开始日期', '下单结束日期']}
          />
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={applyFilters}>
            查询
          </Button>
        </Card>

        <Card variant="borderless" className="list-card list-card--fill">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">订单列表</span>
            </div>
            <Button
              color="primary"
              variant="outlined"
              icon={<DownloadOutlined />}
              loading={exporting}
              onClick={handleExport}
            >
              导出
            </Button>
          </div>
          <FillTable<OrderDetail>
            rowKey="id"
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
