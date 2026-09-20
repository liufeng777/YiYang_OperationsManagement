/**
 * 工单列表（订单详情 / 退款详情共用）
 * 数据来源：workorderApi.getWorkOrders({ order_id })，返回 workorder.ts 的 WorkOrderDTO
 * 说明：页面按订单维度查询工单（order_id 入参为字符串）；样式见本目录 workOrderTable.less
 */
import { Card, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { WorkOrderDTO } from '@/api/modules/workorder'
import { formatDateTime } from '@/utils'
import './workOrderTable.less'

/** 工单状态文案（共通 §6.2）：1-待排单 2-待接单 3-已接单 4-已签到 5-服务中 6-已完成 7-已取消 */
export const WORK_ORDER_STATUS_TEXT: Record<number, string> = {
  1: '待排单',
  2: '待接单',
  3: '已接单',
  4: '已签到',
  5: '服务中',
  6: '已完成',
  7: '已取消',
}

/** 工单列表列定义 */
export const workOrderColumns: ColumnsType<WorkOrderDTO> = [
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
    title: '会员',
    key: 'member',
    width: 150,
    render: (_, record) => (
      <div className="order-user">
        <strong>{record.member_name || '—'}</strong>
        <span>{record.member_phone || '—'}</span>
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

/** 工单状态摘要：共 N 个工单 · 待接单 x · 服务中 y · 已完成 z */
export function summarizeWorkOrders(list: WorkOrderDTO[]): string {
  const countBy = (status: number) => list.filter((item) => item.wo_status === status).length
  return `共 ${list.length} 个工单 · 待接单 ${countBy(2)} · 服务中 ${countBy(5)} · 已完成 ${countBy(6)}`
}

interface WorkOrderTableProps {
  /** 工单列表数据 */
  list: WorkOrderDTO[]
  /** 加载中 */
  loading?: boolean
}

/**
 * 工单列表卡片：订单详情 / 退款详情共用
 * 外层页面需提供 .detail-card 样式（各详情页 less 内已定义）
 */
export function WorkOrderTable({ list, loading = false }: WorkOrderTableProps) {
  return (
    <Card variant="borderless" className="detail-card work-order-table">
      <div className="detail-card__header">
        <h3>工单列表</h3>
        <span>{summarizeWorkOrders(list)}</span>
      </div>
      <Table<WorkOrderDTO>
        rowKey="id"
        size="small"
        loading={loading}
        columns={workOrderColumns}
        dataSource={list}
        pagination={false}
      />
    </Card>
  )
}
