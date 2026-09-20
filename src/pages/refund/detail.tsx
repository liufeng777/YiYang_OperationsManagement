/**
 * 退款管理 - 退款详情
 * 数据来源：refundApi.getRefund（金额单位为「分」，展示统一换算为「元」）
 * 审批入口：status === 8（待财务审批）时展示「审批」按钮，弹出 RefundApproveModal
 * 工单列表：workorderApi.getWorkOrders({ order_id })，复用共享组件 <WorkOrderTable />（见 ../order/workOrderTable）
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Descriptions, Space, Spin } from 'antd'
import { ArrowLeftOutlined, FileTextOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import { memberApi, refundApi, workorderApi } from '@/api'
import type { RefundItem } from '@/api/modules/refund'
import type { WorkOrderDTO } from '@/api/modules/workorder'
import { formatAmount, formatDateTime } from '@/utils'
import { WorkOrderTable } from '../order/workOrderTable'
import RefundApproveModal from './components/RefundApproveModal'
import { REFUND_STATUS_TEXT, REFUND_TYPE_TEXT } from './list'
import './detail.less'

/** 订单退款类型 */
export const ORDER_REFUND_TYPE: Record<number, string> = {
  1: '全额退款',
  2: '部分退款',
}

/** 分 → 元 */
const fenToYuan = (fen?: number) => (fen ?? 0) / 100

export default function RefundDetail() {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const refundId = Number(params.id)

  const [refund, setRefund] = useState<RefundItem | null>(null)
  /** 会员：把申请人 member_id 渲染为姓名 */
  const [memberMap, setMemberMap] = useState<Map<number, { name: string; phone: string }>>(new Map())
  const [loading, setLoading] = useState(false)
  /** 关联订单下的工单列表 */
  const [workOrders, setWorkOrders] = useState<WorkOrderDTO[]>([])
  const [workOrderLoading, setWorkOrderLoading] = useState(false)
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

  /** 拉取关联订单的工单列表（退款单已带 order_id） */
  const fetchWorkOrders = useCallback(async () => {
    const orderId = refund?.order_id
    if (!orderId) return
    setWorkOrderLoading(true)
    try {
      const res = await workorderApi.getWorkOrders({
        order_id: String(orderId),
        page: 1,
        page_size: 100,
      })
      setWorkOrders(res.list ?? [])
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
      setWorkOrders([])
    } finally {
      setWorkOrderLoading(false)
    }
  }, [refund?.order_id])

  useEffect(() => {
    void fetchRefund()
  }, [fetchRefund])

  useEffect(() => {
    void fetchWorkOrders()
  }, [fetchWorkOrders])

  // 会员列表：用于展示申请人姓名
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

  /** 申请人展示：姓名（ID），取不到姓名时只显示 ID */
  const applicantText = useMemo(() => {
    if (!refund) return '—'
    const member = memberMap.get(refund.member_id)
    return member ? `${member.name}（会员ID ${refund.member_id}）` : `会员ID ${refund.member_id}`
  }, [refund, memberMap])

  /** 退款单信息（Descriptions 渲染） */
  const refundDescriptions = useMemo(
    () => [
      { key: 'refund_no', label: '退款单号', children: refund?.refund_no || '—' },
      {
        key: 'refund_type',
        label: '退款类型',
        children: refund ? (REFUND_TYPE_TEXT[refund.refund_type] ?? refund.refund_type) : '—',
      },
      { key: 'order_id', label: '关联订单ID', children: refund?.order_id ?? '—' },
      {
        key: 'order_type',
        label: '订单类型',
        children: refund?.order_type ? ORDER_REFUND_TYPE[refund.order_type] : '—',
      },
      { key: 'member', label: '申请人', children: applicantText },
      {
        key: 'amount',
        label: '退款金额',
        children: <strong>{formatAmount(fenToYuan(refund?.amount))}</strong>,
      },
      {
        key: 'applied_at',
        label: '申请时间',
        children: formatDateTime(refund?.applied_at && refund.applied_at * 1000, 'YYYY-MM-DD HH:mm'),
      },
      {
        key: 'approved_at',
        label: '审批通过时间',
        children: refund?.approved_at
          ? formatDateTime(refund.approved_at * 1000, 'YYYY-MM-DD HH:mm')
          : '—',
      },
      {
        key: 'approved_by',
        label: '审批人',
        children: refund?.approved_by_name || (refund?.approved_by ?? '—'),
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
    [refund, applicantText],
  )

  return (
    <PageContainer
      title="退款详情"
      description={refund ? `${refund.refund_no} · 关联订单ID ${refund.order_id}` : '退款详情'}
      extra={
        <Space>
          {refund?.status === 8 && (
            <Button type="primary" onClick={() => setApproveOpen(true)}>
              审批
            </Button>
          )}
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
              <span>关联订单ID</span>
              <strong>{refund?.order_id ?? '—'}</strong>
            </div>
            <div className="summary-item">
              <span>申请人</span>
              <strong>{applicantText}</strong>
            </div>
            <div className="summary-item">
              <span>退款金额</span>
              <strong>{formatAmount(fenToYuan(refund?.amount))}</strong>
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

          <WorkOrderTable list={workOrders} loading={workOrderLoading} />
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
