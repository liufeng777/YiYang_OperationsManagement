/**
 * 退款管理 - 退款列表
 * 视觉对齐设计稿：顶部统计卡 + 筛选 + 状态 Tabs + 退款表格
 * 当前为 mock 数据，后端就绪后替换为 refundApi.getRefundList
 */
import { useMemo, useState } from 'react'
import { Button, Card, Input, Radio, Select, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import type { CancelStatus, RefundItem, RefundStatus } from '@/api/modules/refund'
import './list.less'

const statusText: Record<RefundStatus, string> = {
  pending: '待审核',
  cancelling: '取消中',
  refunding: '退款中',
  refunded: '已退款',
  rejected: '已驳回',
  abnormal: '异常',
}

const cancelText: Record<CancelStatus, string> = {
  pending: '待取消',
  cancelling: '取消中',
  done: '全部已取消',
  none: '未取消',
  failed: '取消失败',
}

const mockRefunds: RefundItem[] = [
  {
    id: '1',
    refundNo: 'TK202608070001',
    orderNo: 'DD202608070001',
    orderId: '1',
    userName: '王阿姨',
    userPhone: '138****1026',
    institutionName: '幸福里健康驿站',
    amount: 168,
    status: 'pending',
    cancelStatus: 'pending',
    applyTime: '08-07 08:52',
  },
  {
    id: '2',
    refundNo: 'TK202608070002',
    orderNo: 'DD202608070002',
    orderId: '2',
    userName: '李伯伯',
    userPhone: '136****5381',
    institutionName: '康乐护理院',
    amount: 198,
    status: 'cancelling',
    cancelStatus: 'cancelling',
    applyTime: '08-07 09:18',
  },
  {
    id: '3',
    refundNo: 'TK202608070003',
    orderNo: 'DD202608070003',
    orderId: '3',
    userName: '张叔叔',
    userPhone: '159****2218',
    institutionName: '幸福里健康驿站',
    amount: 69,
    status: 'refunding',
    cancelStatus: 'done',
    applyTime: '08-07 09:35',
  },
  {
    id: '4',
    refundNo: 'TK202608060018',
    orderNo: 'DD202608060018',
    orderId: '4',
    userName: '周阿姨',
    userPhone: '137****6632',
    institutionName: '怡康护理院',
    amount: 128,
    status: 'refunded',
    cancelStatus: 'done',
    applyTime: '08-06 16:20',
  },
  {
    id: '5',
    refundNo: 'TK202608060011',
    orderNo: 'DD202608060011',
    orderId: '5',
    userName: '陈伯伯',
    userPhone: '135****9066',
    institutionName: '长青健康驿站',
    amount: 199,
    status: 'rejected',
    cancelStatus: 'none',
    applyTime: '08-06 11:05',
  },
  {
    id: '6',
    refundNo: 'TK202608050096',
    orderNo: 'DD202608050096',
    orderId: '6',
    userName: '赵阿姨',
    userPhone: '188****3175',
    institutionName: '和悦护理院',
    amount: 268,
    status: 'abnormal',
    cancelStatus: 'failed',
    applyTime: '08-05 17:42',
  },
]

const tabItems = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审核 4' },
  { key: 'cancelling', label: '工单取消中 2' },
  { key: 'refunding', label: '退款处理中 1' },
  { key: 'refunded', label: '已退款 126' },
  { key: 'abnormal', label: '异常 2' },
]

const metrics = [
  { key: 'all', label: '全部退款', value: '138', note: '今日新增 8 笔', tone: 'primary' },
  { key: 'pending', label: '待审核', value: '4', note: '最早等待 1 小时 42 分', tone: 'info' },
  { key: 'processing', label: '联动处理中', value: '3', note: '取消工单 2 · 原路退款 1', tone: 'warning' },
  { key: 'abnormal', label: '异常', value: '2', note: '工单取消失败 1 笔', tone: 'danger' },
]

interface RefundFilters {
  keyword: string
  institution: string
  status: RefundStatus | 'all'
  cancelStatus: CancelStatus | 'all'
  date: string
}

export default function RefundList() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [institution, setInstitution] = useState('all')
  const [status, setStatus] = useState<RefundStatus | 'all'>('all')
  const [cancelStatus, setCancelStatus] = useState<CancelStatus | 'all'>('all')
  const [date, setDate] = useState('')
  const [tab, setTab] = useState('all')
  const [applied, setApplied] = useState<RefundFilters>({
    keyword: '',
    institution: 'all',
    status: 'all',
    cancelStatus: 'all',
    date: '',
  })

  const filteredData = useMemo(() => {
    return mockRefunds.filter((item) => {
      const keywordHit =
        !applied.keyword ||
        item.refundNo.toLowerCase().includes(applied.keyword.toLowerCase()) ||
        item.orderNo.toLowerCase().includes(applied.keyword.toLowerCase()) ||
        item.userName.includes(applied.keyword) ||
        item.userPhone.includes(applied.keyword)
      const institutionHit =
        applied.institution === 'all' || item.institutionName === applied.institution
      const statusHit = applied.status === 'all' || item.status === applied.status
      const cancelHit =
        applied.cancelStatus === 'all' || item.cancelStatus === applied.cancelStatus
      const tabHit = tab === 'all' || item.status === tab
      return keywordHit && institutionHit && statusHit && cancelHit && tabHit
    })
  }, [applied, tab])

  const applyFilters = () => {
    setApplied({ keyword: keyword.trim(), institution, status, cancelStatus, date })
  }

  const handleReset = () => {
    setKeyword('')
    setInstitution('all')
    setStatus('all')
    setCancelStatus('all')
    setDate('')
    setApplied({ keyword: '', institution: 'all', status: 'all', cancelStatus: 'all', date: '' })
  }

  const columns = useMemo<ColumnsType<RefundItem>>(
    () => [
      {
        title: '退款单 / 关联订单',
        key: 'refundNo',
        render: (_, record) => (
          <div className="refund-no">
            <strong>{record.refundNo}</strong>
            <span>订单 {record.orderNo}</span>
          </div>
        ),
      },
      {
        title: '用户',
        key: 'user',
        width: 140,
        render: (_, record) => (
          <div className="refund-user">
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
        title: '整单退款',
        dataIndex: 'amount',
        key: 'amount',
        width: 100,
        render: (value: number) => `¥${value}`,
      },
      {
        title: '退款状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (value: RefundStatus) => (
          <span className={`refund-status refund-status--${value}`}>{statusText[value]}</span>
        ),
      },
      {
        title: '工单取消状态',
        dataIndex: 'cancelStatus',
        key: 'cancelStatus',
        width: 120,
        render: (value: CancelStatus) => (
          <span className={`cancel-status cancel-status--${value}`}>{cancelText[value]}</span>
        ),
      },
      {
        title: '申请时间',
        dataIndex: 'applyTime',
        key: 'applyTime',
        width: 120,
      },
      {
        title: '操作',
        key: 'action',
        width: 110,
        render: (_, record) => (
          <Button type="link" size="small" onClick={() => navigate(`/refund/detail/${record.id}`)}>
            {record.status === 'pending' ? '审核' : record.status === 'abnormal' ? '处理异常' : '查看'}
          </Button>
        ),
      },
    ],
    [navigate],
  )

  return (
    <PageContainer
      title="退款管理"
      description="一期仅支持整单退款；审核通过后联动取消全部工单并原路退款"
    >
      <div className="refund-list">
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

        <Card variant="borderless" className="filter-bar refund-list__filter">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="退款单号、订单号、用户姓名或手机号"
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
              { label: '全部退款状态', value: 'all' },
              { label: '待审核', value: 'pending' },
              { label: '取消中', value: 'cancelling' },
              { label: '退款中', value: 'refunding' },
              { label: '已退款', value: 'refunded' },
              { label: '已驳回', value: 'rejected' },
              { label: '异常', value: 'abnormal' },
            ]}
          />
          <Select
            value={cancelStatus}
            onChange={setCancelStatus}
            options={[
              { label: '全部工单取消状态', value: 'all' },
              { label: '待取消', value: 'pending' },
              { label: '取消中', value: 'cancelling' },
              { label: '全部已取消', value: 'done' },
              { label: '未取消', value: 'none' },
              { label: '取消失败', value: 'failed' },
            ]}
          />
          <Input
            allowClear
            placeholder="申请时间"
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
              <span className="list-card__header__title">退款列表</span>
              <span className="list-card__header__tips">共 138 笔退款 · 待审核 4 笔</span>
            </div>
            <Radio.Group
              className="list-card__status-filter"
              optionType="button"
              value={tab}
              onChange={(event) => setTab(event.target.value)}
              options={tabItems.map((item) => ({ value: item.key, label: item.label }))}
            />
          </div>
          <Table<RefundItem>
            rowKey="id"
            columns={columns}
            dataSource={filteredData}
            pagination={{ total: 138, pageSize: 6, current: 1, showSizeChanger: false }}
          />
        </Card>
      </div>
    </PageContainer>
  )
}
