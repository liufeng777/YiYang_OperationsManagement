/**
 * 退款管理 - 退款详情
 * 数据来源：refundApi.getRefund（详情接口已返回订单 / 服务 / 履约工单摘要，无需额外请求）
 * 金额单位：接口以「元」返回（如 "150.00"），直接 formatAmount 展示
 * 页面结构：
 *   状态摘要（状态 / 退款金额 / 关联订单 / 申请人 / 申请时间）
 *   退款单信息（Descriptions）+ 退款进度（Timeline：申请 → 业务审批 → 财务审批 → 渠道执行 → 到账）
 *   订单与服务信息（Descriptions：机构 / 服务项目 / 会员 / 联系人 / 金额构成 / 服务次数）
 *   履约记录（Timeline：work_orders 按次服务，含服务人员与关键时间）
 * 审批入口：status === 8（待财务审批）时展示「审批」按钮，弹出 RefundApproveModal
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Card, Descriptions, Space, Spin, Timeline } from 'antd'
import { ArrowLeftOutlined, FileTextOutlined, SyncOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import SensitiveText from '@/components/SensitiveText'
import ChannelQueryResultModal from '@/components/ChannelQueryResultModal'
import { refundApi } from '@/api'
import type {
  RefundApproval,
  RefundChannelLog,
  RefundItem,
  RefundQueryResult,
  RefundWorkOrder,
} from '@/api/modules/refund'
import { formatAmount, formatDateTime } from '@/utils'
import { ORDER_STATUS_TEXT, ORDER_STATUS_TONE } from '@/pages/order/constants'
import RefundApproveModal from './components/RefundApproveModal'
import { REFUND_STATUS_TEXT, REFUND_STATUS_TONE, REFUND_TYPE_TEXT } from './list'
import './detail.less'

/** 订单退款类型（order_type） */
export const ORDER_REFUND_TYPE: Record<number, string> = {
  1: '全额退款',
  2: '部分退款',
}

const REFUND_QUERY_STATUS_TEXT: Record<string, string> = {
  SUCCESS: '退款成功',
  PROCESSING: '退款处理中',
  CLOSED: '退款已关闭',
  ABNORMAL: '退款异常',
  NOT_EXIST: '微信侧退款单不存在',
}

/** 审批结果（1-通过 2-拒绝，未知值回显原始值） */
const APPROVE_RESULT_TEXT: Record<number, string> = {
  1: '通过',
  2: '拒绝',
}

/** 审批环节（approver_type） */
const APPROVER_TYPE_TEXT: Record<string, string> = {
  business: '业务审批',
  finance: '财务审批',
  staff: '运营审批',
}

/** 退款渠道（后端为字符串枚举，未知值回显原始值） */
const REFUND_CHANNEL_TEXT: Record<string, string> = {
  wxpay: '微信支付',
  wechat: '微信支付',
  alipay: '支付宝',
  bank: '银行卡',
  balance: '余额',
  offline: '线下转账',
}

/** 工单状态文案（与工单列表一致；后端返回 wo_status_name 时优先使用） */
const WORK_ORDER_STATUS_TEXT: Record<number, string> = {
  1: '待排单',
  2: '待接单',
  3: '已接单',
  4: '已签到',
  5: '服务中',
  6: '已完成',
  7: '已取消',
}

const WORK_ORDER_STATUS_TONE: Record<number, string> = {
  1: 'warning',
  2: 'warning',
  3: 'info',
  4: 'info',
  5: 'success',
  6: 'success',
  7: 'danger',
}

/** 时间戳（UTC 秒）格式化，空值显示占位 */
const fmtTime = (seconds?: number | null, format = 'YYYY-MM-DD HH:mm') =>
  seconds ? formatDateTime(seconds * 1000, format) : '—'

/** 退款渠道文案 */
const channelText = (channel?: string) =>
  channel ? REFUND_CHANNEL_TEXT[channel.toLowerCase()] ?? channel : '—'

/** 工单状态徽标（优先按后端返回的中文文案判定语义） */
const workOrderStatus = (record: RefundWorkOrder) => {
  const text = record.wo_status_name || WORK_ORDER_STATUS_TEXT[record.wo_status] || '—'
  const tone = /取消|失败|拒绝/.test(text)
    ? 'danger'
    : /完成/.test(text)
      ? 'success'
      : WORK_ORDER_STATUS_TONE[record.wo_status] ?? 'info'
  return { text, tone }
}

/** 退款进度节点（Timeline 渲染） */
interface ProgressEvent {
  key: string
  /** 节点标题 */
  title: string
  /** 发生时间（UTC 秒），为空表示尚未发生 */
  time?: number
  /** 尚未发生的节点（时间位置展示「进行中」） */
  pending?: boolean
  /** Timeline 节点颜色 */
  dot: 'green' | 'red' | 'blue' | 'gray'
  /** 状态徽标文案 */
  badge?: string
  /** 徽标色调（对应 global.less 的 status--xxx） */
  tone?: string
  /** 关键字段 */
  meta?: Array<{ label: string; value: ReactNode }>
  /** 补充说明（审批意见 / 失败原因 / 备注） */
  note?: string
}

export default function RefundDetail() {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const refundId = Number(params.id)

  const [refund, setRefund] = useState<RefundItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [queryingRefund, setQueryingRefund] = useState(false)
  const [refundResult, setRefundResult] = useState<RefundQueryResult | null>(null)
  /** 审批弹窗开关：仅 status === 8（待财务审批）时可打开 */
  const [approveOpen, setApproveOpen] = useState(false)

  /** 拉取退款单详情 */
  const fetchRefund = useCallback(async () => {
    if (!refundId) return
    setLoading(true)
    try {
      setRefund(await refundApi.getRefund(refundId))
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setLoading(false)
    }
  }, [refundId])

  /** 主动向退款渠道查询并回写结果，再刷新退款单及渠道记录。 */
  const handleQueryRefund = async () => {
    if (!refundId || queryingRefund) return
    setQueryingRefund(true)
    try {
      const result = await refundApi.queryRefundResult(refundId)
      setRefundResult(result)
      await fetchRefund()
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setQueryingRefund(false)
    }
  }

  useEffect(() => {
    void fetchRefund()
  }, [fetchRefund])

  /** 审批记录：按步骤升序（业务审批 → 财务审批） */
  const approvals = useMemo(
    () => [...(refund?.approvals ?? [])].sort((a, b) => a.approve_step - b.approve_step),
    [refund?.approvals],
  )

  /** 退款渠道执行记录：按触发时间升序（失败重试时多条） */
  const channelLogs = useMemo(
    () =>
      [...(refund?.refund_channel_logs ?? [])].sort(
        (a, b) => (a.triggered_at ?? a.create_at ?? 0) - (b.triggered_at ?? b.create_at ?? 0),
      ),
    [refund?.refund_channel_logs],
  )

  /** 履约工单：按服务次序升序 */
  const workOrders = useMemo(
    () => [...(refund?.work_orders ?? [])].sort((a, b) => (a.order_seq ?? 0) - (b.order_seq ?? 0)),
    [refund?.work_orders],
  )

  /** 最终通过审批：取最后一步通过记录（审批人 / 通过时间 / 退款渠道口径） */
  const finalApproval = useMemo(() => {
    const passed = approvals.filter((item) => item.approve_result === 1)
    return passed.length ? passed[passed.length - 1] : null
  }, [approvals])

  /** 剩余可服务次数（总次数 - 已服务次数）；接口未返回次数时留空占位 */
  const remainingCount = useMemo(() => {
    if (refund?.served_count == null || refund?.service_count == null) return undefined
    return Math.max(refund.service_count - refund.served_count, 0)
  }, [refund?.service_count, refund?.served_count])

  /** 退款金额占订单实付比例（便于判断全额 / 部分退款） */
  const paidRatio = useMemo(() => {
    const paid = Number(refund?.paid_amount ?? 0)
    const amount = Number(refund?.amount ?? 0)
    if (!paid || !amount) return null
    return Math.round((amount / paid) * 100)
  }, [refund?.amount, refund?.paid_amount])

  /** 退款单信息（Descriptions 渲染） */
  const refundDescriptions = useMemo(
    () => [
      { key: 'refund_no', label: '退款单号', children: refund?.refund_no || '—' },
      {
        key: 'refund_type',
        label: '退款类型',
        children: refund ? (REFUND_TYPE_TEXT[refund.refund_type] ?? refund.refund_type) : '—',
      },
      {
        key: 'order_type',
        label: '退款方式',
        children: refund?.order_type ? ORDER_REFUND_TYPE[refund.order_type] : '—',
      },
      {
        key: 'order_no',
        label: '关联订单',
        children: refund?.order_no ? (
          <span
            className="order-link"
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/order/detail/${refund.order_id}`)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                navigate(`/order/detail/${refund.order_id}`)
              }
            }}
          >
            {refund.order_no}
          </span>
        ) : (
          '—'
        ),
      },
      {
        key: 'approved_by',
        label: '审批通过人',
        children: finalApproval
          ? finalApproval.approver_name || `ID ${finalApproval.approver_id}`
          : '—',
      },
      {
        key: 'approved_at',
        label: '审批通过时间',
        children: fmtTime(finalApproval?.created_at ?? refund?.approved_at),
      },
      {
        key: 'refund_channel',
        label: '退款渠道',
        children: channelText(finalApproval?.refund_channel),
      },
      { key: 'refunded_at', label: '退款时间', children: fmtTime(refund?.refunded_at) },
      { key: 'create_at', label: '申请时间', children: fmtTime(refund?.applied_at || refund?.create_at) },
      {
        key: 'reason',
        label: '退款原因',
        children: refund?.reason || '—',
      },
      {
        key: 'remark',
        label: '退款备注',
        children: refund?.remark || '—',
      },
    ],
    [finalApproval, navigate, refund],
  )

  /** 订单与服务信息（退款单关联的原始订单快照） */
  const orderDescriptions = useMemo(
    () => [
      { key: 'order_no', label: '订单号', children: refund?.order_no || '—' },
      {
        key: 'order_status',
        label: '订单状态',
        children: refund?.order_status != null ? (
          <span className={`status-btn status--${ORDER_STATUS_TONE[refund.order_status] ?? 'cancel'}`}>
            {ORDER_STATUS_TEXT[refund.order_status] ?? refund.order_status}
          </span>
        ) : (
          '—'
        ),
      },
      { key: 'institution', label: '服务机构', children: refund?.institution_name || '—' },
      { key: 'service_name', label: '服务项目', children: refund?.service_name || '—' },
      {
        key: 'member',
        label: '服务对象',
        children: (
          <span>
            <SensitiveText allowReveal type="name" value={refund?.member_name} />
          </span>
        ),
      },
      {
        key: 'user',
        label: '下单账号',
        children: (
          <span>
            <SensitiveText allowReveal type="name" value={refund?.user_name} />
          </span>
        ),
      },
      {
        key: 'contact',
        label: '联系人',
        children: <SensitiveText allowReveal type="name" value={refund?.contact_name} />,
      },
      {
        key: 'contact_phone',
        label: '联系电话',
        children: <SensitiveText allowReveal type="phone" value={refund?.contact_phone} />,
      },
      { key: 'created_at', label: '下单时间', children: fmtTime(refund?.created_at) },
      {
        key: 'service_count',
        label: '服务次数',
        children:
          refund?.service_count == null ? (
            '—'
          ) : (
            <span className="package-progress-inline">
              <strong className="amount-highlight">
                {refund.served_count ?? 0} / {refund.service_count} 次
              </strong>
              <span className="package-progress-inline__hint">
                （已消费 / 总次数
                {remainingCount != null ? `，剩余 ${remainingCount} 次` : ''}）
              </span>
            </span>
          ),
      },
      {
        key: 'is_use_consumables',
        label: '是否使用耗材',
        children: refund?.is_use_consumables == null ? '—' : refund.is_use_consumables === 1 ? '是' : '否',
      },
      {
        key: 'total_amount',
        label: '订单原价',
        children: refund?.total_amount == null ? '—' : formatAmount(refund.total_amount),
      },
      {
        key: 'discount_amount',
        label: '优惠金额',
        children: refund?.discount_amount == null ? '—' : formatAmount(refund.discount_amount),
      },
      {
        key: 'paid_amount',
        label: '实付金额',
        children: refund?.paid_amount == null ? '—' : formatAmount(refund.paid_amount),
      },
      {
        key: 'amount',
        label: '本次退款',
        children: refund?.amount == null ? (
          '—'
        ) : (
          <strong className="amount-highlight">{formatAmount(refund.amount)}</strong>
        ),
      },
    ],
    [refund, remainingCount],
  )

  /**
   * 退款进度节点：把「申请 → 审批步骤 → 渠道执行 → 退款到账」合成一条时间线，
   * 按发生时间升序；尚未发生的当前状态追加到最后，便于财务判断卡在哪一步。
   */
  const progressEvents = useMemo<ProgressEvent[]>(() => {
    if (!refund) return []
    const events: ProgressEvent[] = [
      {
        key: 'apply',
        title: '提交退款申请',
        time: refund.applied_at || refund.create_at,
        dot: 'gray',
        badge: '已提交',
        tone: 'info',
        meta: [
          {
            label: '申请人',
            value: <SensitiveText allowReveal type="name" value={refund.member_name} />,
          },
          {
            label: '退款类型',
            value: REFUND_TYPE_TEXT[refund.refund_type] ?? refund.refund_type ?? '—',
          },
          {
            label: '申请金额',
            value: <strong className="amount-highlight">{formatAmount(refund.amount)}</strong>,
          },
        ],
        note: refund.reason ? `退款原因：${refund.reason}` : undefined,
      },
    ]

    approvals.forEach((record: RefundApproval) => {
      const passed = record.approve_result === 1
      events.push({
        key: `approval-${record.record_id}`,
        title: `${APPROVER_TYPE_TEXT[record.approver_type] ?? record.approver_type ?? '审批'}（第 ${record.approve_step} 步）`,
        time: record.created_at,
        dot: passed ? 'green' : 'red',
        badge: APPROVE_RESULT_TEXT[record.approve_result] ?? String(record.approve_result ?? '—'),
        tone: passed ? 'success' : 'danger',
        meta: [
          {
            label: '审批人',
            value: record.approver_name || (record.approver_id ? `ID ${record.approver_id}` : '—'),
          },
          ...(passed
            ? [
                {
                  label: '核定退款金额',
                  value: <strong className="amount-highlight">{formatAmount(record.refund_amount)}</strong>,
                },
                { label: '退款渠道', value: channelText(record.refund_channel) },
              ]
            : []),
        ],
        note: record.opinion ? `审批意见：${record.opinion}` : undefined,
      })
    })

    channelLogs.forEach((log: RefundChannelLog) => {
      const dot = log.status === 4 ? 'green' : log.status === 6 ? 'red' : 'blue'
      events.push({
        key: `channel-${log.log_id}`,
        title: '渠道退款执行',
        time: log.triggered_at || log.create_at,
        dot,
        badge: REFUND_STATUS_TEXT[log.status] ?? String(log.status ?? '—'),
        tone: REFUND_STATUS_TONE[log.status] ?? 'cancel',
        meta: [
          { label: '退款渠道', value: channelText(log.channel) },
          { label: '退款金额', value: <strong className="amount-highlight">{formatAmount(log.amount)}</strong> },
          { label: '完成时间', value: fmtTime(log.finished_at) },
          {
            label: '操作人',
            value: log.operator_name
              ? `${log.operator_name}${log.operator_type ? `（${log.operator_type}）` : ''}`
              : '—',
          },
          { label: '渠道退款单号', value: log.out_refund_no || '—' },
          { label: '微信退款单号', value: log.wx_refund_id || '—' },
          { label: '支付交易单号', value: log.transaction_id || '—' },
        ],
        note: log.fail_reason
          ? `失败原因：${log.fail_reason}`
          : log.remark
            ? `备注：${log.remark}`
            : undefined,
      })
    })

    if (refund.refunded_at) {
      events.push({
        key: 'refunded',
        title: '退款到账',
        time: refund.refunded_at,
        dot: 'green',
        badge: '已完成',
        tone: 'success',
        meta: [
          { label: '退款金额', value: <strong className="amount-highlight">{formatAmount(refund.amount)}</strong> },
        ],
      })
    } else if (refund.status === 4) {
      // 已退款但未回写退款时间：仍补一个完成节点，避免时间线停在渠道执行
      events.push({
        key: 'refunded',
        title: '退款到账',
        dot: 'green',
        badge: '已完成',
        tone: 'success',
        meta: [{ label: '退款金额', value: <strong className="amount-highlight">{formatAmount(refund.amount)}</strong> }],
      })
    } else if ([1, 3, 8].includes(refund.status)) {
      // 流程未结束：把当前状态作为最后一个「进行中」节点
      events.push({
        key: 'current',
        title: '当前状态',
        pending: true,
        dot: 'blue',
        badge: REFUND_STATUS_TEXT[refund.status] ?? String(refund.status),
        tone: REFUND_STATUS_TONE[refund.status] ?? 'cancel',
        meta: [
          {
            label: '待处理',
            value:
              refund.status === 8
                ? '等待财务审批（可点击右上角「审批」处理）'
                : refund.status === 3
                  ? '等待退款渠道返回结果'
                  : '等待业务审批',
          },
        ],
      })
    }

    return events.sort((a, b) => (a.time ?? Number.POSITIVE_INFINITY) - (b.time ?? Number.POSITIVE_INFINITY))
  }, [approvals, channelLogs, refund])

  return (
    <PageContainer
      fixed
      title="退款详情"
      description={refund ? `${refund.refund_no} · ${refund.institution_name ?? '—'}` : '退款详情'}
      extra={
        <Space>
          <Button
            color="primary" variant='outlined'
            icon={<SyncOutlined />}
            loading={queryingRefund}
            disabled={!refund}
            onClick={() => void handleQueryRefund()}
          >
            查询退款结果
          </Button>
          <Button
            color="primary"
            variant="outlined"
            icon={<FileTextOutlined />}
            disabled={!refund}
            onClick={() => navigate(`/order/detail/${refund?.order_id}`)}
          >
            查看原订单
          </Button>
          <Button
            color="primary"
            variant="outlined"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/refund')}
          >
            返回退款列表
          </Button>
          {(refund?.status === 8) && (
            <Button type="primary" onClick={() => setApproveOpen(true)}>
              审批
            </Button>
          )}
        </Space>
      }
    >
      <Spin spinning={loading}>
        <div className="refund-detail">
          <Card variant="borderless" className="refund-detail__summary">
            <div className="summary-item">
              <span>退款状态</span>
              <em className={`status-btn status--${REFUND_STATUS_TONE[refund?.status ?? 0] ?? 'cancel'}`}>
                {REFUND_STATUS_TEXT[refund?.status ?? 0] ?? '—'}
              </em>
            </div>
            <div className="summary-item">
              <span>退款金额</span>
              <strong className="amount-highlight amount-highlight--large">
                {formatAmount(refund?.amount)}
              </strong>
              {paidRatio != null && (
                <em className="summary-item__hint">
                  订单实付 {formatAmount(refund?.paid_amount)}，占比 {paidRatio}%
                </em>
              )}
            </div>
            <div className="summary-item">
              <span>关联订单</span>
              <strong className="order-link" onClick={() => navigate(`/order/detail/${refund?.order_id}`)}>
                {refund?.order_no ?? '—'}
              </strong>
            </div>
            <div className="summary-item">
              <span>申请人</span>
              <strong><SensitiveText allowReveal type="name" value={refund?.member_name} /></strong>
            </div>
            <div className="summary-item">
              <span>申请时间</span>
              <strong>{fmtTime(refund?.applied_at || refund?.create_at)}</strong>
            </div>
          </Card>

          <div className="refund-detail__grid">
            <Card variant="borderless" className="detail-card">
              <div className="detail-card__header">
                <h3>退款单信息</h3>
                <span>{refund?.refund_no ?? '—'}</span>
              </div>
              <Descriptions
                column={{ xs: 1, sm: 2, lg: 3 }}
                size="small"
                colon={false}
                bordered
                items={refundDescriptions}
              />
            </Card>

            {/* 退款进度：申请 → 审批步骤 → 渠道执行 → 到账，统一按时间线展示 */}
            <Card variant="borderless" className="detail-card">
              <div className="detail-card__header">
                <h3>退款进度</h3>
              </div>
              <Timeline
                className="progress-timeline"
                items={progressEvents.map((event) => ({
                  key: event.key,
                  color: event.dot,
                  children: (
                    <div className="progress-event">
                      <div className="progress-event__head">
                        <strong>{event.title}</strong>
                        {event.badge ? (
                          <em className={`status-btn status--${event.tone ?? 'cancel'}`}>{event.badge}</em>
                        ) : null}
                        <span>{event.pending ? '进行中' : fmtTime(event.time)}</span>
                      </div>
                      {event.meta?.length ? (
                        <div className="progress-event__meta">
                          {event.meta.map((field) => (
                            <span key={field.label}>
                              <i>{field.label}</i>
                              {field.value}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {event.note ? <p className="progress-event__note">{event.note}</p> : null}
                    </div>
                  ),
                }))}
              />
            </Card>
          </div>

          <Card variant="borderless" className="detail-card">
            <div className="detail-card__header">
              <h3>订单与服务信息</h3>
              <span>{refund?.institution_name ?? '—'}</span>
            </div>
            <Descriptions
              column={{ xs: 1, sm: 2, lg: 3 }}
              size="small"
              colon={false}
              bordered
              items={orderDescriptions}
            />
          </Card>

          {/* 履约记录：按服务次序展示工单状态与服务人员，退款次数核对更直观 */}
          {workOrders.length > 0 && (
            <Card variant="borderless" className="detail-card">
              <div className="detail-card__header">
                <h3>履约记录</h3>
                <span>共 {workOrders.length} 次服务</span>
              </div>
              <Timeline
                className="work-order-timeline"
                items={workOrders.map((record) => {
                  const status = workOrderStatus(record)
                  return {
                    key: record.work_order_id ?? record.work_order_no,
                    color: /取消|失败|拒绝/.test(status.text)
                      ? 'red'
                      : /完成/.test(status.text)
                        ? 'green'
                        : 'blue',
                    children: (
                      <div className="work-order-event">
                        <div className="work-order-event__head">
                          <strong>
                            第 {record.order_seq ?? '—'} 次服务 · {record.work_order_no || '—'}
                          </strong>
                          <em className={`status-btn status--${status.tone}`}>{status.text}</em>
                        </div>
                        <div className="work-order-event__meta">
                          <span>
                            <i>服务人员</i>
                            {record.staff_name || '待分配'}
                          </span>
                          <span>
                            <i>期望上门</i>
                            {fmtTime(record.expected_start_at)}
                          </span>
                          <span>
                            <i>完成时间</i>
                            {fmtTime(record.completed_at)}
                          </span>
                          {record.cancelled_at ? (
                            <span>
                              <i>取消时间</i>
                              {fmtTime(record.cancelled_at)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ),
                  }
                })}
              />
            </Card>
          )}
        </div>
      </Spin>

      <ChannelQueryResultModal
        open={!!refundResult}
        title="退款结果查询"
        status={refundResult?.status ?? ''}
        statusLabel={refundResult
          ? (REFUND_QUERY_STATUS_TEXT[refundResult.status] ?? refundResult.status)
          : ''}
        message={refundResult?.message ?? ''}
        items={refundResult ? [
          { key: 'refund_no', label: '退款单号', children: refundResult.refund_no || '—' },
          { key: 'refund_id', label: '退款单 ID', children: refundResult.refund_id },
          { key: 'status', label: '渠道状态码', children: refundResult.status || '—' },
          {
            key: 'refund_amount',
            label: '退款金额',
            children: <strong>{formatAmount(refundResult.refund_amount)}</strong>,
          },
          { key: 'refund_id_wx', label: '微信退款单号', children: refundResult.refund_id_wx || '—' },
          { key: 'transaction_id', label: '支付交易单号', children: refundResult.transaction_id || '—' },
          {
            key: 'success_time',
            label: '退款成功时间',
            children: refundResult.success_time
              ? formatDateTime(refundResult.success_time, 'YYYY-MM-DD HH:mm:ss')
              : '—',
          },
          {
            key: 'triggered_update',
            label: '是否触发退款更新',
            children: refundResult.triggered_update ? '是' : '否',
          },
        ] : []}
        onClose={() => setRefundResult(null)}
      />

      {approveOpen && <RefundApproveModal
        refund={refund}
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        onSuccess={fetchRefund}
      />}
    </PageContainer>
  )
}
