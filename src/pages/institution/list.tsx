/**
 * 机构管理 - 机构列表
 * 视觉对齐设计稿：统计卡 + 筛选区 + 机构列表表格
 * 当前为 mock 数据，后端就绪后替换为 institutionApi.getInstitutionList
 */
import { useMemo, useState } from 'react'
import type { Key } from 'react'
import { App, Button, Card, Col, Input, Row, Select, Table, Tag, Space, Tooltip, Modal } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { BarChartOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import type { InstitutionItem, InstitutionType, InstitutionStatus } from '@/api/modules/institution'
import './list.less'

type Tone = 'success' | 'info' | 'warning' | 'danger'

const typeText: Record<InstitutionType, string> = {
  1: '护理院',
  2: '驿站',
}

const statusText: Record<InstitutionStatus, string> = {
  1: '启用',
  9: '停用',
}

const mockInstitutions: InstitutionItem[] = [
  {
    id: 1,
    code: 'JG0001',
    name: '幸福里健康驿站',
    type: 2,
    name_en: '',
    province: '浙江省', // 省
    city: '杭州市', // 市
    district: '拱墅区', // 区
    address: '申花街道莫干山路 987 号',
    contact_phone: '0571-8876 1028',
    brief: '专业照护，安心颐养',
    description: '面向长者提供专业护理、康复训练、慢病管理与健康咨询服务。院内配备专业医护团队和适老化环境，为长者提供安全、温暖、有尊严的照护体验。',
    images: [],
    manager_name: '',
    manager_phone: '',
    service_radius_km: 10,
    status: 1,
    created_at: 1788244635,
  },
  {
    id: 2,
    code: 'JG0002',
    name: '康乐护理院',
    type: 1,
    name_en: '',
    province: '浙江省', // 省
    city: '杭州市', // 市
    district: '西湖区', // 区
    address: '古荡街道文三西路 428 号',
    contact_phone: '0571-8899 2631',
    brief: '专业照护，安心颐养',
    description: '面向长者提供专业护理、康复训练、慢病管理与健康咨询服务。院内配备专业医护团队和适老化环境，为长者提供安全、温暖、有尊严的照护体验。',
    images: [],
    manager_name: '',
    manager_phone: '',
    service_radius_km: 10,
    status: 9,
    created_at: 1788244635
  },
  {
    id: 3,
    code: 'JG0003',
    name: '怡康护理院',
    type: 1,
    name_en: '',
    province: '浙江省', // 省
    city: '杭州市', // 市
    district: '上城区', // 区
    address: '笕桥街道',
    contact_phone: '0571-8899 2631',
    brief: '专业照护，安心颐养',
    description: '面向长者提供专业护理、康复训练、慢病管理与健康咨询服务。院内配备专业医护团队和适老化环境，为长者提供安全、温暖、有尊严的照护体验。',
    images: [],
    manager_name: '',
    manager_phone: '',
    service_radius_km: 10,
    status: 1,
    created_at: 1788244635
  },
  {
    id: 4,
    code: 'JG0004',
    name: '长青健康驿站',
    type: 2,
    name_en: '',
    province: '浙江省', // 省
    city: '杭州市', // 市
    district: '滨江区', // 区
    address: '长河街道江虹路 611 号',
    contact_phone: '0571-8899 2631',
    brief: '专业照护，安心颐养',
    description: '面向长者提供专业护理、康复训练、慢病管理与健康咨询服务。院内配备专业医护团队和适老化环境，为长者提供安全、温暖、有尊严的照护体验。',
    images: [],
    manager_name: '',
    manager_phone: '',
    service_radius_km: 10,
    status: 1,
    created_at: 1788244635
  },
  {
    id: 5,
    code: 'JG0005',
    name: '和悦护理院',
    type: 1,
    name_en: '',
    province: '浙江省', // 省
    city: '杭州市', // 市
    district: '萧山区', // 区
    address: '北干街道金城路 226 号',
    contact_phone: '0571-8899 2631',
    brief: '专业照护，安心颐养',
    description: '面向长者提供专业护理、康复训练、慢病管理与健康咨询服务。院内配备专业医护团队和适老化环境，为长者提供安全、温暖、有尊严的照护体验。',
    images: [],
    manager_name: '',
    manager_phone: '',
    service_radius_km: 10,
    status: 9,
    created_at: 1788244635
  },
]

interface MetricCard {
  key: string
  label: string
  value: number
  badge: string
  tone: Tone
}

/** 上停用目标：action=offline 走「停用原因」流程，action=online 走确认启用流程 */
interface StatusTarget {
  ids: number[]
  title: string
  code?: string
  action: 'online' | 'offline'
}

export default function InstitutionList() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [data, setData] = useState(mockInstitutions)
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState<InstitutionType | null>(null)
  const [status, setStatus] = useState<InstitutionStatus | null>(null)
  const [applied, setApplied] = useState({
    keyword: '',
    status,
    type
  })
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [statusTarget, setStatusTarget] = useState<StatusTarget | null>(null)
  const [offlineReason, setOfflineReason] = useState('')

  const selectedItems = useMemo(
    () => data.filter((item) => selectedRowKeys.includes(item.id)),
    [data, selectedRowKeys],
  )
  const selectedStatuses = useMemo(
    () => new Set(selectedItems.map((item) => item.status)),
    [selectedItems],
  )

  /** 勾选非空且状态一致时才允许批量操作 */
  const batchEnabled = selectedItems.length > 0 && selectedStatuses.size === 1

  /** 状态一致时的批量方向：已启用 → 批量停用；草稿/已停用 → 批量启用 */
  const batchAction: 'online' | 'offline' =
    selectedItems[0]?.status === 1 ? 'offline' : 'online'

  const batchTooltip = !selectedItems.length
    ? '请先勾机构'
    : selectedStatuses.size > 1
      ? '所选择的机构状态不一致，无法批量启用/停用'
      : ''

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const keywordHit =
        !applied.keyword ||
        item.name.includes(applied.keyword) ||
        item.code.toLowerCase().includes(applied.keyword.toLowerCase())
      const type = !applied.type|| item.type === applied.type
      const status = !applied.status || item.status === applied.status
      return keywordHit && type && status
    })
  }, [applied, data])

  const metrics: MetricCard[] = useMemo(() => {
    const normal = data.filter((item) => item.status === 1).length
    const paused = data.filter((item) => item.status === 9).length
    const nursingHome = data.filter((item) => item.type === 1).length
    const postStation = data.filter((item) => item.type === 2).length
    return [
      { key: 'nursingHome', label: '护理院', value: nursingHome, badge: '护理院文案', tone: 'info' },
      { key: 'postStation', label: '驿站', value: postStation, badge: '驿站文案', tone: 'info' },
      { key: 'normal', label: '正常经营', value: normal, badge: '覆盖 8 个服务区域', tone: 'success' },
      { key: 'paused', label: '暂停经营', value: paused, badge: '用户端已停止展示', tone: 'danger' },
    ]
  }, [data])

  const handleQuery = () => {
    setApplied({ keyword: keyword.trim(), type, status })
  }

  const handleReset = () => {
    setKeyword('')
    setType(null)
    setStatus(null)
    setApplied({ keyword: '', type: null, status: null})
  }

  const handleEnable = (record: InstitutionItem) => {
    Modal.confirm({
      title: '启用机构',
      content: `确认启用 “${record.name}” ？`,
      okText: '确认启用',
      cancelText: '取消',
      onOk: () => {
        setData((prev) =>
          prev.map((item) => (item.id === record.id ? { ...item, status: 1 } : item)),
        )
        message.success(`${record.name} 已启用`)
      },
    })
  }

  const columns = useMemo<ColumnsType<InstitutionItem>>(
    () => [
      {
        title: '机构',
        key: 'name',
        render: (_, record) => (
          <div className="institution-cell">
            <strong>{record.name}</strong>
            <span>机构编码：{record.code}</span>
          </div>
        ),
      },
      {
        title: '经营地址',
        key: 'address',
        render: (_, record) => (
          <div className="institution-cell">
            <strong>{record.address}</strong>
            <span>{record.province}.{record.city}.{record.district}</span>
          </div>
        ),
      },
      { title: '联系电话', dataIndex: 'contact_phone', key: 'contact_phone', width: 150 },
      // {
      //   title: '已配服务',
      //   dataIndex: 'serviceCount',
      //   key: 'serviceCount',
      //   width: 90,
      //   render: (value: number) => (value ? `${value} 项` : '—'),
      // },
      // {
      //   title: '商品 / 服务',
      //   key: 'productService',
      //   width: 110,
      //   render: (_, record) => (
      //     <div className="institution-cell">
      //       <strong>{record.productCount} / {record.serviceTotal}</strong>
      //       <span>商品 / 服务</span>
      //     </div>
      //   ),
      // },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 120,
        render: (type: InstitutionType) => (
          <Tag color={type === 1 ? 'blue' : 'purple'} variant='outlined'>{typeText[type]}</Tag>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (status: InstitutionStatus) => (
          <span className={`status-btn ${status === 1 ? 'status--success' : 'status--danger'}`}>{statusText[status]}</span>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 150,
        render: (_, record) => (
          <Space>
            <Button type="link" size="small" onClick={() => navigate(`/institution/detail/${record.id}`)}>
              查看详情
            </Button>
            {record.status === 9 ? (
              <Button type="link" size="small" onClick={() => handleEnable(record)}>
                启用
              </Button>
            ) : <Button type="link" size="small" danger onClick={() => openOfflineModal(record)}>
              停用
            </Button>}
          </Space>
        ),
      },
    ],
    [message, navigate],
  )

  const openOfflineModal = (record: InstitutionItem) => {
    setOfflineReason('')
    setStatusTarget({
      ids: [record.id],
      title: `机构 · ${record.name}`,
      code: record.code,
      action: 'offline',
    })
  }

  const openBatchStatusModal = () => {
    if (!selectedItems.length) {
      message.warning('请先勾选服务项目')
      return
    }
    if (selectedStatuses.size > 1) {
      message.warning('所选择的服务状态不一致，无法批量启用/停用')
      return
    }

    const ids = selectedItems.map((item) => item.id)
    setOfflineReason('')
    setStatusTarget(
      batchAction === 'offline'
        ? { ids, title: `批量停用 ${ids.length} 个机构`, action: 'offline' }
        : { ids, title: `批量启用 ${ids.length} 个机构`, action: 'online' },
    )
  }

  const handleConfirmStatusChange = () => {
    if (!statusTarget) return
    if (statusTarget.action === 'offline') {
      if (offlineReason.trim().length < 5) {
        message.warning('请填写停用原因，至少 5 个字')
        return
      }
      setData((prev) =>
        prev.map((item) => (statusTarget.ids.includes(item.id) ? { ...item, status: 9 } : item)),
      )
      message.success(`已停用 ${statusTarget.ids.length} 个机构`)
    } else {
      setData((prev) =>
        prev.map((item) => (statusTarget.ids.includes(item.id) ? { ...item, status: 1 } : item)),
      )
      message.success(`已启用 ${statusTarget.ids.length} 个机构`)
    }
    setStatusTarget(null)
    setSelectedRowKeys([])
  }

  return (
    <PageContainer
      title="机构管理"
      description="护理院与健康驿站作为自营机构参与平台经营，机构信息由平台直接维护"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/institution/create')}>
          添加机构
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
                  <i className={`metric-card__icon status--${metric.tone}`}>
                    <BarChartOutlined />
                  </i>
                </div>
                <div className="metric-card__value">{metric.value}</div>
                <span className={`metric-card__note status--${metric.tone}`}>
                  {metric.badge}
                </span>
              </Card>
            </Col>
          ))}
        </Row>

        <Card variant="borderless" className="filter-bar">
          <Input
            allowClear
            placeholder="搜索机构名称、编码、地址"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={handleQuery}
          />
          <Select
            placeholder='机构类型'
            allowClear
            value={type}
            onChange={setType}
            options={([1, 2] as InstitutionType[]).map((key) => ({
              label: typeText[key],
              value: key,
            }))}
          />
          <Select
            placeholder='机构状态'
            allowClear
            value={status}
            onChange={setStatus}
            options={([1, 9] as InstitutionStatus[]).map((key) => ({
              label: statusText[key],
              value: key,
            }))}
          />
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={handleQuery}>查询</Button>
        </Card>

        <Card variant="borderless" className="list-card">
          <div className="list-card__header">
            <span className='list-card__header__title'>机构列表</span>
            <Tooltip title={batchTooltip}>
              {/* disabled 按钮不触发鼠标事件，需包一层 span 才能展示 Tooltip */}
              <span>
                <Button disabled={!batchEnabled} onClick={openBatchStatusModal}>
                  批量启用/停用
                </Button>
              </span>
            </Tooltip>
          </div>
          <Table<InstitutionItem>
            rowKey="id"
            size='small'
            columns={columns}
            dataSource={filteredData}
            rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
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
        open={!!statusTarget}
        title={statusTarget?.action === 'online' ? '启用机构' : '停用机构'}
        onCancel={() => setStatusTarget(null)}
        footer={
          <div className="offline-modal__footer">
            <Button onClick={() => setStatusTarget(null)}>取消</Button>
            {statusTarget?.action === 'online' ? (
              <Button type="primary" onClick={handleConfirmStatusChange}>
                确认启用
              </Button>
            ) : (
              <Button danger type="primary" onClick={handleConfirmStatusChange}>
                确认停用
              </Button>
            )}
          </div>
        }
      >
        {statusTarget && (
          <div className="offline-modal">
            {statusTarget.action === 'offline' ? (
              <>
                <div className="offline-modal__warning">
                  <strong>停用后用户端将立即停止展示和预约</strong>
                  <p>已产生的预约订单不受影响，仍按原履约流程处理。</p>
                </div>
                <div className="offline-modal__service">
                  <span>{statusTarget.title}</span>
                  <span>{statusTarget.code ?? `${statusTarget.ids.length} 项`}</span>
                </div>
                <div className="offline-modal__reason">
                  <label>停用原因 <i>*</i></label>
                  <Input.TextArea
                    rows={4}
                    placeholder="请填写停用原因，至少 5 个字"
                    value={offlineReason}
                    onChange={(event) => setOfflineReason(event.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="offline-modal__warning" style={{background: '#e8f4f0'}}>
                  <strong>启用后机构可选择添加该服务</strong>
                  <p>机构添加时继承集团基础信息与价格，再配置线上履约规则。</p>
                </div>
                <div className="offline-modal__service">
                  <span>{statusTarget.title}</span>
                  <span>{statusTarget.code ?? `${statusTarget.ids.length} 项`}</span>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </PageContainer>
  )
}
