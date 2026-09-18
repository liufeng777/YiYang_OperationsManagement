/**
 * 订单中心 - 订单详情
 * 数据来源：orderApi.getOrder（金额单位为「分」，展示统一换算为「元」）
 * 工单列表：当前为示例数据，字段与工单 DTO 对齐（workorder.ts 的 WorkOrderDTO / WoStatus），
 *           待工单接口接入后替换为 workOrderApi.getWorkOrders({ order_id })
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Descriptions, Spin, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import { institutionApi, orderApi } from '@/api'
import type { OrderDetail } from '@/api/modules/order'
import { formatAmount, formatDateTime } from '@/utils'
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

/** 工单状态文案（共通 §6.2）：1-待排单 2-待接单 3-已接单 4-已签到 5-服务中 6-已完成 7-已取消 */
const WORK_ORDER_STATUS_TEXT: Record<number, string> = {
  1: '待排单',
  2: '待接单',
  3: '已接单',
  4: '已签到',
  5: '服务中',
  6: '已完成',
  7: '已取消',
}

/** 分 → 元 */
const fenToYuan = (fen?: number) => (fen ?? 0) / 100

/** 工单行（字段对齐 WorkOrderDTO，便于后续切换真实接口） */
interface WorkOrderRow {
  id: number
  work_order_no: string
  /** 派单服务人员 */
  assignee_name: string | null
  /** 期望医护（下单时所填） */
  expect_staff_name: string | null
  expected_start_at: number
  expected_stop_at: number
  wo_status: number
  completed_at: number | null
  service_address: string
  remark: string
}

/** 示例工单数据（待工单接口接入后替换） */
const MOCK_WORK_ORDERS: WorkOrderRow[] = [
  {
    id: 101,
    work_order_no: 'GD20260901001',
    assignee_name: '王护理',
    expect_staff_name: '王护理',
    expected_start_at: 1788102000,
    expected_stop_at: 1788105600,
    wo_status: 6,
    completed_at: 1788106000,
    service_address: '杭州市滨江区浦沿街道中控科技园 3 号楼',
    remark: '服务已完成，家属确认满意',
  },
  {
    id: 102,
    work_order_no: 'GD20260903002',
    assignee_name: '李护理',
    expect_staff_name: '李护理',
    expected_start_at: 1788274800,
    expected_stop_at: 1788278400,
    wo_status: 5,
    completed_at: null,
    service_address: '杭州市滨江区浦沿街道中控科技园 3 号楼',
    remark: '服务中，预计 17:00 前完成',
  },
  {
    id: 103,
    work_order_no: 'GD20260910003',
    assignee_name: null,
    expect_staff_name: '王护理',
    expected_start_at: 1788793200,
    expected_stop_at: 1788796800,
    wo_status: 2,
    completed_at: null,
    service_address: '杭州市滨江区浦沿街道中控科技园 3 号楼',
    remark: '已推送机构，等待接单',
  },
]

/** 工单列表列定义 */
const workOrderColumns: ColumnsType<WorkOrderRow> = [
  {
    title: '工单号',
    key: 'work_order_no',
    render: (_, record) => (
      <div className="order-service">
        <strong>{record.work_order_no}</strong>
        <span>{record.remark || '—'}</span>
      </div>
    ),
  },
  {
    title: '服务人员',
    key: 'assignee_name',
    width: 110,
    render: (_, record) => record.assignee_name || '待派单',
  },
  {
    title: '期望医护',
    key: 'expect_staff_name',
    width: 110,
    render: (_, record) => record.expect_staff_name || '—',
  },
  {
    title: '预约服务时间',
    key: 'expected_time',
    width: 210,
    render: (_, record) =>
      `${formatDateTime(
        record.expected_start_at && record.expected_start_at * 1000,
        'MM-DD HH:mm',
      )} ~ ${formatDateTime(record.expected_stop_at && record.expected_stop_at * 1000, 'HH:mm')}`,
  },
  {
    title: '服务地址',
    key: 'service_address',
    ellipsis: true,
    render: (_, record) => record.service_address || '—',
  },
  {
    title: '工单状态',
    key: 'wo_status',
    width: 110,
    render: (_, record) => (
      <span className={`work-status work-status--${record.wo_status}`}>
        {WORK_ORDER_STATUS_TEXT[record.wo_status] ?? '—'}
      </span>
    ),
  },
  {
    title: '完成时间',
    key: 'completed_at',
    width: 150,
    render: (_, record) =>
      record.completed_at ? formatDateTime(record.completed_at * 1000, 'YYYY-MM-DD HH:mm') : '—',
  },
]

export default function OrderDetailPage() {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const orderId = Number(params.id)

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [institutions, setInstitutions] = useState<Array<{ id: number; name: string }>>([])
  const [loading, setLoading] = useState(false)

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

  useEffect(() => {
    void fetchOrder()
  }, [fetchOrder])

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

  /** 工单进度摘要（示例数据） */
  const workOrderSummary = useMemo(() => {
    const countBy = (status: number) =>
      MOCK_WORK_ORDERS.filter((item) => item.wo_status === status).length
    return `共 ${MOCK_WORK_ORDERS.length} 个工单 · 待接单 ${countBy(2)} · 服务中 ${countBy(5)} · 已完成 ${countBy(6)}`
  }, [])

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

          <Card variant="borderless" className="detail-card order-detail__work-orders">
            <div className="detail-card__header">
              <h3>工单列表</h3>
              <span>{workOrderSummary} · 示例数据</span>
            </div>
            <Table<WorkOrderRow>
              rowKey="id"
              size="small"
              columns={workOrderColumns}
              dataSource={MOCK_WORK_ORDERS}
              pagination={false}
            />
          </Card>
        </div>
      </Spin>
    </PageContainer>
  )
}
