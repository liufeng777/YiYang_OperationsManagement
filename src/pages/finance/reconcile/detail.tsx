/**
 * 财务对账 - 对账详情
 * 数据来源：
 * - 头部信息：financeApi.getReconciliation(id)
 * - 差异明细：financeApi.getReconciliationDetails(id)（分页 + 匹配状态筛选）
 * 汇总金额为元（字符串）；对账周期为 ISO 字符串，结算 / 平账时间为秒级时间戳
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { App, Button, Card, Descriptions, Space, Spin, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined, CheckOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import { financeApi } from '@/api'
import type { ReconciliationDetailLine, ReconcileItem } from '@/api/modules/finance'
import { formatAmount, formatDateTime } from '@/utils'
import './detail.less'

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

const CHANNEL_TYPE_TEXT: Record<number, string> = {
  1: '微信支付',
  2: '支付宝',
  3: '银联',
  9: '其他',
}

/** 明细匹配状态：1-完全匹配 2-金额不一致 3-仅渠道有 4-仅平台有 */
const MATCH_STATUS_TEXT: Record<number, string> = {
  1: '完全匹配',
  2: '金额不一致',
  3: '仅渠道有',
  4: '仅平台有',
}

const RECONCILE_STATUS_TONE: Record<number, string> = {
  1: 'warning',
  2: 'success',
  3: 'danger',
}

const MATCH_STATUS_TONE: Record<number, string> = {
  1: 'success',
  2: 'danger',
  3: 'danger',
  4: 'danger',
}

const PAGE_SIZE = 10

export default function ReconcileDetail() {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const reconcileId = Number(params.id)
  const { message, modal } = App.useApp()

  const [detail, setDetail] = useState<ReconcileItem | null>(null)
  const [loading, setLoading] = useState(false)
  /** 差异明细分页 */
  const [lines, setLines] = useState<ReconciliationDetailLine[]>([])
  const [linesTotal, setLinesTotal] = useState(0)
  const [linesLoading, setLinesLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [matchStatus] = useState<number | null>(null)

  /** 拉取对账单头部信息 */
  const fetchDetail = useCallback(async () => {
    if (!reconcileId) return
    setLoading(true)
    try {
      setDetail(await financeApi.getReconciliation(reconcileId))
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [reconcileId])

  /** 拉取差异明细分页（detail_lines 仅在详情页展示） */
  const fetchLines = useCallback(
    async (targetPage: number, status: number | null, size: number = PAGE_SIZE) => {
      if (!reconcileId) return
      setLinesLoading(true)
      try {
        const res = await financeApi.getReconciliationDetails(reconcileId, {
          page: targetPage,
          page_size: size,
          match_status: status ?? undefined,
        })
        setLines(res.list ?? [])
        setLinesTotal(res.total ?? 0)
      } catch {
        /* 错误提示由 request 拦截器统一处理 */
        setLines([])
        setLinesTotal(0)
      } finally {
        setLinesLoading(false)
      }
    },
    [reconcileId],
  )

  useEffect(() => {
    void fetchDetail()
  }, [fetchDetail])

  useEffect(() => {
    void fetchLines(1, matchStatus, pageSize)
  }, [fetchLines, matchStatus])

  /** 平账：对账中 / 有差异的单据可标记平账 */
  const handleFinish = () => {
    if (!detail) return
    modal.confirm({
      title: '确认平账',
      content: `确认将 ${detail.rec_no} 标记为已平账？平账后单据状态不可回退。`,
      okText: '确认平账',
      cancelText: '取消',
      onOk: async () => {
        try {
          await financeApi.finishReconciliation(reconcileId)
          message.success('该对账单已平账')
          void fetchDetail()
        } catch {
          /* 错误提示由 request 拦截器统一处理 */
        }
      },
    })
  }

  /** 对账单信息（Descriptions 渲染） */
  const detailDescriptions = useMemo(
    () => [
      { key: 'rec_no', label: '对账批次号', children: detail?.rec_no || '—' },
      // {
      //   key: 'channel_type',
      //   label: '支付渠道',
      //   children: detail ? (CHANNEL_TYPE_TEXT[detail.channel_type] ?? '—') : '—',
      // },
      {
        key: 'reconciliation_type',
        label: '对账类型',
        children: detail
          ? (RECONCILE_TYPE_TEXT[detail.reconciliation_type] ?? detail.reconciliation_type)
          : '—',
      },
      {
        key: 'period',
        label: '对账周期',
        children: detail
          ? `${formatDateTime(detail.start_date, 'YYYY-MM-DD')} ~ ${formatDateTime(detail.end_date, 'YYYY-MM-DD')}`
          : '—',
      },
      // {
      //   key: 'settle_date',
      //   label: '结算日期',
      //   children: detail?.settle_date
      //     ? formatDateTime(detail.settle_date * 1000, 'YYYY-MM-DD')
      //     : '—',
      // },
      {
        key: 'amount',
        label: '账单金额',
        children: <strong>{formatAmount(detail?.amount)}</strong>,
      },
      {
        key: 'platform_amount',
        label: '平台金额',
        children: <strong>{formatAmount(detail?.platform_amount)}</strong>,
      },
      {
        key: 'channel_amount',
        label: '渠道金额',
        children: <strong>{formatAmount(detail?.channel_amount)}</strong>,
      },
      {
        key: 'diff_count',
        label: '差异笔数',
        children: (
          <strong className={detail?.diff_count ? 'diff-amount' : ''}>
            {detail ? `${detail.diff_count} 笔` : '—'}
          </strong>
        ),
      },
      {
        key: 'counts',
        label: '平台 / 渠道笔数',
        children: detail ? `${detail.platform_count} / ${detail.channel_count}` : '—',
      },
      {
        key: 'reconciled_by_name',
        label: '平账操作人 / 时间',
        children: (
          `${detail?.reconciled_by_name || '—'} / ${detail?.reconciled_at
            ? formatDateTime(detail.reconciled_at * 1000, 'YYYY-MM-DD HH:mm')
            : '—'}`
        ),
      },
    ],
    [detail],
  )

  const lineColumns: ColumnsType<ReconciliationDetailLine> = [
    {
      title: '渠道流水号',
      dataIndex: 'channel_trade_no',
      key: 'channel_trade_no',
      ellipsis: true,
      render: (value?: string) => value || '—',
    },
    {
      title: '订单金额',
      key: 'order_amount',
      render: (_, record) => formatAmount(record.order_amount),
    },
    {
      title: '结算金额',
      key: 'settle_amount',
      render: (_, record) => formatAmount(record.settle_amount),
    },
    {
      title: '差额',
      key: 'gap',
      width: 120,
      render: (_, record) => {
        const gap = Number(record.order_amount ?? 0) - Number(record.settle_amount ?? 0)
        return <span className={gap ? 'diff-amount' : ''}>{formatAmount(gap)}</span>
      },
    },
    {
      title: '匹配状态',
      key: 'status',
      width: 120,
      render: (_, record) => (
        <span className={`status-btn status--${MATCH_STATUS_TONE[record.status] ?? 'cancel'}`}>
          {MATCH_STATUS_TEXT[record.status] ?? record.status ?? '—'}
        </span>
      ),
    },
    {
      title: '备注',
      dataIndex: 'match_note',
      key: 'match_note',
      ellipsis: true,
      width: 200,
      render: (value?: string) => value || '—',
    },
  ]

  return (
    <PageContainer
      title="对账详情"
      description={detail ? `${detail.rec_no} · ${CHANNEL_TYPE_TEXT[detail.channel_type] ?? '未知渠道'}` : '对账详情'}
      extra={
        <Space>
          {detail && detail.status !== 2 && (
            <Button type="primary" icon={<CheckOutlined />} onClick={handleFinish}>
              平账
            </Button>
          )}
          <Button
            color="primary"
            variant="outlined"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/finance/summary')}
          >
            返回账单汇总
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        <div className="reconcile-detail">
          <Card variant="borderless" className="reconcile-detail__summary">
             <div className="summary-item">
              <span>对账批次号</span>
              <strong>{detail?.rec_no || '—'}</strong>
            </div>
            <div className="summary-item">
              <span>对账状态</span>
              <span className={`status-btn status--${RECONCILE_STATUS_TONE[detail?.status ?? 0] ?? 'cancel'}`}>
                {RECONCILE_STATUS_TEXT[detail?.status ?? 0] ?? '—'}
              </span>
            </div>
            {/* <div className="summary-item">
              <span>支付渠道</span>
              <strong>{detail ? (CHANNEL_TYPE_TEXT[detail.channel_type] ?? '—') : '—'}</strong>
            </div> */}
            <div className="summary-item">
              <span>账单金额</span>
              <strong>{formatAmount(detail?.amount)}</strong>
            </div>
            <div className="summary-item">
              <span>平台金额</span>
              <strong>{formatAmount(detail?.platform_amount)}</strong>
            </div>
            <div className="summary-item">
              <span>渠道金额</span>
              <strong>{formatAmount(detail?.channel_amount)}</strong>
            </div>
            <div className="summary-item">
              <span>差异笔数</span>
              <strong className={detail?.diff_count ? 'diff-amount' : ''}>
                {detail ? `${detail.diff_count} 笔` : '—'}
              </strong>
            </div>
          </Card>

          <Card variant="borderless" className="detail-card">
            <div className="detail-card__header">
              <h3>对账单信息</h3>
              <span>{detail?.rec_no ?? '—'}</span>
            </div>
            <Descriptions
              column={{ xs: 1, sm: 2, lg: 3 }}
              size="small"
              colon={false}
              bordered
              items={detailDescriptions}
            />
          </Card>

          <Card variant="borderless" className="detail-card">
            <div className="detail-card__header">
              <h3>差异明细</h3>
              {/* <Select
                className="detail-card__filter"
                value={matchStatus}
                onChange={(value) => {
                  setMatchStatus(value ?? null)
                  setPage(1)
                }}
                options={Object.entries(MATCH_STATUS_TEXT).map(([key, label]) => ({
                  label,
                  value: Number(key),
                }))}
                allowClear
                placeholder="匹配状态"
                style={{ width: 140 }}
              /> */}
            </div>
            <Table<ReconciliationDetailLine>
              rowKey="id"
              size="small"
              loading={linesLoading}
              columns={lineColumns}
              dataSource={lines}
              pagination={{
                current: page,
                pageSize,
                total: linesTotal,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50, 100],
                onChange: (nextPage, nextPageSize) => {
                  setPage(nextPage)
                  setPageSize(nextPageSize)
                  void fetchLines(nextPage, matchStatus, nextPageSize)
                },
                showTotal: (count) => `共 ${count} 条`,
              }}
            />
          </Card>
        </div>
      </Spin>
    </PageContainer>
  )
}
