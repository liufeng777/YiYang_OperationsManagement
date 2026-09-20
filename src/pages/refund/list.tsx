/**
 * 退款管理 - 退款列表
 * 数据来源：refundApi.getRefunds（分页 + 退款状态 / 申请时间范围筛选）
 * 金额单位：后端返回「分」，展示统一换算为「元」
 * 能力范围：退款列表 / 退款详情 / 退款导出
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { App, Button, Card, DatePicker, Input, Select, Table, Space } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined, DownloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs, { type Dayjs } from 'dayjs'
import PageContainer from '@/components/PageContainer'
import { memberApi, refundApi } from '@/api'
import type { RefundItem } from '@/api/modules/refund'
import { downloadBlob, formatAmount, formatDateTime } from '@/utils'
import RefundApproveModal from './components/RefundApproveModal'
import './list.less'

export const REFUND_STATUS_TEXT: Record<number, string> = {
  1: '待医护审批',
  2: '审批通过',
  3: '退款中',
  4: '已退款',
  5: '已拒绝',
  6: '退款失败',
  8: '待财务审批'
}

/** 退款类型：1-用户申请 2-专业审核未通过 3-其他 */
export const REFUND_TYPE_TEXT: Record<number, string> = {
  1: '用户申请',
  2: '专业审核未通过',
  3: '其他',
}

/** 分 → 元 */
const fenToYuan = (fen?: number) => (fen ?? 0) / 100

interface RefundFilters {
  keyword: string
  refund_status: number | null
  range: [Dayjs, Dayjs] | null
}

const emptyFilters: RefundFilters = {
  keyword: '',
  refund_status: null,
  range: null,
}

const PAGE_SIZE = 10

export default function RefundList() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  /** 会员：把申请人 member_id 渲染为姓名 */
  const [memberMap, setMemberMap] = useState<Map<number, { name: string; phone: string }>>(new Map())
  const [rows, setRows] = useState<RefundItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [page, setPage] = useState(1)
  /** 顶部统计：全部 / 待审批 / 退款中 / 已退款 */
  const [stats, setStats] = useState({ all: 0, pending: 0, refunding: 0, refunded: 0 })

  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<number | null>(null)
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [applied, setApplied] = useState<RefundFilters>(emptyFilters)
  /** 审批弹窗：待财务审批（status=8）的退款单，null 表示未打开 */
  const [approveTarget, setApproveTarget] = useState<RefundItem | null>(null)

  /** 申请人展示：姓名（会员ID），取不到姓名时只显示 ID */
  const applicantText = useCallback(
    (record: RefundItem) => {
      const member = memberMap.get(record.member_id)
      return member ? `${member.name}（${record.member_id}）` : `会员ID ${record.member_id}`
    },
    [memberMap],
  )

  // 会员列表：用于展示/筛选申请人
  useEffect(() => {
    let cancelled = false
    memberApi
      .getMembers({ page: 1, page_size: 1000 })
      .then((res) => {
        if (cancelled) return
        setMemberMap(
          new Map(
            (res.list ?? []).map((item) => [item.id, { name: item.name, phone: item.phone }]),
          ),
        )
      })
      .catch(() => {
        if (!cancelled) setMemberMap(new Map())
      })
    return () => {
      cancelled = true
    }
  }, [])

  /** 组装查询参数（时间范围按申请时间 applied_at 转 UTC 秒） */
  const buildParams = useCallback(
    (targetPage: number, filters: RefundFilters) => ({
      page: targetPage,
      page_size: PAGE_SIZE,
      // 关键字后端暂未提供筛选参数，先下推、同时由当前页本地兜底过滤
      keyword: filters.keyword || undefined,
      refund_status: filters.refund_status ?? undefined,
      start_time: filters.range?.[0] ? filters.range[0].startOf('day').unix() : undefined,
      end_time: filters.range?.[1] ? filters.range[1].endOf('day').unix() : undefined,
    }),
    [],
  )

  /** 拉取退款列表 */
  const fetchList = useCallback(
    async (targetPage: number, filters: RefundFilters) => {
      setLoading(true)
      try {
        const res = await refundApi.getRefunds(buildParams(targetPage, filters))
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
      const [all, pending, refunding, refunded] = await Promise.all([
        refundApi.getRefunds({ page: 1, page_size: 1 }),
        refundApi.getRefunds({ page: 1, page_size: 1, refund_status: 1 }),
        refundApi.getRefunds({ page: 1, page_size: 1, refund_status: 3 }),
        refundApi.getRefunds({ page: 1, page_size: 1, refund_status: 4 }),
      ])
      setStats({
        all: all.total ?? 0,
        pending: pending.total ?? 0,
        refunding: refunding.total ?? 0,
        refunded: refunded.total ?? 0,
      })
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    }
  }, [])

  // 进入页面：加载第 1 页与统计
  useEffect(() => {
    void fetchList(1, emptyFilters)
    void fetchStats()
  }, [fetchList, fetchStats])

  /** 切换退款状态（状态下拉使用）：回到第 1 页 */
  const changeStatus = (nextStatus: number | null) => {
    setStatus(nextStatus)
    const nextFilters: RefundFilters = { ...applied, refund_status: nextStatus }
    setApplied(nextFilters)
    setPage(1)
    void fetchList(1, nextFilters)
  }

  const applyFilters = () => {
    const nextFilters: RefundFilters = {
      keyword: keyword.trim(),
      refund_status: status,
      range,
    }
    setApplied(nextFilters)
    setPage(1)
    void fetchList(1, nextFilters)
  }

  const handleReset = () => {
    setKeyword('')
    setStatus(null)
    setRange(null)
    setApplied(emptyFilters)
    setPage(1)
    void fetchList(1, emptyFilters)
  }

  /** 当前页兜底过滤：关键字匹配退款单号 / 关联订单ID / 申请人姓名（后端未提供该筛选参数） */
  const filteredRows = useMemo(() => {
    const kw = applied.keyword.trim()
    if (!kw) return rows
    const lower = kw.toLowerCase()
    return rows.filter((item) => {
      const member = memberMap.get(item.member_id)
      return (
        item.refund_no.toLowerCase().includes(lower) ||
        String(item.order_id ?? '').includes(lower) ||
        (member?.name ?? '').includes(kw) ||
        (member?.phone ?? '').includes(kw)
      )
    })
  }, [applied.keyword, rows, memberMap])

  /**
   * 导出退款单：与订单导出一致，兼容「JSON 下载地址」与「二进制文件流」两种后端形态
   */
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await refundApi.exportRefunds(buildParams(1, applied))
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
      downloadBlob(blob, `退款导出_${dayjs().format('YYYYMMDDHHmmss')}.csv`)
      message.success('导出成功，已开始下载')
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setExporting(false)
    }
  }

  const metrics = [
    { key: 'all', label: '全部退款', value: stats.all, note: '当前系统全部退款单', tone: 'primary' },
    { key: 'pending', label: '待审批', value: stats.pending, note: '等待财务/运营审批', tone: 'warning' },
    { key: 'refunding', label: '退款中', value: stats.refunding, note: '款项退回处理中', tone: 'info' },
    { key: 'refunded', label: '已退款', value: stats.refunded, note: '退款已完成', tone: 'primary' },
  ]

  const columns = useMemo<ColumnsType<RefundItem>>(
    () => [
      {
        title: '退款单',
        key: 'refund_no',
        dataIndex: 'refund_no',
        // render: (_, record) => (
        //   <div className="refund-no">
        //     <strong>{record.refund_no}</strong>
        //     {/* <span>关联订单ID {record.order_id ?? '—'}</span> */}
        //   </div>
        // ),
      },
      {
        title: '申请人',
        key: 'member',
        width: 150,
        render: (_, record) => <div className="refund-user">{applicantText(record)}</div>,
      },
      {
        title: '退款类型',
        key: 'refund_type',
        width: 120,
        render: (_, record) => REFUND_TYPE_TEXT[record.refund_type] ?? record.refund_type ?? '—',
      },
      {
        title: '退款金额',
        key: 'amount',
        width: 120,
        render: (_, record) => formatAmount(fenToYuan(record.amount)),
      },
      {
        title: '退款状态',
        key: 'status',
        width: 110,
        render: (_, record) => (
          <span className={`refund-status refund-status--${record.status}`}>
            {REFUND_STATUS_TEXT[record.status] ?? '—'}
          </span>
        ),
      },
      {
        title: '退款原因',
        dataIndex: 'reason',
        key: 'reason',
        ellipsis: true,
        render: (value?: string) => value || '—',
      },
      {
        title: '申请时间',
        key: 'applied_at',
        width: 150,
        render: (_, record) =>
          formatDateTime(record.applied_at && record.applied_at * 1000, 'YYYY-MM-DD HH:mm'),
      },
      {
        title: '退款时间',
        key: 'refunded_at',
        width: 150,
        render: (_, record) =>
          record.refunded_at
            ? formatDateTime(record.refunded_at * 1000, 'YYYY-MM-DD HH:mm')
            : '—',
      },
      {
        title: '操作',
        key: 'action',
        width: 200,
        render: (_, record) => (
          <Space>
            <Button
              type="link"
              size="small"
              onClick={() => navigate(`/refund/detail/${record.refund_id}`)}
            >
              查看详情
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => navigate(`/order/detail/${record.order_id}`)}
            >
              原订单
            </Button>
            {record.status === 8 && (
              <Button type="link" size="small" onClick={() => setApproveTarget(record)}>
                审批
              </Button>
            )}
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, applicantText],
  )

  return (
    <PageContainer
      title="退款管理"
      description="查看订单退款单及款项退回进度，支持按条件检索与导出"
      extra={
        <Button
          color="primary"
          variant="outlined"
          icon={<DownloadOutlined />}
          loading={exporting}
          onClick={handleExport}
        >
          导出
        </Button>
      }
    >
      <div className="refund-list">
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

        <Card variant="borderless" className="filter-bar refund-list__filter">
          <Input
            allowClear
            placeholder="退款单号 / 关联订单ID / 申请人姓名或手机号"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Select
            value={status}
            onChange={(value) => changeStatus(value ?? null)}
            options={Object.entries(REFUND_STATUS_TEXT).map(([key, label]) => ({
              label,
              value: Number(key),
            }))}
            allowClear
            placeholder="退款状态"
          />
          <DatePicker.RangePicker
            value={range}
            onChange={(value) => setRange(value as [Dayjs, Dayjs] | null)}
            placeholder={['申请开始日期', '申请结束日期']}
          />
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={applyFilters}>
            查询
          </Button>
        </Card>

        <Card variant="borderless" className="list-card">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">退款列表</span>
            </div>
          </div>
          <Table<RefundItem>
            rowKey="refund_id"
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

      <RefundApproveModal
        refund={approveTarget}
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onSuccess={() => {
          void fetchList(page, applied)
          void fetchStats()
        }}
      />
    </PageContainer>
  )
}
