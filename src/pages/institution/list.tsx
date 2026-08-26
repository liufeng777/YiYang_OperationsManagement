/**
 * 机构管理 - 机构列表
 * 视觉对齐设计稿：统计卡 + 筛选区 + 机构列表表格
 * 当前为 mock 数据，后端就绪后替换为 institutionApi.getInstitutionList
 */
import { useMemo, useState } from 'react'
import { App, Button, Card, Col, Input, Row, Select, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import type { InstitutionItem, OperationStatus, SyncStatus } from '@/api/modules/institution'
import './list.less'

type Tone = 'primary' | 'info' | 'warning' | 'danger'

const syncText: Record<SyncStatus, string> = {
  synced: '已同步',
  updating: '更新中',
}

const operationText: Record<OperationStatus, string> = {
  normal: '正常经营',
  pending: '资料待完善',
  paused: '暂停经营',
}

const mockInstitutions: InstitutionItem[] = [
  {
    id: '1',
    code: 'JG0001',
    name: '幸福里健康驿站',
    type: '健康驿站',
    source: '医养协作平台',
    region: '拱墅区',
    street: '申花街道',
    address: '莫干山路 987 号',
    contactPhone: '0571-8876 1028',
    serviceCount: 12,
    productCount: 18,
    serviceTotal: 12,
    syncStatus: 'synced',
    operationStatus: 'normal',
  },
  {
    id: '2',
    code: 'JG0002',
    name: '康乐护理院',
    type: '护理院',
    source: '医养协作平台',
    region: '西湖区',
    street: '古荡街道',
    address: '文三西路 428 号',
    contactPhone: '0571-8899 2631',
    serviceCount: 7,
    productCount: 11,
    serviceTotal: 8,
    syncStatus: 'synced',
    operationStatus: 'normal',
  },
  {
    id: '3',
    code: 'JG0003',
    name: '怡康护理院',
    type: '护理院',
    source: '医养协作平台',
    region: '上城区',
    street: '笕桥街道',
    address: '地址坐标待完善',
    contactPhone: '0571-8602 7718',
    serviceCount: 0,
    productCount: 6,
    serviceTotal: 5,
    syncStatus: 'synced',
    operationStatus: 'pending',
  },
  {
    id: '4',
    code: 'JG0004',
    name: '长青健康驿站',
    type: '健康驿站',
    source: '医养协作平台',
    region: '滨江区',
    street: '长河街道',
    address: '江虹路 611 号',
    contactPhone: '0571-8661 9205',
    serviceCount: 6,
    productCount: 9,
    serviceTotal: 7,
    syncStatus: 'updating',
    operationStatus: 'normal',
  },
  {
    id: '5',
    code: 'JG0005',
    name: '和悦护理院',
    type: '护理院',
    source: '医养协作平台',
    region: '萧山区',
    street: '北干街道',
    address: '金城路 226 号',
    contactPhone: '0571-8288 3072',
    serviceCount: 12,
    productCount: 7,
    serviceTotal: 6,
    syncStatus: 'synced',
    operationStatus: 'paused',
  },
]

interface MetricCard {
  key: string
  label: string
  value: number
  badge: string
  tone: Tone
}

export default function InstitutionList() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [data, setData] = useState(mockInstitutions)
  const [keyword, setKeyword] = useState('')
  const [syncStatus, setSyncStatus] = useState<SyncStatus | 'all'>('all')
  const [operationStatus, setOperationStatus] = useState<OperationStatus | 'all'>('all')
  const [region, setRegion] = useState<string>('all')
  const [applied, setApplied] = useState({
    keyword: '',
    syncStatus: 'all' as SyncStatus | 'all',
    operationStatus: 'all' as OperationStatus | 'all',
    region: 'all',
  })

  const regionOptions = useMemo(
    () => Array.from(new Set(data.map((item) => item.region))).map((item) => ({ label: item, value: item })),
    [data],
  )

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const keywordHit =
        !applied.keyword ||
        item.name.includes(applied.keyword) ||
        item.code.toLowerCase().includes(applied.keyword.toLowerCase())
      const syncHit = applied.syncStatus === 'all' || item.syncStatus === applied.syncStatus
      const operationHit = applied.operationStatus === 'all' || item.operationStatus === applied.operationStatus
      const regionHit = applied.region === 'all' || item.region === applied.region
      return keywordHit && syncHit && operationHit && regionHit
    })
  }, [applied, data])

  const metrics: MetricCard[] = useMemo(() => {
    const normal = data.filter((item) => item.operationStatus === 'normal').length
    const pending = data.filter((item) => item.operationStatus === 'pending').length
    const paused = data.filter((item) => item.operationStatus === 'paused').length
    return [
      { key: 'all', label: '全部机构', value: data.length, badge: '全部来自机构同步', tone: 'primary' },
      { key: 'normal', label: '正常经营', value: normal, badge: '覆盖 8 个服务区域', tone: 'info' },
      { key: 'pending', label: '资料待完善', value: pending, badge: '地址或服务半径缺失', tone: 'warning' },
      { key: 'paused', label: '暂停经营', value: paused, badge: '用户端已停止展示', tone: 'danger' },
    ]
  }, [data])

  const handleQuery = () => {
    setApplied({ keyword: keyword.trim(), syncStatus, operationStatus, region })
  }

  const handleReset = () => {
    setKeyword('')
    setSyncStatus('all')
    setOperationStatus('all')
    setRegion('all')
    setApplied({ keyword: '', syncStatus: 'all', operationStatus: 'all', region: 'all' })
  }

  const handleResume = (record: InstitutionItem) => {
    setData((prev) =>
      prev.map((item) => (item.id === record.id ? { ...item, operationStatus: 'normal' } : item)),
    )
    message.success(`${record.name} 已恢复经营`)
  }

  const columns = useMemo<ColumnsType<InstitutionItem>>(
    () => [
      {
        title: '机构',
        key: 'name',
        width: 180,
        render: (_, record) => (
          <div className="institution-cell">
            <strong>{record.name}</strong>
            <span>机构编码：{record.code}</span>
          </div>
        ),
      },
      { title: '机构来源', dataIndex: 'source', key: 'source', width: 120 },
      {
        title: '经营地址',
        key: 'address',
        width: 180,
        render: (_, record) => (
          <div className="institution-cell">
            <strong>{record.region} · {record.street}</strong>
            <span>{record.address}</span>
          </div>
        ),
      },
      { title: '联系电话', dataIndex: 'contactPhone', key: 'contactPhone', width: 140 },
      {
        title: '已配服务',
        dataIndex: 'serviceCount',
        key: 'serviceCount',
        width: 90,
        render: (value: number) => (value ? `${value} 项` : '—'),
      },
      {
        title: '商品 / 服务',
        key: 'productService',
        width: 110,
        render: (_, record) => (
          <div className="institution-cell">
            <strong>{record.productCount} / {record.serviceTotal}</strong>
            <span>商品 / 服务</span>
          </div>
        ),
      },
      {
        title: '同步状态',
        dataIndex: 'syncStatus',
        key: 'syncStatus',
        width: 110,
        render: (status: SyncStatus) => (
          <span className={`status-pill status-pill--sync-${status}`}>
            <i className="status-pill__dot" />
            {syncText[status]}
          </span>
        ),
      },
      {
        title: '经营状态',
        dataIndex: 'operationStatus',
        key: 'operationStatus',
        width: 120,
        render: (status: OperationStatus) => (
          <span className={`status-pill status-pill--op-${status}`}>
            <i className="status-pill__dot" />
            {operationText[status]}
          </span>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 150,
        render: (_, record) => (
          <div className="institution-actions">
            {record.operationStatus === 'paused' ? (
              <Button type="link" size="small" onClick={() => handleResume(record)}>
                恢复经营
              </Button>
            ) : record.operationStatus === 'pending' ? (
              <Button
                type="link"
                size="small"
                onClick={() => navigate(`/institution/detail/${record.id}?tab=base`)}
              >
                完善资料
              </Button>
            ) : record.syncStatus === 'updating' ? (
              <Button type="link" size="small" onClick={() => message.info('同步进度查询开发中')}>
                查看进度
              </Button>
            ) : (
              <Button
                type="link"
                size="small"
                onClick={() => navigate(`/institution/detail/${record.id}`)}
              >
                查看详情
              </Button>
            )}
            {record.operationStatus === 'paused' ? (
              <Button
                type="link"
                size="small"
                onClick={() => navigate(`/institution/detail/${record.id}`)}
              >
                查看详情
              </Button>
            ) : (
              <Button
                type="link"
                size="small"
                onClick={() => navigate(`/institution/detail/${record.id}?tab=base`)}
              >
                编辑资料
              </Button>
            )}
          </div>
        ),
      },
    ],
    [message, navigate],
  )

  return (
    <PageContainer
      title="机构管理"
      description="护理院与健康驿站由医养协作平台同步，作为自营机构参与平台经营"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => message.success('已发起机构同步')}>
          同步机构
        </Button>
      }
    >
      <div className="institution-page">
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

        <Card variant="borderless" className="filter-bar">
          <Input
            style={{width: 300}}
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索机构名称、机构编码"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={handleQuery}
          />
          <Select
            style={{width: 170}}
            value={syncStatus}
            onChange={setSyncStatus}
            options={[
              { label: '全部同步状态', value: 'all' },
              { label: '已同步', value: 'synced' },
              { label: '更新中', value: 'updating' },
            ]}
          />
          <Select
             style={{width: 170}}
            value={operationStatus}
            onChange={setOperationStatus}
            options={[
              { label: '全部经营状态', value: 'all' },
              { label: '正常经营', value: 'normal' },
              { label: '资料待完善', value: 'pending' },
              { label: '暂停经营', value: 'paused' },
            ]}
          />
          <Select
            style={{width: 170}}
            value={region}
            onChange={setRegion}
            options={[{ label: '全部区域', value: 'all' }, ...regionOptions]}
          />
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={handleQuery}>查询</Button>
        </Card>

        <Card variant="borderless" className="list-card">
          <div className="list-card__header">
            <span className='list-card__header__title'>机构列表</span>
            <span className='list-card__header__tips'>共 {filteredData.length} 家机构</span>
          </div>
          <Table<InstitutionItem>
            rowKey="id"
            size='small'
            columns={columns}
            dataSource={filteredData}
            pagination={{
              total: filteredData.length,
              pageSize: 10,
              showSizeChanger: false,
              hideOnSinglePage: true,
            }}
          />
        </Card>
      </div>
    </PageContainer>
  )
}
