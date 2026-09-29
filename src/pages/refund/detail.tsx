/**
 * 退款管理 - 退款详情
 * 数据来源：refundApi.getRefund（金额单位为「分」，展示统一换算为「元」）
 * 审批入口：status === 8（待财务审批）时展示「审批」按钮，弹出 RefundApproveModal
 * 审批记录：refund.approvals 用 Table 渲染，核定退款金额重点突出
 * 退款渠道记录：refund.refund_channel_logs 为动态日志（可能多条重试），用 Timeline 渲染
 * 部分退款：order_type === 2 时按 order_id 拉取订单（orderApi.getOrder），
 *           在退款单信息中展示套餐履约（served_count / service_count 高亮），标明「退剩余次数费用」
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Descriptions, Space, Spin, Table, Timeline } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined, FileTextOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import { orderApi, refundApi } from '@/api'
import type { OrderDetail } from '@/api/modules/order'
import type { RefundItem } from '@/api/modules/refund'
import { formatAmount, formatDateTime } from '@/utils'
import RefundApproveModal from './components/RefundApproveModal'
import { REFUND_STATUS_TEXT, REFUND_TYPE_TEXT } from './list'
import './detail.less'

/** 订单退款类型 */
export const ORDER_REFUND_TYPE: Record<number, string> = {
  1: '全额退款',
  2: '部分退款',
}

/** 审批结果（契约未定义数值枚举，按常见约定 1-通过 2-拒绝，未知值回显原始值） */
const APPROVE_RESULT_TEXT: Record<number, string> = {
  1: '通过',
  2: '拒绝',
}

/** 分 → 元 */
const fenToYuan = (fen?: number) => (fen ?? 0) / 100

type RefundApproval = RefundItem['approvals'][number]

/** 渠道记录状态色（复用退款状态语义：4-已退款 6-退款失败 3-退款中） */
const channelLogDotColor = (status: number) =>
  status === 4 ? 'green' : status === 6 ? 'red' : status === 3 ? 'blue' : 'gray'

export default function RefundDetail() {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const refundId = Number(params.id)

  const [refund, setRefund] = useState<RefundItem | null>(null)
  const [loading, setLoading] = useState(false)
  /** 审批弹窗开关：仅 status === 8（待财务审批）时可打开 */
  const [approveOpen, setApproveOpen] = useState(false)
  /** 部分退款（order_type === 2）时关联订单详情，用于展示履约次数 */
  const [order, setOrder] = useState<OrderDetail | null>(null)

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

  /** 部分退款时拉取关联订单详情（取 served_count / service_count 履约次数） */
  const fetchOrder = useCallback(async () => {
    if (refund?.order_type !== 2 || !refund.order_id) {
      setOrder(null)
      return
    }
    try {
      setOrder(await orderApi.getOrder(refund.order_id))
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
      setOrder(null)
    }
  }, [refund?.order_id, refund?.order_type])

  useEffect(() => {
    void fetchRefund()
  }, [fetchRefund])

  useEffect(() => {
    void fetchOrder()
  }, [fetchOrder])

  /** 套餐履约：剩余次数（部分退款退的是剩余次数费用） */
  const remainingCount = order ? Math.max((order.service_count ?? 0) - (order.served_count ?? 0), 0) : 0

  /** 退款单信息（Descriptions 渲染）；部分退款时并入套餐履约（已消费 / 总次数高亮） */
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
        label: '订单类型',
        children: refund?.order_type ? ORDER_REFUND_TYPE[refund.order_type] : '—',
      },
      // 部分退款（order_type === 2）：套餐履约情况，已消费 / 总次数高亮
      ...(order
        ? [
            {
              key: 'package_progress',
              label: '套餐履约',
              span: { xs: 1, sm: 2, lg: 3 },
              children: (
                <span className="package-progress-inline">
                  <strong className="amount-highlight">
                    {order.served_count ?? 0} / {order.service_count ?? 0} 次
                  </strong>
                  <span className="package-progress-inline__hint">
                    <span>（已消费 / 总次数）</span>
                    剩余 {remainingCount} 次，退还剩余次数费用
                  </span>
                </span>
              ),
            },
          ]
        : []),
      {
        key: 'approved_by',
        label: '审批人',
        children: refund?.approved_by_name || (refund?.approved_by ?? '—'),
      },
      {
        key: 'approved_at',
        label: '审批通过时间',
        children: refund?.approved_at
          ? formatDateTime(refund.approved_at * 1000, 'YYYY-MM-DD HH:mm')
          : '—',
      },
      {
        key: 'refunded_at',
        label: '退款时间',
        children: refund?.refunded_at
          ? formatDateTime(refund.refunded_at * 1000, 'YYYY-MM-DD HH:mm')
          : '—',
      },
      {
        key: 'create_at',
        label: '创建时间',
        children: formatDateTime(refund?.create_at && refund.create_at * 1000, 'YYYY-MM-DD HH:mm'),
      },
      {
        key: 'reason',
        label: '退款原因',
        span: { xs: 1, sm: 2, lg: 3 },
        children: refund?.reason || '—',
      },
    ],
    [refund, order, remainingCount],
  )

  /** 审批记录表格列（核定退款金额重点突出） */
  const approvalColumns: ColumnsType<RefundApproval> = useMemo(
    () => [
      {
        title: '审批步骤',
        key: 'approve_step',
        width: 90,
        render: (_, record) => `${record.approve_step}`,
      },
      {
        title: '审批环节',
        dataIndex: 'approver_type',
        key: 'approver_type',
        width: 110,
        render: (value?: string) => value || '—',
      },
      {
        title: '审批人',
        key: 'approver_name',
        width: 110,
        render: (_, record) => record.approver_name || record.approver_id || '—',
      },
      {
        title: '审批结果',
        key: 'approve_result',
        width: 100,
        render: (_, record) => (
          <span className={`status-btn ${record.approve_result === 1 ? 'status--success' : 'status--danger'}`}>{APPROVE_RESULT_TEXT[record.approve_result] ?? record.approve_result ?? '—'}</span>
        ),
      },
      {
        title: '核定退款金额',
        key: 'refund_amount',
        width: 140,
        render: (_, record) => (
          <strong className="amount-highlight">
            {formatAmount(Number(record.refund_amount || 0) / 100)}
          </strong>
        ),
      },
      {
        title: '退款渠道',
        dataIndex: 'refund_channel',
        key: 'refund_channel',
        width: 110,
        render: (value?: string) => value || '—',
      },
      {
        title: '审批意见',
        dataIndex: 'opinion',
        key: 'opinion',
        render: (value?: string) => value || '—',
      },
      {
        title: '审批时间',
        dataIndex: 'created_at',
        key: 'created_at',
        width: 150,
        render: (value?: number) => formatDateTime(value && value * 1000, 'YYYY-MM-DD HH:mm'),
      },
    ],
    [],
  )

  /** 审批记录（通常 2 条），按步骤升序 */
  const approvals = useMemo(
    () => [...(refund?.approvals ?? [])].sort((a, b) => a.approve_step - b.approve_step),
    [refund?.approvals],
  )

  /** 退款渠道记录（通常 1 条，失败重试时多条），按创建时间升序 */
  const channelLogs = useMemo(
    () => [...(refund?.refund_channel_logs ?? [])].sort((a, b) => a.create_at - b.create_at),
    [refund?.refund_channel_logs],
  )

  return (
    <PageContainer
      title="退款详情"
      description={refund ? `${refund.refund_no}` : '退款详情'}
      extra={
        <Space>
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
          {refund?.status === 8 && (
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
              <em className={`refund-status refund-status--${refund?.status ?? 0}`}>
                {REFUND_STATUS_TEXT[refund?.status ?? 0] ?? '—'}
              </em>
            </div>
            <div className="summary-item">
              <span>关联订单</span>
              <strong className="order-link" onClick={() => navigate(`/order/detail/${refund?.order_id}`)}>
                {refund?.order_no ?? '—'}
              </strong>
            </div>
            <div className="summary-item">
              <span>申请人</span>
              <strong>{refund?.member_name}</strong>
            </div>
            <div className="summary-item">
              <span>退款金额</span>
              <strong className="amount-highlight amount-highlight--large">
                {formatAmount(fenToYuan(refund?.amount))}
              </strong>
            </div>
            <div className="summary-item">
              <span>申请时间</span>
              <strong>
                {formatDateTime(refund?.applied_at && refund.applied_at * 1000, 'YYYY-MM-DD HH:mm')}
              </strong>
            </div>
          </Card>

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

          {/* 审批记录（approvals）：Table 渲染，金额列重点突出 */}
          {approvals.length > 0 && (
            <Card variant="borderless" className="detail-card">
              <div className="detail-card__header">
                <h3>审批记录</h3>
                <span>共 {approvals.length} 条</span>
              </div>
              <Table<RefundApproval>
                rowKey="record_id"
                size="small"
                columns={approvalColumns}
                dataSource={approvals}
                pagination={false}
              />
            </Card>
          )}

          {/* 退款渠道记录（refund_channel_logs）：动态日志用 Timeline 渲染 */}
          {channelLogs.length > 0 && (
            <Card variant="borderless" className="detail-card">
              <div className="detail-card__header">
                <h3>退款渠道记录</h3>
                <span>共 {channelLogs.length} 条</span>
              </div>
              <Timeline
                className="channel-log-timeline"
                items={channelLogs.map((log) => ({
                  key: log.log_id,
                  color: channelLogDotColor(log.status),
                  children: (
                    <div className="channel-log">
                      <div className="channel-log__head">
                        <em className={`refund-status refund-status--${log.status}`}>
                          {REFUND_STATUS_TEXT[log.status] ?? log.status}
                        </em>
                        <strong>{log.channel || '—'}</strong>
                        <strong className="amount-highlight">
                          {formatAmount(fenToYuan(log.amount))}
                        </strong>
                      </div>
                      <div className="channel-log__grid">
                        <div className="channel-log__field">
                          <span>触发时间</span>
                          {formatDateTime(log.triggered_at && log.triggered_at * 1000)}
                        </div>
                        <div className="channel-log__field">
                          <span>完成时间</span>
                          {formatDateTime(log.finished_at && log.finished_at * 1000)}
                        </div>
                        <div className="channel-log__field">
                          <span>操作人</span>
                          {log.operator_name || '—'}
                          {log.operator_type ? `（${log.operator_type}）` : ''}
                        </div>
                        <div className="channel-log__field">
                          <span>渠道退款单号</span>
                          {log.out_refund_no || '—'}
                        </div>
                        <div className="channel-log__field">
                          <span>支付交易单号</span>
                          {log.transaction_id || '—'}
                        </div>
                        <div className="channel-log__field">
                          <span>微信退款单号</span>
                          {log.wx_refund_id || '—'}
                        </div>
                      </div>
                      {log.fail_reason ? (
                        <div className="channel-log__fail">失败原因:{log.fail_reason}</div>
                      ) : null}
                      {log.remark ? (
                        <div className="channel-log__remark">备注:{log.remark}</div>
                      ) : null}
                    </div>
                  ),
                }))}
              />
            </Card>
          )}
        </div>
      </Spin>

      <RefundApproveModal
        refund={refund}
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        onSuccess={fetchRefund}
      />
    </PageContainer>
  )
}
