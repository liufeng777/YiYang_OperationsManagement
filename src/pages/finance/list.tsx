/**
 * 财务对账 - 对账汇总列表
 * 视觉对齐设计稿：顶部金额统计卡 + 筛选 + 状态 Tabs + 对账汇总表格
 * 当前为 mock 数据，后端就绪后替换为 financeApi.getReconcileList
 */
import { useMemo, useState } from 'react'
import { App, Button, Card, Input, Modal, Radio, Select, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import type { ReconcileItem, ReconcileStatus } from '@/api/modules/finance'
import './list.less'

const statusText: Record<ReconcileStatus, string> = {
  pending: '待核对',
  confirmed: '已核对',
  diff: '差异',
}

const initialData: ReconcileItem[] = [
  {
    id: '1',
    reconcileDate: '2026-08-07',
    institutionName: '幸福里健康驿站',
    payCount: 38,
    refundCount: 1,
    payAmount: 6420,
    netAmount: 6252,
    payChannel: '微信支付',
    status: 'pending',
    updatedAt: '08-08 02:10',
  },
  {
    id: '2',
    reconcileDate: '2026-08-07',
    institutionName: '康乐护理院',
    payCount: 26,
    refundCount: 0,
    payAmount: 4890,
    netAmount: 4890,
    payChannel: '微信支付',
    status: 'confirmed',
    updatedAt: '08-08 02:11',
  },
  {
    id: '3',
    reconcileDate: '2026-08-07',
    institutionName: '怡康护理院',
    payCount: 21,
    refundCount: 1,
    payAmount: 3680,
    netAmount: 3611,
    payChannel: '微信支付',
    status: 'confirmed',
    updatedAt: '08-08 02:12',
  },
  {
    id: '4',
    reconcileDate: '2026-08-06',
    institutionName: '长青健康驿站',
    payCount: 35,
    refundCount: 2,
    payAmount: 7260,
    netAmount: 6933,
    payChannel: '微信支付',
    status: 'confirmed',
    updatedAt: '08-07 02:08',
  },
  {
    id: '5',
    reconcileDate: '2026-08-06',
    institutionName: '和悦护理院',
    payCount: 18,
    refundCount: 0,
    payAmount: 3420,
    netAmount: 3420,
    payChannel: '微信支付',
    status: 'pending',
    updatedAt: '08-07 02:09',
  },
  {
    id: '6',
    reconcileDate: '2026-08-05',
    institutionName: '幸福里健康驿站',
    payCount: 42,
    refundCount: 1,
    payAmount: 8116,
    netAmount: 7820,
    payChannel: '微信支付',
    status: 'diff',
    updatedAt: '08-06 02:06',
  },
]

const tabItems = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待核对 5' },
  { key: 'confirmed', label: '已核对 24' },
  { key: 'diff', label: '差异 2' },
  { key: 'today', label: '今日 8' },
  { key: 'month', label: '本月 31' },
]

const metrics = [
  { key: 'pay', label: '支付金额', value: '¥126,480', note: '微信支付 100%', tone: 'primary' },
  { key: 'refund', label: '退款金额', value: '¥8,630', note: '整单退款 12 笔', tone: 'info' },
  { key: 'net', label: '净收金额', value: '¥117,850', note: '支付金额 - 退款金额', tone: 'warning' },
  { key: 'diff', label: '异常差异', value: '2', note: '待处理 ¥168.00', tone: 'danger' },
]

interface ReconcileFilters {
  keyword: string
  institution: string
  status: ReconcileStatus | 'all'
  channel: string
  date: string
}

const formatAmount = (value: number) =>
  `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`

export default function FinanceReconcileList() {
  const { message } = App.useApp()
  const [data, setData] = useState(initialData)
  const [keyword, setKeyword] = useState('')
  const [institution, setInstitution] = useState('all')
  const [status, setStatus] = useState<ReconcileStatus | 'all'>('all')
  const [channel, setChannel] = useState('all')
  const [date, setDate] = useState('')
  const [tab, setTab] = useState('all')
  const [applied, setApplied] = useState<ReconcileFilters>({
    keyword: '',
    institution: 'all',
    status: 'all',
    channel: 'all',
    date: '',
  })

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const keywordHit =
        !applied.keyword ||
        item.reconcileDate.includes(applied.keyword) ||
        item.institutionName.includes(applied.keyword)
      const institutionHit =
        applied.institution === 'all' || item.institutionName === applied.institution
      const statusHit = applied.status === 'all' || item.status === applied.status
      const channelHit = applied.channel === 'all' || item.payChannel === applied.channel
      const tabHit = tab === 'all' || item.status === tab
      return keywordHit && institutionHit && statusHit && channelHit && tabHit
    })
  }, [applied, data, tab])

  const applyFilters = () => {
    setApplied({ keyword: keyword.trim(), institution, status, channel, date })
  }

  const handleReset = () => {
    setKeyword('')
    setInstitution('all')
    setStatus('all')
    setChannel('all')
    setDate('')
    setApplied({ keyword: '', institution: 'all', status: 'all', channel: 'all', date: '' })
  }

  const handleConfirm = (record: ReconcileItem) => {
    Modal.confirm({
      title: '确认核对',
      content: `确认 ${record.reconcileDate} ${record.institutionName} 的对账结果无误吗？净收金额 ${formatAmount(record.netAmount)}。`,
      okText: '确认核对',
      cancelText: '取消',
      onOk: () => {
        setData((prev) =>
          prev.map((item) => (item.id === record.id ? { ...item, status: 'confirmed' } : item)),
        )
        message.success('已确认核对（mock）')
      },
    })
  }

  const handleResolveDiff = (record: ReconcileItem) => {
    Modal.confirm({
      title: '处理差异',
      content: `${record.reconcileDate} ${record.institutionName} 存在支付与退款差异（待处理 ¥168.00），确认人工核对完成并标记为已核对？`,
      okText: '标记已核对',
      cancelText: '取消',
      onOk: () => {
        setData((prev) =>
          prev.map((item) => (item.id === record.id ? { ...item, status: 'confirmed' } : item)),
        )
        message.success('差异已处理并标记为已核对（mock）')
      },
    })
  }

  const columns = useMemo<ColumnsType<ReconcileItem>>(
    () => [
      {
        title: '对账日期 / 机构',
        key: 'reconcileDate',
        render: (_, record) => (
          <div className="reconcile-date">
            <strong>{record.reconcileDate}</strong>
            <span>{record.institutionName}</span>
          </div>
        ),
      },
      {
        title: '订单 / 退款',
        key: 'counts',
        width: 120,
        render: (_, record) => (
          <div className="reconcile-counts">
            <strong>{record.payCount} 笔支付</strong>
            <span>{record.refundCount} 笔退款</span>
          </div>
        ),
      },
      {
        title: '支付金额',
        dataIndex: 'payAmount',
        key: 'payAmount',
        width: 120,
        render: (value: number) => formatAmount(value),
      },
      {
        title: '净收金额',
        dataIndex: 'netAmount',
        key: 'netAmount',
        width: 120,
        render: (value: number) => formatAmount(value),
      },
      {
        title: '支付渠道',
        dataIndex: 'payChannel',
        key: 'payChannel',
        width: 110,
        render: (value: string) => <span className="channel-pill">{value}</span>,
      },
      {
        title: '对账状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (value: ReconcileStatus) => (
          <span className={`reconcile-status reconcile-status--${value}`}>{statusText[value]}</span>
        ),
      },
      {
        title: '更新时间',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 110,
      },
      {
        title: '操作',
        key: 'action',
        width: 100,
        render: (_, record) => {
          if (record.status === 'pending') {
            return (
              <Button type="link" size="small" onClick={() => handleConfirm(record)}>
                核对
              </Button>
            )
          }
          if (record.status === 'diff') {
            return (
              <Button type="link" size="small" danger onClick={() => handleResolveDiff(record)}>
                处理差异
              </Button>
            )
          }
          return (
            <Button
              type="link"
              size="small"
              onClick={() =>
                message.info(
                  `${record.reconcileDate} ${record.institutionName}：支付 ${formatAmount(record.payAmount)}，净收 ${formatAmount(record.netAmount)}`,
                )
              }
            >
              查看
            </Button>
          )
        },
      },
    ],
    [message],
  )

  return (
    <PageContainer
      title="财务对账"
      description="按日期、机构和支付渠道核对支付、整单退款与净收金额"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => message.success('对账单导出任务已创建，完成后可下载（mock）')}
        >
          导出对账单
        </Button>
      }
    >
      <div className="finance-list">
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

        <Card variant="borderless" className="filter-bar finance-list__filter">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="对账日期、机构名称或对账批次"
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
              { label: '全部对账状态', value: 'all' },
              { label: '待核对', value: 'pending' },
              { label: '已核对', value: 'confirmed' },
              { label: '差异', value: 'diff' },
            ]}
          />
          <Select
            value={channel}
            onChange={setChannel}
            options={[
              { label: '全部支付渠道', value: 'all' },
              { label: '微信支付', value: '微信支付' },
              { label: '支付宝', value: '支付宝' },
            ]}
          />
          <Input
            allowClear
            placeholder="对账日期"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            onPressEnter={applyFilters}
          />
          
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={applyFilters}>
            查询
          </Button>
        </Card>

        <Card variant="borderless" className="list-card">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">对账汇总</span>
              <span className="list-card__header__tips">共 31 条 · 待核对 5 条 · 差异 2 条</span>
            </div>
            <Radio.Group
              className="list-card__status-filter"
              optionType="button"
              value={tab}
              onChange={(event) => setTab(event.target.value)}
              options={tabItems.map((item) => ({ value: item.key, label: item.label }))}
            />
          </div>
          <Table<ReconcileItem>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={filteredData}
            pagination={{ total: 31, pageSize: 6, current: 1, showSizeChanger: false }}
          />
        </Card>
      </div>
    </PageContainer>
  )
}
