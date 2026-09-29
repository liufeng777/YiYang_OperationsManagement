/**
 * 会员管理 - 积分明细（当前未挂载路由）
 * 视觉对齐设计稿：顶部统计卡 + 筛选 + 变动类型 Tabs + 积分明细表格
 * 一期仅支持查看与后台调整，不支持积分兑换；
 * 后端接口未对接：页面以 Alert 提示、不展示业务数据，接口就绪后接入 rewardApi 对应接口
 */
import { useMemo, useState } from 'react'
import { App, Button, Card, Input, Radio, Select, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined, PlusOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import ApiPendingAlert from '@/components/ApiPendingAlert'
import type { PointsChangeType, PointsRecord } from '@/api/modules/reward'
import './points.less'

const changeTypeText: Record<PointsChangeType, string> = {
  earn: '获得',
  deduct: '扣减',
  manual_add: '后台增加',
  manual_deduct: '后台扣减',
}

const tabItems = [
  { key: 'all', label: '全部' },
  { key: 'earn', label: '获得' },
  { key: 'deduct', label: '扣减' },
  { key: 'manual', label: '后台调整' },
  { key: 'refund', label: '退款扣回' },
  { key: 'exchange', label: '无兑换功能' },
]

const metrics = [
  { key: 'account', label: '积分账户', value: '—', note: '与会员账户一一对应', tone: 'primary' },
  { key: 'issued', label: '累计发放', value: '—', note: '订单完成后自动发放', tone: 'info' },
  { key: 'deducted', label: '累计扣减', value: '—', note: '退款或后台调整', tone: 'warning' },
  {
    key: 'balance',
    label: '当前余额',
    value: '—',
    note: '一期仅查看和调整，不支持兑换',
    tone: 'danger',
  },
]

interface PointsFilters {
  keyword: string
  changeType: PointsChangeType | 'all'
  source: string
  date: string
}

export default function PointsList() {
  const { message } = App.useApp()
  /** 接口未对接：无积分数据 */
  const [records] = useState<PointsRecord[]>([])
  const [keyword, setKeyword] = useState('')
  const [changeType, setChangeType] = useState<PointsChangeType | 'all'>('all')
  const [source, setSource] = useState('all')
  const [date, setDate] = useState('')
  const [tab, setTab] = useState('all')
  const [applied, setApplied] = useState<PointsFilters>({
    keyword: '',
    changeType: 'all',
    source: 'all',
    date: '',
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filteredData = useMemo(() => {
    return records.filter((item) => {
      const keywordHit =
        !applied.keyword ||
        item.memberName.includes(applied.keyword) ||
        (item.bizNo ?? '').toLowerCase().includes(applied.keyword.toLowerCase())
      const typeHit = applied.changeType === 'all' || item.changeType === applied.changeType
      const sourceHit = applied.source === 'all' || item.source === applied.source
      const tabHit =
        tab === 'all' ||
        (tab === 'earn' && item.changeType === 'earn') ||
        (tab === 'deduct' && item.changeType === 'deduct') ||
        (tab === 'manual' && (item.changeType === 'manual_add' || item.changeType === 'manual_deduct')) ||
        (tab === 'refund' && item.bizType === 'refund') ||
        (tab === 'exchange' && false)
      return keywordHit && typeHit && sourceHit && tabHit
    })
  }, [applied, tab])

  const applyFilters = () => {
    setApplied({ keyword: keyword.trim(), changeType, source, date })
  }

  const handleReset = () => {
    setKeyword('')
    setChangeType('all')
    setSource('all')
    setDate('')
    setApplied({ keyword: '', changeType: 'all', source: 'all', date: '' })
  }

  const columns = useMemo<ColumnsType<PointsRecord>>(
    () => [
      {
        title: '变动时间 / 会员',
        key: 'time',
        width: 150,
        render: (_, record) => (
          <div className="points-cell">
            <strong>{record.time}</strong>
            <span>{record.memberName}</span>
          </div>
        ),
      },
      {
        title: '变动类型',
        dataIndex: 'changeType',
        key: 'changeType',
        width: 100,
        render: (value: PointsChangeType) => changeTypeText[value],
      },
      {
        title: '变动积分',
        dataIndex: 'points',
        key: 'points',
        width: 100,
        render: (value: number) => (
          <span className={`points-value points-value--${value >= 0 ? 'plus' : 'minus'}`}>
            {value >= 0 ? `+${value}` : value}
          </span>
        ),
      },
      {
        title: '变动后余额',
        dataIndex: 'balance',
        key: 'balance',
        width: 100,
        render: (value: number) => value.toLocaleString(),
      },
      {
        title: '关联业务',
        key: 'biz',
        width: 140,
        render: (_, record) =>
          record.bizNo ? (
            <span className={`biz-tag biz-tag--${record.bizType}`}>
              {record.bizType === 'order' ? '订单' : '退款'} {record.bizNo}
            </span>
          ) : (
            <span className="biz-tag biz-tag--none">—</span>
          ),
      },
      {
        title: '变动原因',
        dataIndex: 'reason',
        key: 'reason',
        width: 120,
      },
      {
        title: '操作来源',
        dataIndex: 'source',
        key: 'source',
        width: 100,
      },
      {
        title: '操作',
        key: 'action',
        width: 80,
        render: () => (
          <Button
            type="link"
            size="small"
            onClick={() => message.info('积分详情将在后端接口就绪后接入')}
          >
            查看
          </Button>
        ),
      },
    ],
    [message],
  )

  return (
    <PageContainer
      title="积分明细"
      description="查询会员积分余额与获得、扣减及后台调整记录；一期不支持积分兑换"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => message.warning('接口未对接，功能暂未开放')}
        >
          导出明细
        </Button>
      }
    >
      <div className="points-list">
        <ApiPendingAlert feature="积分明细" />
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

        <Card variant="borderless" className="filter-bar points-list__filter">
          <Input
            allowClear
            placeholder="会员姓名、手机号或业务单号"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Select
            value={changeType}
            onChange={setChangeType}
            options={[
              { label: '全部变动类型', value: 'all' },
              { label: '获得', value: 'earn' },
              { label: '扣减', value: 'deduct' },
              { label: '后台增加', value: 'manual_add' },
              { label: '后台扣减', value: 'manual_deduct' },
            ]}
          />
          <Select
            value={source}
            onChange={setSource}
            options={[{ label: '全部来源', value: 'all' }]}
          />
          <Input
            allowClear
            placeholder="变动时间"
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
              <span className="list-card__header__title">积分明细</span>
              <span className="list-card__header__tips">共 {filteredData.length} 条记录</span>
            </div>
            <Radio.Group
              className="list-card__status-filter"
              optionType="button"
              value={tab}
              onChange={(event) => setTab(event.target.value)}
              options={tabItems.map((item) => ({ value: item.key, label: item.label }))}
            />
          </div>
          <Table<PointsRecord>
            rowKey="id"
            columns={columns}
            dataSource={filteredData}
            pagination={{
              current: page,
              pageSize,
              total: filteredData.length,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPage)
                setPageSize(nextPageSize)
              },
              showTotal: (total) => `共 ${total} 条`
            }}
          />
        </Card>
      </div>
    </PageContainer>
  )
}
