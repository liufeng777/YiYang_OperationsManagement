/**
 * 工单列表（订单详情 / 退款详情共用）
 * 数据来源：workorderApi.getWorkOrders({ order_id })，返回 workorder.ts 的 WorkOrderDTO
 * 说明：页面按订单维度查询工单（order_id 入参为字符串）；样式见本目录 workOrderTable.less
 */
import { Card, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { WorkOrderDTO } from '@/api/modules/workorder'
import SensitiveText from '@/components/SensitiveText'
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

const WORK_ORDER_STATUS_TONE: Record<number, string> = {
  1: 'warning',
  2: 'warning',
  3: 'info',
  4: 'info',
  5: 'success',
  6: 'success',
  7: 'danger',
}

const fmtTime = (seconds?: number | null, format = 'YYYY-MM-DD HH:mm') =>
  seconds ? formatDateTime(seconds * 1000, format) : '—'

/** 工单列表列定义：优先展示履约所需信息，时间节点按实际进度显示。 */
export const workOrderColumns: ColumnsType<WorkOrderDTO> = [
  {
    title: '工单信息',
    key: 'work_order_no',
    width: 210,
    render: (_, record) => (
      <div className="order-service">
        <strong>{record.work_order_no || '—'}</strong>
        <span title={[record.service_name, record.remark].filter(Boolean).join(' · ')}>
          {[record.service_name, record.remark].filter(Boolean).join(' · ') || '—'}
        </span>
      </div>
    ),
  },
  {
    title: '服务对象 / 联系人',
    key: 'member',
    width: 190,
    render: (_, record) => (
      <div className="order-user">
        <strong><SensitiveText type="name" value={record.member_name} /></strong>
        <SensitiveText type="phone" value={record.member_phone} />
        <span className="work-order-table__contact">
          联系人：<SensitiveText type="name" value={record.contact_name} />
        </span>
        <SensitiveText type="phone" value={record.contact_phone} />
      </div>
    ),
  },
  {
    title: '服务人员',
    key: 'assigned_staff_name',
    width: 150,
    render: (_, record) => (
      <div className="order-user">
        <strong>{record.assigned_staff_name || '待分配'}</strong>
        <span>期望：{record.expect_staff_name || '—'}</span>
      </div>
    ),
  },
  {
    title: '预约服务时间 / 地址',
    key: 'expected_time',
    width: 250,
    render: (_, record) => (
      <div className="table-cell">
        <strong>
          {fmtTime(record.expected_start_at, 'MM-DD HH:mm')} ~ {fmtTime(record.expected_stop_at, 'HH:mm')}
        </strong>
        <SensitiveText type="address" value={record.service_address} allowReveal />
      </div>
    ),
  },
  {
    title: '工单状态',
    key: 'wo_status',
    width: 130,
    render: (_, record) => (
      <div className="work-order-table__status">
        <span className={`status-btn status--${WORK_ORDER_STATUS_TONE[record.wo_status] ?? 'cancel'}`}>
          {WORK_ORDER_STATUS_TEXT[record.wo_status] ?? '—'}
        </span>
        {record.cancel_reason ? (
          <span className="work-order-table__cancel-reason" title={record.cancel_reason}>
            {record.cancel_reason}
          </span>
        ) : null}
      </div>
    ),
  },
  {
    title: '履约时间',
    key: 'service_progress',
    width: 190,
    render: (_, record) => (
      <div className="work-order-table__times">
        <span>派单：{fmtTime(record.assigned_at, 'MM-DD HH:mm')}</span>
        <span>接单：{fmtTime(record.accepted_at, 'MM-DD HH:mm')}</span>
        <span>到场：{fmtTime(record.arrived_at, 'MM-DD HH:mm')}</span>
        <span>开始：{fmtTime(record.started_at, 'MM-DD HH:mm')}</span>
        <span>完成：{fmtTime(record.completed_at, 'MM-DD HH:mm')}</span>
      </div>
    ),
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
  /**
   * 表体滚动高度：默认 '100%'（配合 PageContainer fixed 的 flex 布局内部滚动），
   * 传 false 时按内容自然展开（整页滚动的详情页使用）
   */
  scrollY?: number | string | false
}

/**
 * 工单列表卡片：订单详情 / 退款详情共用
 * 外层页面需提供 .detail-card 样式（各详情页 less 内已定义）
 */
export function WorkOrderTable({ list, loading = false, scrollY = '100%' }: WorkOrderTableProps) {
  return (
    <Card variant="borderless" className="detail-card work-order-table">
      <div className="detail-card__header">
        <h3>工单列表</h3>
        <span>{summarizeWorkOrders(list)}</span>
      </div>
      <Table<WorkOrderDTO>
        rowKey="work_order_no"
        size="small"
        loading={loading}
        columns={workOrderColumns}
        dataSource={list}
        pagination={false}
        scroll={{ x: 1300, ...(scrollY === false ? {} : { y: scrollY }) }}
      />
    </Card>
  )
}
