/**
 * 订单中心 - 订单列表
 * 视觉对齐设计稿：顶部统计卡 + 筛选 + 状态 Tabs + 订单表格
 * 当前为 mock 数据，后端就绪后替换为 orderApi.getOrderList
 */
import { useMemo, useState } from 'react'
import { App, Button, Card, Input, Radio, Select, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import type { OrderItem, OrderStatus, WorkOrderStatus } from '@/api/modules/order'
import './list.less'

const statusText: Record<OrderStatus, string> = {
  paid: '已支付',
  fulfilling: '履约中',
  finished: '已完成',
  refunding: '退款审核',
  cancelled: '已取消',
}

const workOrderText: Record<WorkOrderStatus, string> = {
  pending: '待机构接单',
  assigned: '已派工',
  serving: '服务中',
  done: '已完成',
  cancelled: '工单已取消',
  none: '未生成工单',
}

const mockOrders: OrderItem[] = [
  {
    id: '1',
    orderNo: 'DD202608070001',
    serviceName: '上门助浴服务',
    userName: '王阿姨',
    userPhone: '138****1026',
    institutionName: '幸福里健康驿站',
    amount: 168,
    status: 'paid',
    workOrderStatus: 'pending',
    appointmentTime: '08-08 09:00',
  },
  {
    id: '2',
    orderNo: 'DD202608070002',
    serviceName: '居家护理服务',
    userName: '李伯伯',
    userPhone: '136****5381',
    institutionName: '康乐护理院',
    amount: 198,
    status: 'fulfilling',
    workOrderStatus: 'assigned',
    appointmentTime: '08-07 14:00',
  },
  {
    id: '3',
    orderNo: 'DD202608070003',
    serviceName: '慢病健康随访',
    userName: '张叔叔',
    userPhone: '159****2218',
    institutionName: '幸福里健康驿站',
    amount: 69,
    status: 'fulfilling',
    workOrderStatus: 'serving',
    appointmentTime: '08-07 10:30',
  },
  {
    id: '4',
    orderNo: 'DD202608060018',
    serviceName: '术后康复训练',
    userName: '周阿姨',
    userPhone: '137****6632',
    institutionName: '怡康护理院',
    amount: 128,
    status: 'finished',
    workOrderStatus: 'done',
    appointmentTime: '08-06 15:00',
  },
  {
    id: '5',
    orderNo: 'DD202608060011',
    serviceName: '老年能力评估',
    userName: '陈伯伯',
    userPhone: '135****9066',
    institutionName: '长青健康驿站',
    amount: 199,
    status: 'refunding',
    workOrderStatus: 'cancelled',
    appointmentTime: '08-08 10:00',
  },
  {
    id: '6',
    orderNo: 'DD202608050096',
    serviceName: '全程陪诊服务',
    userName: '赵阿姨',
    userPhone: '188****3175',
    institutionName: '和悦护理院',
    amount: 268,
    status: 'cancelled',
    workOrderStatus: 'none',
    appointmentTime: '—',
  },
]

const tabItems = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待机构接单 18' },
  { key: 'assigned', label: '待派工 21' },
  { key: 'serving', label: '服务中 16' },
  { key: 'aftersale', label: '售后 9' },
]

const metrics = [
  { key: 'all', label: '全部订单', value: '1,286', note: '本月新增 326 单', tone: 'primary' },
  { key: 'pending', label: '待机构接单', value: '18', note: '其中 5 单即将超时', tone: 'info' },
  { key: 'fulfilling', label: '履约中', value: '64', note: '待派工 21 · 服务中 16', tone: 'warning' },
  { key: 'aftersale', label: '售后处理中', value: '9', note: '退款待审核 4 单', tone: 'danger' },
]

interface OrderFilters {
  keyword: string
  institution: string
  status: OrderStatus | 'all'
  workOrderStatus: WorkOrderStatus | 'all'
  date: string
}

export default function OrderList() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [keyword, setKeyword] = useState('')
  const [institution, setInstitution] = useState('all')
  const [status, setStatus] = useState<OrderStatus | 'all'>('all')
  const [workOrderStatus, setWorkOrderStatus] = useState<WorkOrderStatus | 'all'>('all')
  const [date, setDate] = useState('')
  const [tab, setTab] = useState('all')
  const [applied, setApplied] = useState<OrderFilters>({
    keyword: '',
    institution: 'all',
    status: 'all',
    workOrderStatus: 'all',
    date: '',
  })

  const filteredData = useMemo(() => {
    return mockOrders.filter((item) => {
      const keywordHit =
        !applied.keyword ||
        item.orderNo.toLowerCase().includes(applied.keyword.toLowerCase()) ||
        item.userName.includes(applied.keyword) ||
        item.userPhone.includes(applied.keyword)
      const institutionHit =
        applied.institution === 'all' || item.institutionName === applied.institution
      const statusHit = applied.status === 'all' || item.status === applied.status
      const workHit =
        applied.workOrderStatus === 'all' || item.workOrderStatus === applied.workOrderStatus
      const tabHit =
        tab === 'all' ||
        (tab === 'pending' && item.workOrderStatus === 'pending') ||
        (tab === 'assigned' && item.workOrderStatus === 'assigned') ||
        (tab === 'serving' && item.workOrderStatus === 'serving') ||
        (tab === 'aftersale' && item.status === 'refunding')
      return keywordHit && institutionHit && statusHit && workHit && tabHit
    })
  }, [applied, tab])

  const applyFilters = () => {
    setApplied({ keyword: keyword.trim(), institution, status, workOrderStatus, date })
  }

  const handleReset = () => {
    setKeyword('')
    setInstitution('all')
    setStatus('all')
    setWorkOrderStatus('all')
    setDate('')
    setApplied({ keyword: '', institution: 'all', status: 'all', workOrderStatus: 'all', date: '' })
  }

  const columns = useMemo<ColumnsType<OrderItem>>(
    () => [
      {
        title: '订单 / 服务',
        key: 'serviceName',
        render: (_, record) => (
          <div className="order-service">
            <strong>{record.serviceName}</strong>
            <span>{record.orderNo}</span>
          </div>
        ),
      },
      {
        title: '用户',
        key: 'user',
        width: 140,
        render: (_, record) => (
          <div className="order-user">
            <strong>{record.userName}</strong>
            <span>{record.userPhone}</span>
          </div>
        ),
      },
      {
        title: '服务机构',
        dataIndex: 'institutionName',
        key: 'institutionName',
        width: 150,
      },
      {
        title: '实付金额',
        dataIndex: 'amount',
        key: 'amount',
        width: 100,
        render: (value: number) => `¥${value}`,
      },
      {
        title: '订单状态',
        dataIndex: 'status',
        key: 'status',
        width: 110,
        render: (value: OrderStatus) => (
          <span className={`order-status order-status--${value}`}>{statusText[value]}</span>
        ),
      },
      {
        title: '工单状态',
        dataIndex: 'workOrderStatus',
        key: 'workOrderStatus',
        width: 120,
        render: (value: WorkOrderStatus) => (
          <span className={`work-status work-status--${value}`}>{workOrderText[value]}</span>
        ),
      },
      {
        title: '预约服务时间',
        dataIndex: 'appointmentTime',
        key: 'appointmentTime',
        width: 120,
      },
      {
        title: '操作',
        key: 'action',
        width: 130,
        render: (_, record) => (
          <div className="order-actions">
            <Button
              type="link"
              size="small"
              onClick={() => navigate(`/order/detail/${record.id}`)}
            >
              详情
            </Button>
            {record.workOrderStatus === 'pending' && (
              <Button
                type="link"
                size="small"
                onClick={() => message.success(`已催促 ${record.institutionName} 接单`)}
              >
                催办
              </Button>
            )}
            {record.status === 'refunding' && (
              <Button type="link" size="small" onClick={() => navigate('/refund')}>
                审核
              </Button>
            )}
          </div>
        ),
      },
    ],
    [message, navigate],
  )

  return (
    <PageContainer title="订单中心" description="统一查看交易订单、协作工单与机构履约进度">
      <div className="order-list">
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
              <em className={`metric-card__note metric-card__note--${metric.tone}`}>
                {metric.note}
              </em>
            </Card>
          ))}
        </div>

        <Card variant="borderless" className="filter-bar order-list__filter">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="订单号、用户姓名或手机号"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Select
            value={institution}
            onChange={setInstitution}
            options={[
              { label: '全部机构', value: 'all' },
              { label: '幸福里健康驿站', value: '幸福里健康驿站' },
              { label: '康乐护理院', value: '康乐护理院' },
              { label: '怡康护理院', value: '怡康护理院' },
              { label: '长青健康驿站', value: '长青健康驿站' },
              { label: '和悦护理院', value: '和悦护理院' },
            ]}
          />
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { label: '全部订单状态', value: 'all' },
              { label: '已支付', value: 'paid' },
              { label: '履约中', value: 'fulfilling' },
              { label: '已完成', value: 'finished' },
              { label: '退款审核', value: 'refunding' },
              { label: '已取消', value: 'cancelled' },
            ]}
          />
          <Select
            value={workOrderStatus}
            onChange={setWorkOrderStatus}
            options={[
              { label: '全部工单状态', value: 'all' },
              { label: '待机构接单', value: 'pending' },
              { label: '已派工', value: 'assigned' },
              { label: '服务中', value: 'serving' },
              { label: '已完成', value: 'done' },
              { label: '工单已取消', value: 'cancelled' },
              { label: '未生成工单', value: 'none' },
            ]}
          />
          <Input
            allowClear
            placeholder="服务日期"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Button type="primary" onClick={applyFilters}>
            查询
          </Button>
          <Button onClick={handleReset}>重置</Button>
        </Card>

        <Card variant="borderless" className="list-card">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">订单列表</span>
              <span className="list-card__header__tips">共 1,286 笔订单 · 今日新增 42 笔</span>
            </div>
            <Radio.Group
              className="list-card__status-filter"
              optionType="button"
              value={tab}
              onChange={(event) => setTab(event.target.value)}
              options={tabItems.map((item) => ({ value: item.key, label: item.label }))}
            />
          </div>
          <Table<OrderItem>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={filteredData}
            pagination={{ total: 1286, pageSize: 6, current: 1, showSizeChanger: false }}
          />
        </Card>
      </div>
    </PageContainer>
  )
}
