/**
 * 订单中心 - 订单详情
 * 数据来源：orderApi.getOrder（金额单位为「分」，展示统一换算为「元」）
 * 工单列表：workorderApi.getWorkOrders({ order_id })，复用共享组件 <WorkOrderTable />（见 ./workOrderTable）
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Descriptions, Spin } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import { institutionApi, orderApi, workorderApi } from '@/api'
import type { OrderDetail } from '@/api/modules/order'
import type { WorkOrderDTO } from '@/api/modules/workorder'
import { formatAmount, formatDateTime } from '@/utils'
import { WorkOrderTable } from './workOrderTable'
import './detail.less'

/** 订单状态文案（与列表页保持一致）：1-待支付 2-待确认 3-生效中 4-已完成 5-已取消 6-已退款 */
const ORDER_STATUS_TEXT: Record<number, string> = {
  1: '待支付',
  2: '待确认',
  3: '生效中',
  4: '已完成',
  5: '已取消',
  6: '已退款',
}

/** 分 → 元 */
const fenToYuan = (fen?: number) => (fen ?? 0) / 100

export default function OrderDetailPage() {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const orderId = Number(params.id)

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [institutions, setInstitutions] = useState<Array<{ id: number; name: string }>>([])
  const [loading, setLoading] = useState(false)
  /** 该订单下的工单列表 */
  const [workOrders, setWorkOrders] = useState<WorkOrderDTO[]>([])
  const [workOrderLoading, setWorkOrderLoading] = useState(false)

  /** 拉取订单详情 */
  const fetchOrder = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    try {
      setOrder(await orderApi.getOrder(orderId))
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setLoading(false)
    }
  }, [orderId])

  /** 拉取该订单的工单列表 */
  const fetchWorkOrders = useCallback(async () => {
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
  }, [orderId])

  useEffect(() => {
    void fetchOrder()
  }, [fetchOrder])

  useEffect(() => {
    void fetchWorkOrders()
  }, [fetchWorkOrders])

  // 机构列表：用于展示服务机构的名称
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

  const institutionName = useMemo(() => {
    const map = new Map(institutions.map((item) => [item.id, item.name]))
    return (record: OrderDetail) =>
      map.get(record.institution_id) ?? `机构 ${record.institution_id}`
  }, [institutions])

  /** 交易订单信息（Descriptions 渲染；备注并入其中） */
  const orderDescriptions = useMemo(
    () => [
      { key: 'contact_name', label: '联系人', children: order?.contact_name || '—' },
      { key: 'contact_phone', label: '联系电话', children: order?.contact_phone || '—' },
      {
        key: 'created_at',
        label: '下单时间',
        children: formatDateTime(order?.created_at && order.created_at * 1000, 'YYYY-MM-DD HH:mm'),
      },
      { key: 'user_id', label: '注册会员（用户ID）', children: order?.user_id ?? '—' },
      { key: 'member_id', label: '服务对象（会员ID）', children: order?.member_id ?? '—' },
      {
        key: 'service_count',
        label: '服务次数',
        children: order ? `${order.served_count ?? 0} / ${order.service_count ?? 0} 次` : '—',
      },
      { key: 'total_amount', label: '原价', children: formatAmount(fenToYuan(order?.total_amount)) },
      {
        key: 'discount_amount',
        label: '优惠金额',
        children: formatAmount(fenToYuan(order?.discount_amount)),
      },
      {
        key: 'paid_amount',
        label: '实付金额',
        children: <strong>{formatAmount(fenToYuan(order?.paid_amount))}</strong>,
      },
      {
        key: 'remark',
        label: '备注',
        span: { xs: 1, sm: 2, lg: 3 },
        children: order?.remark || '—',
      },
    ],
    [order],
  )

  return (
    <PageContainer
      title="订单详情"
      description={order ? `${order.order_no} · ${institutionName(order)}` : '订单详情'}
      extra={
        <Button
          color="primary"
          variant="outlined"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/order')}
        >
          返回订单列表
        </Button>
      }
    >
      <Spin spinning={loading}>
        <div className="order-detail">
          <Card variant="borderless" className="order-detail__summary">
            <div className="summary-item">
              <span>订单状态</span>
              <em className={`order-status order-status--${order?.order_status ?? 0}`}>
                {ORDER_STATUS_TEXT[order?.order_status ?? 0] ?? '—'}
              </em>
            </div>
            <div className="summary-item">
              <span>服务机构</span>
              <strong>{order ? institutionName(order) : '—'}</strong>
            </div>
            <div className="summary-item">
              <span>实付金额</span>
              <strong>{formatAmount(fenToYuan(order?.paid_amount))}</strong>
            </div>
            <div className="summary-item">
              <span>服务次数</span>
              <strong>
                {order ? `${order.served_count ?? 0} / ${order.service_count ?? 0} 次` : '—'}
              </strong>
            </div>
            <div className="summary-item">
              <span>下单时间</span>
              <strong>
                {formatDateTime(order?.created_at && order.created_at * 1000, 'YYYY-MM-DD HH:mm')}
              </strong>
            </div>
          </Card>

          <Card variant="borderless" className="detail-card">
            <div className="detail-card__header">
              <h3>交易订单信息</h3>
              <span>{order?.order_no ?? '—'}</span>
            </div>
            <Descriptions
              column={{ xs: 1, sm: 2, lg: 3 }}
              size="small"
              colon={false}
              bordered
              items={orderDescriptions}
            />
          </Card>

          <WorkOrderTable list={workOrders} loading={workOrderLoading} />
        </div>
      </Spin>
    </PageContainer>
  )
}
