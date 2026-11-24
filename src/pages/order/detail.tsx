/**
 * 订单中心 - 订单详情
 * 数据来源：orderApi.getOrder；工单列表复用 <WorkOrderTable />（workorderApi.getWorkOrders）
 * 金额单位：元（DECIMAL(10,2)），直接展示
 * 布局：顶部状态摘要 + 左右两栏
 *   左栏：交易订单信息 / 耗材明细 / 退款记录 / 工单列表
 *   右栏：订单进度（status_history 以 Timeline 渲染，按时间升序，最后一条为当前状态）
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Descriptions, Empty, Spin, Table, Tag, Timeline } from 'antd'
import type { DescriptionsProps } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import SensitiveText from '@/components/SensitiveText'
import { institutionApi, orderApi, workorderApi } from '@/api'
import type { OrderConsumable, OrderDetail, OrderRefundSummary } from '@/api/modules/order'
import type { WorkOrderDTO } from '@/api/modules/workorder'
import { formatAmount, formatDateTime } from '@/utils'
import { REFUND_STATUS_TEXT } from '@/pages/refund/list'
import { ORDER_STATUS_TEXT } from './constants'
import { WorkOrderTable } from './workOrderTable'
import './detail.less'

/** 时间戳（UTC 秒）格式化，空值显示占位 */
const fmtTime = (seconds?: number | null) =>
  seconds ? formatDateTime(seconds * 1000, 'YYYY-MM-DD HH:mm') : '—'

/** 状态文案优先表达结果：负面为红色、积极为绿色，其余过程状态为灰色。 */
const getTimelineColor = (statusName?: string) => {
  const text = statusName ?? ''
  if (/失败|拒绝|停止|取消|驳回|终止|异常|作废/.test(text)) return 'red'
  if (/完成|成功|通过/.test(text)) return 'green'
  return 'gray'
}

/** 退款状态标签色（refund_status：1-待医护审批 2-审批通过 3-退款中 4-已退款 5-已拒绝 6-退款失败） */
const REFUND_STATUS_COLOR: Record<number, string> = {
  1: 'gold',
  2: 'blue',
  3: 'blue',
  4: 'success',
  5: 'default',
  6: 'error',
}

/** 耗材明细列 */
const consumableColumns: ColumnsType<OrderConsumable> = [
  { title: '耗材名称', dataIndex: 'name', key: 'name', ellipsis: true },
  {
    title: '单价',
    dataIndex: 'unit_price',
    key: 'unit_price',
    width: 120,
    align: 'right',
    render: (value: number) => formatAmount(value),
  },
  { title: '数量', dataIndex: 'count', key: 'count', width: 90, align: 'right' },
  {
    title: '小计',
    dataIndex: 'amount',
    key: 'amount',
    width: 130,
    align: 'right',
    render: (value: number) => formatAmount(value),
  },
]

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
        order_id: Number(orderId),
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

  // 机构列表：详情未返回 institution_name 时用于兜底展示
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

  /** 服务机构名称：优先取详情返回的 institution_name */
  const institutionName = useMemo(() => {
    const map = new Map(institutions.map((item) => [item.id, item.name]))
    return order?.institution_name || map.get(order?.institution_id ?? 0) || `机构 ${order?.institution_id ?? '—'}`
  }, [institutions, order])

  const consumables = order?.consumables ?? []
  const refundList = order?.refund_list ?? []

  /** 状态流转：按时间升序展示，最后一条为当前状态 */
  const history = useMemo(
    () => [...(order?.status_history ?? [])].sort((a, b) => (a.time ?? 0) - (b.time ?? 0)),
    [order],
  )

  /** 交易订单信息 */
  const orderDescriptions = useMemo<DescriptionsProps['items']>(() => {
    if (!order) return []
    const items: NonNullable<DescriptionsProps['items']> = [
      { key: 'order_no', label: '订单号', children: order.order_no },
      {
        key: 'member',
        label: '会员',
        children: (
          <span>
            <SensitiveText allowReveal type="name" value={order.member_name} />
            <span>{` (ID: ${order.member_id})`}</span>
          </span>
        ),
      },
      {
        key: 'member_phone',
        label: '会员手机号',
        children: <SensitiveText allowReveal type="phone" value={order.member_phone} />,
      },
      { key: 'created_at', label: '下单时间', children: fmtTime(order.created_at) },
      {
        key: 'contact',
        label: '联系人',
        children: <SensitiveText allowReveal type="name" value={order.contact_name} />,
      },
      {
        key: 'contact_phone',
        label: '联系电话',
        children: <SensitiveText allowReveal type="phone" value={order.contact_phone} />,
      },
      
      { key: 'institution', label: '服务机构', children: institutionName },
      { key: 'service_name', label: '服务项目', children: order.service_name || '—' },
      {
        key: 'service_count',
        label: '服务次数',
        children: `${order.served_count ?? 0} / ${order.service_count ?? 0} 次`,
      },
      { key: 'total_amount', label: '原价', children: formatAmount(order.total_amount) },
      {
        key: 'discount_amount',
        label: '优惠金额',
        children: formatAmount(order.discount_amount),
      },
      {
        key: 'paid_amount',
        label: '实付金额',
        children: <strong>{formatAmount(order.paid_amount)}</strong>,
      },
      
    ]

    if (order.paid_at) {
      items.push({ key: 'paid_at', label: '支付时间', children: fmtTime(order.paid_at) })
    }
    if (order.completed_at) {
      items.push({ key: 'completed_at', label: '完成时间', children: fmtTime(order.completed_at) })
    }
    if (order.assigned_staff != null) {
      items.push({
        key: 'assigned_staff',
        label: '意向服务人员',
        children: `员工 ID ${order.assigned_staff}`,
      })
    }
    if (order.cancelled_at || order.cancel_reason) {
      items.push({
        key: 'cancelled',
        label: '取消信息',
        children: `${fmtTime(order.cancelled_at)}${order.cancel_reason ? ` · ${order.cancel_reason}` : ''}`,
      })
    }
    items.push({
      key: 'remark',
      label: '备注',
      span: { xs: 1, sm: 2, lg: 3 },
      children: order.remark || '—',
    })
    return items
  }, [order, institutionName])

  /** 退款记录列（退款单均可在退款管理中查看详情） */
  const refundColumns = useMemo<ColumnsType<OrderRefundSummary>>(
    () => [
      { title: '退款单号', dataIndex: 'refund_no', key: 'refund_no' },
      {
        title: '退款金额',
        dataIndex: 'refund_amount',
        key: 'refund_amount',
        width: 130,
        align: 'right',
        render: (value: number) => formatAmount(value),
      },
      {
        title: '退款状态',
        dataIndex: 'refund_status',
        key: 'refund_status',
        width: 130,
        render: (value: number) => (
          <Tag color={REFUND_STATUS_COLOR[value] ?? 'default'}>
            {REFUND_STATUS_TEXT[value] ?? value ?? '—'}
          </Tag>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 110,
        render: (_, record) => (
          <Button type="link" size="small" onClick={() => navigate(`/refund/detail/${record.id}`)}>
            查看退款
          </Button>
        ),
      },
    ],
    [navigate],
  )

  return (
    <PageContainer
      title="订单详情"
      description={order ? `${order.order_no} · ${institutionName}` : '订单详情'}
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
              <strong>{order ? institutionName : '—'}</strong>
            </div>
            <div className="summary-item">
              <span>实付金额</span>
              <strong>{formatAmount(order?.paid_amount)}</strong>
            </div>
            <div className="summary-item">
              <span>服务次数</span>
              <strong>
                {order ? `${order.served_count ?? 0} / ${order.service_count ?? 0} 次` : '—'}
              </strong>
            </div>
            <div className="summary-item">
              <span>下单时间</span>
              <strong>{fmtTime(order?.created_at)}</strong>
            </div>
          </Card>

          {/* 第一行：交易订单信息 + 订单进度（两张卡等高，进度内部滚动） */}
          <div className="order-detail__grid">
            <Card variant="borderless" className="detail-card order-detail__info">
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

            <Card variant="borderless" className="detail-card order-detail__status">
              <div className="detail-card__header">
                <h3>订单进度</h3>
                <span>共 {history.length} 条</span>
              </div>
              <div className="order-detail__timeline">
                {history.length ? (
                  <Timeline
                    className="order-timeline"
                    items={history.map((item) => ({
                      color: getTimelineColor(item.status_name),
                      children: (
                        <div className="order-timeline__item">
                          <div className="order-timeline__head">
                            <strong>{item.status_name || '—'}</strong>
                            <span>{fmtTime(item.time)}</span>
                          </div>
                          {item.remark ? <p>{item.remark}</p> : null}
                        </div>
                      ),
                    }))}
                  />
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无状态流转记录" />
                )}
              </div>
            </Card>
          </div>

          {consumables.length > 0 && (
            <Card variant="borderless" className="detail-card">
              <div className="detail-card__header">
                <h3>耗材明细</h3>
                <span>共 {consumables.length} 项</span>
              </div>
              <Table<OrderConsumable>
                rowKey="id"
                size="small"
                columns={consumableColumns}
                dataSource={consumables}
                pagination={false}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      合计
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      {formatAmount(consumables.reduce((sum, item) => sum + (item.amount ?? 0), 0))}
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </Card>
          )}

          {refundList.length > 0 && (
            <Card variant="borderless" className="detail-card">
              <div className="detail-card__header">
                <h3>退款记录</h3>
                <span>共 {refundList.length} 笔</span>
              </div>
              <Table<OrderRefundSummary>
                rowKey="id"
                size="small"
                columns={refundColumns}
                dataSource={refundList}
                pagination={false}
              />
            </Card>
          )}

          {/* 工单列表：整行铺满 */}
          <WorkOrderTable list={workOrders} loading={workOrderLoading} scrollY={false} />
        </div>
      </Spin>
    </PageContainer>
  )
}
