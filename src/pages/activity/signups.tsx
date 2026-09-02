/**
 * 活动管理 - 活动详情（原报名查询页）
 * 从活动列表「查看」进入：活动摘要统计 + 报名记录筛选 / Tabs + 取消报名确认弹窗
 * 当前为 mock 数据，后端就绪后替换为 activityApi.getActivitySignups
 */
import { useMemo, useState } from 'react'
import { App, Button, Card, Col, Input, Modal, Radio, Row, Select, Table, Space } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined, BarChartOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import type { ActivitySignup } from '@/api/modules/activity'
import './signups.less'

const activityMeta: Record<string, { name: string; code: string; time: string }> = {
  '1': { name: '秋日康养游园会', code: 'HD20260808001', time: '2026-08-18 09:00–11:30' },
  '2': { name: '西湖无障碍一日游', code: 'HD20260807002', time: '2026-08-18 08:00–17:00' },
  '3': { name: '失能长者照护课堂', code: 'HD20260807003', time: '2026-08-25 14:00–16:00' },
  '5': { name: '温泉康养两日游', code: 'HD20260806011', time: '2026-09-12 07:30' },
  '6': { name: '夏季防暑讲座', code: 'HD20260805096', time: '2026-07-15 14:00–15:30' },
}

const initialSignups: ActivitySignup[] = [
  {
    id: '1',
    code: 'BM20260818001',
    userName: '王阿姨',
    phone: '138****1026',
    institutionName: '幸福里健康驿站',
    institutionArea: '拱墅区·申花街道',
    status: 'signed',
    signupTime: '08-12 10:24',
    remark: '需要轮椅协助',
  },
  {
    id: '2',
    code: 'BM20260818002',
    userName: '李大伯',
    phone: '136****8871',
    institutionName: '康乐护理院',
    institutionArea: '西湖区·古荡街道',
    status: 'signed',
    signupTime: '08-12 11:05',
  },
  {
    id: '3',
    code: 'BM20260818003',
    userName: '陈阿姨',
    phone: '135****2230',
    institutionName: '长青健康驿站',
    institutionArea: '滨江区·长河街道',
    status: 'signed',
    signupTime: '08-13 09:12',
    remark: '家属陪同 1 人',
  },
  {
    id: '4',
    code: 'BM20260818004',
    userName: '周大伯',
    phone: '139****5567',
    institutionName: '幸福里健康驿站',
    institutionArea: '拱墅区·申花街道',
    status: 'cancelled',
    signupTime: '08-13 14:40',
    remark: '用户主动取消',
  },
  {
    id: '5',
    code: 'BM20260818005',
    userName: '吴阿姨',
    phone: '137****9012',
    institutionName: '康乐护理院',
    institutionArea: '西湖区·古荡街道',
    status: 'signed',
    signupTime: '08-14 08:33',
  },
  {
    id: '6',
    code: 'BM20260818006',
    userName: '郑大伯',
    phone: '150****3345',
    institutionName: '长青健康驿站',
    institutionArea: '滨江区·长河街道',
    status: 'cancelled',
    signupTime: '08-14 16:21',
    remark: '活动时间冲突',
  },
]

const tabItems = [
  { key: 'all', label: '全部 36' },
  { key: 'signed', label: '已报名 34' },
  { key: 'cancelled', label: '已取消 2' },
]

interface SignupFilters {
  keyword: string
  institution: string
  status: 'all' | 'signed' | 'cancelled'
  date: string
}

export default function ActivitySignups() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const params = useParams<{ id: string }>()
  const activityId = params.id ?? '1'
  const activity = activityMeta[activityId] ?? activityMeta['1']

  const [data, setData] = useState(initialSignups)
  const [keyword, setKeyword] = useState('')
  const [institution, setInstitution] = useState('all')
  const [status, setStatus] = useState<SignupFilters['status']>('all')
  const [date, setDate] = useState('')
  const [tab, setTab] = useState('all')
  const [applied, setApplied] = useState<SignupFilters>({
    keyword: '',
    institution: 'all',
    status: 'all',
    date: '',
  })
  const [cancelTarget, setCancelTarget] = useState<ActivitySignup | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const keywordHit =
        !applied.keyword ||
        item.userName.includes(applied.keyword) ||
        item.code.toLowerCase().includes(applied.keyword.toLowerCase()) ||
        item.phone.includes(applied.keyword)
      const institutionHit =
        applied.institution === 'all' || item.institutionName === applied.institution
      const statusHit = applied.status === 'all' || item.status === applied.status
      const tabHit = tab === 'all' || item.status === tab
      return keywordHit && institutionHit && statusHit && tabHit
    })
  }, [applied, data, tab])

  const metrics = [
    { key: 'total', label: '报名人数', value: 36, badge: '含已取消', tone: 'primary' },
    { key: 'institution', label: '参与机构', value: 4, badge: '用户报名时可选择', tone: 'info' },
    { key: 'signed', label: '已报名', value: 34, badge: '名单实时同步机构', tone: 'warning' },
    { key: 'cancelled', label: '已取消', value: 2, badge: '不涉及退款', tone: 'danger'},
  ]

  const applyFilters = () => {
    setApplied({ keyword: keyword.trim(), institution, status, date })
  }

  const handleReset = () => {
    setKeyword('')
    setInstitution('all')
    setStatus('all')
    setDate('')
    setApplied({ keyword: '', institution: 'all', status: 'all', date: '' })
  }

  const handleConfirmCancel = () => {
    if (!cancelTarget) return
    setData((prev) =>
      prev.map((item) => (item.id === cancelTarget.id ? { ...item, status: 'cancelled' } : item)),
    )
    message.success(`已取消 ${cancelTarget.userName} 的报名`)
    setCancelTarget(null)
  }

  const columns = useMemo<ColumnsType<ActivitySignup>>(
    () => [
      {
        title: '报名 / 参与人',
        key: 'userName',
        render: (_, record) => (
          <div className="signup-user">
            <strong>{record.userName}</strong>
            <span>{record.code}</span>
          </div>
        ),
      },
      {
        title: '联系方式',
        dataIndex: 'phone',
        key: 'phone',
        width: 130,
      },
      {
        title: '所选机构',
        dataIndex: 'institutionName',
        key: 'institutionName',
        width: 150,
      },
      {
        title: '机构区域',
        dataIndex: 'institutionArea',
        key: 'institutionArea',
        width: 150,
      },
      {
        title: '报名状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (value: ActivitySignup['status']) => (
          <span className={`signup-status signup-status--${value}`}>
            {value === 'signed' ? '已报名' : '已取消'}
          </span>
        ),
      },
      {
        title: '报名时间',
        dataIndex: 'signupTime',
        key: 'signupTime',
        width: 120,
      },
      {
        title: '备注',
        dataIndex: 'remark',
        key: 'remark',
        render: (value?: string) => value ?? '—',
      },
      {
        title: '操作',
        key: 'action',
        width: 110,
        render: (_, record) =>
          record.status === 'signed' ? (
            <Button type="link" size="small" danger onClick={() => setCancelTarget(record)}>
              取消报名
            </Button>
          ) : (
            <Button
              type="link"
              size="small"
              onClick={() => message.info(`报名编号 ${record.code}，备注：${record.remark ?? '无'}`)}
            >
              详情
            </Button>
          ),
      },
    ],
    [message],
  )

  return (
    <PageContainer
      title={activity.name}
      description={`活动编号 ${activity.code} · 免费活动 · ${activity.time} · 用户报名时选择参加机构`}
      extra={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/activity')}>
            返回活动列表
          </Button>
          <Button type="primary" onClick={() => navigate(`/activity/detail/${activityId}`)}>
            编辑活动
          </Button>
        </Space>
      }
    >
      <div className="activity-signups">
        <Row gutter={[16, 16]}>
          {metrics.map((metric) => (
            <Col xs={24} sm={12} lg={6} key={metric.key}>
              <Card variant="borderless" className="metric-card">
                <div className="metric-card__head">
                  <span className="metric-card__label">{metric.label}</span>
                  <i className={`metric-card__icon metric-card__icon--${metric.tone} metric-card__icon--round`}>
                    <BarChartOutlined />
                  </i>
                </div>
                <div className="metric-card__value">{metric.value}</div>
                <span className={`metric-card__note metric-card__note--${metric.tone}`}>
                  {metric.badge}
                </span>
              </Card>
            </Col>
          ))}
        </Row>

        <Card variant="borderless" className="filter-bar activity-signups__filter">
          <Input
            allowClear
            placeholder="报名编号 / 姓名或手机号"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applyFilters}
          />
          <Select
            value={institution}
            onChange={setInstitution}
            options={[
              { label: '全部所选机构', value: 'all' },
              { label: '幸福里健康驿站', value: '幸福里健康驿站' },
              { label: '康乐护理院', value: '康乐护理院' },
              { label: '长青健康驿站', value: '长青健康驿站' },
            ]}
          />
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { label: '全部报名状态', value: 'all' },
              { label: '已报名', value: 'signed' },
              { label: '已取消', value: 'cancelled' },
            ]}
          />
          <Input
            allowClear
            placeholder="报名日期"
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
              <span className="list-card__header__title">报名记录</span>
              <span className="list-card__header__tips">名单实时同步到对应参与机构</span>
            </div>
            <Radio.Group
              className="list-card__status-filter"
              optionType="button"
              value={tab}
              onChange={(event) => setTab(event.target.value)}
              options={tabItems.map((item) => ({ value: item.key, label: item.label }))}
            />
          </div>
          <Table<ActivitySignup>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={filteredData}
            pagination={{
              current: page,
              pageSize,
              total: filteredData.length,
              onChange: setPage,
              showTotal: (total) => `共 ${total} 条`
            }}
          />
        </Card>
      </div>

      <Modal
        open={!!cancelTarget}
        title="取消报名"
        onCancel={() => setCancelTarget(null)}
        footer={
          <div className="cancel-modal__footer">
            <Button onClick={() => setCancelTarget(null)}>暂不取消</Button>
            <Button danger type="primary" onClick={handleConfirmCancel}>
              确认取消
            </Button>
          </div>
        }
      >
        {cancelTarget && (
          <div className="cancel-modal">
            <p className="cancel-modal__desc">
              确认取消以下用户的活动报名吗？取消后名单将同步更新。
            </p>
            <div className="cancel-modal__user">
              <strong>
                {cancelTarget.userName} {cancelTarget.phone}
              </strong>
              <span>
                {activity.name} · {cancelTarget.institutionName}
              </span>
            </div>
            <p className="cancel-modal__danger">
              此操作不涉及退款，仅将报名状态更新为“已取消”。
            </p>
          </div>
        )}
      </Modal>
    </PageContainer>
  )
}
