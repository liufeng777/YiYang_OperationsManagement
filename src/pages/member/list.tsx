/**
 * 会员管理 - 会员列表
 * 视觉对齐设计稿：顶部统计卡 + 筛选 + 跟进状态 Tabs + 会员表格
 * 当前为 mock 数据，后端就绪后替换为 memberOpsApi 对应接口
 */
import { useMemo, useState } from 'react'
import { App, Button, Card, Input, Radio, Select, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import type {
  MemberConvertStatus,
  MemberFollowStatus,
  MemberOpsItem,
} from '@/api/modules/memberOps'
import './list.less'

const followStatusText: Record<MemberFollowStatus, string> = {
  uncontacted: '待跟进',
  following: '跟进中',
  no_intent: '暂无意向',
}

const convertStatusText: Record<MemberConvertStatus, string> = {
  pending: '待转化',
  converted: '已转化',
}

const mockMembers: MemberOpsItem[] = [
  {
    id: '1',
    name: '王丽华',
    phone: '138****1026',
    operator: '陈运营',
    lastFollow: '08-25 电话联系',
    convertStatus: 'converted',
    followStatus: 'following',
    lastOrder: '08-25 09:12',
    registerTime: '2026-05-18',
  },
  {
    id: '2',
    name: '李建国',
    phone: '136****5381',
    operator: '林运营',
    lastFollow: '今日 已联系',
    convertStatus: 'converted',
    followStatus: 'following',
    lastOrder: '08-24 16:30',
    registerTime: '2026-08-20',
  },
  {
    id: '3',
    name: '张敏',
    phone: '159****2218',
    operator: null,
    lastFollow: '尚未联系',
    convertStatus: 'pending',
    followStatus: 'uncontacted',
    lastOrder: null,
    registerTime: '2026-02-11',
  },
  {
    id: '4',
    name: '赵梅',
    phone: '137****6632',
    operator: '王运营',
    lastFollow: '05-12 复购关怀',
    convertStatus: 'converted',
    followStatus: 'following',
    lastOrder: '05-12 11:08',
    registerTime: '2025-12-22',
  },
  {
    id: '5',
    name: '周秀兰',
    phone: '135****9066',
    operator: '张运营',
    lastFollow: '超过 3 天未联系',
    convertStatus: 'pending',
    followStatus: 'uncontacted',
    lastOrder: '04-18 10:08',
    registerTime: '2026-08-23',
  },
  {
    id: '6',
    name: '陈国强',
    phone: '188****3175',
    operator: null,
    lastFollow: '尚未联系',
    convertStatus: 'pending',
    followStatus: 'uncontacted',
    lastOrder: null,
    registerTime: '2026-08-25',
  },
]

const tabItems = [
  { key: 'all', label: '全部' },
  { key: 'uncontacted', label: '待首次联系 38' },
  { key: 'following', label: '跟进中 876' },
  { key: 'converted', label: '已转化 1,204' },
  { key: 'no_intent', label: '暂无意向 728' },
]

const metrics = [
  { key: 'all', label: '全部会员', value: '2,846', note: '已完成手机号注册', tone: 'primary' },
  { key: 'new', label: '本月新增', value: '186', note: '较上月 +12%', tone: 'info' },
  { key: 'pending', label: '待转化会员', value: '1,642', note: '注册后尚无有效订单', tone: 'warning' },
  { key: 'follow', label: '待跟进会员', value: '38', note: '超过 3 天未完成首次联系', tone: 'danger' },
]

interface MemberFilters {
  keyword: string
  followStatus: MemberFollowStatus | 'all'
  convertStatus: MemberConvertStatus | 'all'
  date: string
}

export default function MemberList() {
  const { message } = App.useApp()
  const [keyword, setKeyword] = useState('')
  const [followStatus, setFollowStatus] = useState<MemberFollowStatus | 'all'>('all')
  const [convertStatus, setConvertStatus] = useState<MemberConvertStatus | 'all'>('all')
  const [date, setDate] = useState('')
  const [tab, setTab] = useState('all')
  const [applied, setApplied] = useState<MemberFilters>({
    keyword: '',
    followStatus: 'all',
    convertStatus: 'all',
    date: '',
  })

  const filteredData = useMemo(() => {
    return mockMembers.filter((item) => {
      const keywordHit =
        !applied.keyword ||
        item.name.includes(applied.keyword) ||
        item.phone.includes(applied.keyword)
      const followHit = applied.followStatus === 'all' || item.followStatus === applied.followStatus
      const convertHit =
        applied.convertStatus === 'all' || item.convertStatus === applied.convertStatus
      const tabHit =
        tab === 'all' ||
        (tab === 'converted' ? item.convertStatus === 'converted' : item.followStatus === tab)
      return keywordHit && followHit && convertHit && tabHit
    })
  }, [applied, tab])

  const applyFilters = () => {
    setApplied({ keyword: keyword.trim(), followStatus, convertStatus, date })
  }

  const handleReset = () => {
    setKeyword('')
    setFollowStatus('all')
    setConvertStatus('all')
    setDate('')
    setApplied({ keyword: '', followStatus: 'all', convertStatus: 'all', date: '' })
  }

  const handleExport = () => {
    message.info('导出功能将在后端接口就绪后接入')
  }

  const columns = useMemo<ColumnsType<MemberOpsItem>>(
    () => [
      {
        title: '会员 / 手机号',
        key: 'member',
        width: 150,
        render: (_, record) => (
          <div className="member-cell">
            <strong>{record.name}</strong>
            <span>{record.phone}</span>
          </div>
        ),
      },
      {
        title: '运营跟进人',
        dataIndex: 'operator',
        key: 'operator',
        width: 110,
        render: (value: string | null) => value ?? '未关联',
      },
      {
        title: '最近跟进',
        dataIndex: 'lastFollow',
        key: 'lastFollow',
        width: 130,
      },
      {
        title: '转化状态',
        dataIndex: 'convertStatus',
        key: 'convertStatus',
        width: 90,
        render: (value: MemberConvertStatus) => convertStatusText[value],
      },
      {
        title: '跟进状态',
        dataIndex: 'followStatus',
        key: 'followStatus',
        width: 100,
        render: (value: MemberFollowStatus) => (
          <span className={`follow-status follow-status--${value}`}>
            {followStatusText[value]}
          </span>
        ),
      },
      {
        title: '最近订单',
        dataIndex: 'lastOrder',
        key: 'lastOrder',
        width: 110,
        render: (value: string | null) => value ?? '暂无订单',
      },
      {
        title: '注册时间',
        dataIndex: 'registerTime',
        key: 'registerTime',
        width: 110,
      },
      {
        title: '操作',
        key: 'action',
        width: 140,
        render: (_, record) => (
          <>
            <Button
              type="link"
              size="small"
              onClick={() => message.info('会员详情将在后端接口就绪后接入')}
            >
              详情
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() =>
                message.info(record.operator ? '记录跟进功能即将上线' : '认领跟进功能即将上线')
              }
            >
              {record.operator ? '记录跟进' : '认领跟进'}
            </Button>
          </>
        ),
      },
    ],
    [message],
  )

  return (
    <PageContainer
      title="会员管理"
      description="管理注册会员、运营跟进记录与订单转化状态"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleExport}>
          导出会员
        </Button>
      }
    >
      <div className="member-list">
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

        <Card variant="borderless" className="filter-bar member-list__filter">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="会员姓名或手机号"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Select
            value={followStatus}
            onChange={setFollowStatus}
            options={[
              { label: '全部跟进状态', value: 'all' },
              { label: '待首次联系', value: 'uncontacted' },
              { label: '跟进中', value: 'following' },
              { label: '暂无意向', value: 'no_intent' },
            ]}
          />
          <Select
            value={convertStatus}
            onChange={setConvertStatus}
            options={[
              { label: '全部转化状态', value: 'all' },
              { label: '待转化', value: 'pending' },
              { label: '已转化', value: 'converted' },
            ]}
          />
          <Input
            allowClear
            placeholder="注册时间"
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
              <span className="list-card__header__title">会员列表</span>
              <span className="list-card__header__tips">共 2,846 位会员 · 待跟进 38 位</span>
            </div>
            <Radio.Group
              className="list-card__status-filter"
              optionType="button"
              value={tab}
              onChange={(event) => setTab(event.target.value)}
              options={tabItems.map((item) => ({ value: item.key, label: item.label }))}
            />
          </div>
          <Table<MemberOpsItem>
            rowKey="id"
            columns={columns}
            dataSource={filteredData}
            pagination={{ total: 2846, pageSize: 6, current: 1, showSizeChanger: false }}
          />
        </Card>
      </div>
    </PageContainer>
  )
}
