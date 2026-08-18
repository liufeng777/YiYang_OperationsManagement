/**
 * 机构管理 - 机构详情 / 患者端介绍
 * - /institution/detail/:id 默认展示「服务项目」
 * - /institution/patient-intro?id=xx 默认展示「患者端介绍」，并命中侧边栏对应菜单
 * 当前为 mock 数据，后端就绪后替换为 institutionApi 对应接口
 */
import { useEffect, useMemo, useState } from 'react'
import {
  App,
  Alert,
  Button,
  Card,
  Checkbox,
  Drawer,
  Input,
  Modal,
  Radio,
  Select,
  Switch,
  Table,
  Tabs,
  Tag,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  CheckOutlined,
  InfoCircleFilled,
  PhoneOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import type {
  InstitutionDetail,
  InstitutionService,
  ServicePoolItem,
} from '@/api/modules/institution'
import './detail.less'

type DetailTab = 'base' | 'services' | 'patient' | 'operation'

const institutionMocks: Record<string, InstitutionDetail> = {
  '1': {
    id: '1',
    code: 'JG0001',
    name: '幸福里健康驿站',
    type: '健康驿站',
    source: '医养协作平台',
    region: '拱墅区',
    street: '申花街道',
    address: '杭州市拱墅区申花街道莫干山路 987 号',
    contactPhone: '0571-8876 1028',
    serviceCount: 12,
    productCount: 18,
    serviceTotal: 12,
    syncStatus: 'synced',
    operationStatus: 'normal',
    lastSyncTime: '2026-08-10 15:20',
    onlineRange: '机构电子围栏 5 公里',
    intro: {
      displayTitle: '幸福颐养护理院 · 专业照护，安心颐养',
      description:
        '幸福颐养护理院面向长者提供专业护理、康复训练、慢病管理与健康咨询服务。院内配备专业医护团队和适老化环境，为长者提供安全、温暖、有尊严的照护体验。',
      tags: ['医护团队', '康复照护', '适老环境'],
      visible: true,
      photos: ['接待大厅', '康复空间', '适老房间'],
    },
  },
  '2': {
    id: '2',
    code: 'JG0002',
    name: '康乐护理院',
    type: '护理院',
    source: '医养协作平台',
    region: '西湖区',
    street: '古荡街道',
    address: '杭州市西湖区古荡街道文三西路 428 号',
    contactPhone: '0571-8899 2631',
    serviceCount: 7,
    productCount: 11,
    serviceTotal: 8,
    syncStatus: 'synced',
    operationStatus: 'normal',
    lastSyncTime: '2026-08-10 15:20',
    onlineRange: '机构电子围栏 3 公里',
    intro: {
      displayTitle: '康乐护理院 · 专业照护，安心颐养',
      description: '面向长者提供专业护理、康复训练、慢病管理与健康咨询服务。',
      tags: ['医护团队', '康复照护'],
      visible: true,
      photos: [],
    },
  },
}

const initialServices: InstitutionService[] = [
  {
    id: 's1',
    code: 'FW0001',
    name: '上门助浴服务',
    category: '生活照护',
    mode: '上门',
    price: 168,
    configSource: '机构默认',
    range: '街道：申花、祥符',
    status: '可预约',
  },
  {
    id: 's2',
    code: 'FW0004',
    name: '慢病健康随访',
    category: '健康管理',
    mode: '上门',
    price: 69,
    configSource: '单项调整',
    range: '电子围栏：3 公里',
    status: '可预约',
  },
  {
    id: 's3',
    code: 'FW0003',
    name: '术后康复训练',
    category: '康复护理',
    mode: '到店',
    price: 128,
    configSource: '机构默认',
    range: '不适用',
    status: '可预约',
  },
  {
    id: 's4',
    code: 'FW0008',
    name: '老年能力评估',
    category: '健康管理',
    mode: '到店',
    price: 199,
    configSource: '机构默认',
    range: '不适用',
    status: '已下架',
  },
]

const servicePoolMocks: ServicePoolItem[] = [
  { id: 'p1', code: 'FW0001', name: '上门助浴服务', category: '生活照护', mode: '上门', price: 168 },
  { id: 'p2', code: 'FW0004', name: '慢病健康随访', category: '健康管理', mode: '上门', price: 69 },
  { id: 'p3', code: 'FW0002', name: '居家护理服务', category: '生活照护', mode: '上门', price: 198 },
  { id: 'p4', code: 'FW0003', name: '术后康复训练', category: '康复护理', mode: '到店', price: 128 },
  { id: 'p5', code: 'FW0008', name: '老年能力评估', category: '健康管理', mode: '到店', price: 199 },
]

const serviceCategories = ['全部', '生活照护', '康复护理', '健康管理', '陪诊出行']

function getInstitutionMock(id: string): InstitutionDetail {
  return institutionMocks[id] ?? institutionMocks['1']
}

export default function InstitutionDetailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const [searchParams] = useSearchParams()
  const { message } = App.useApp()

  const isPatientRoute = location.pathname.startsWith('/institution/patient-intro')
  const institutionId = params.id ?? searchParams.get('id') ?? '1'
  const detail = useMemo(() => getInstitutionMock(institutionId), [institutionId])

  const queryTab = searchParams.get('tab') as DetailTab | null
  const initialTab: DetailTab = isPatientRoute
    ? 'patient'
    : queryTab && ['base', 'services', 'patient', 'operation'].includes(queryTab)
      ? queryTab
      : 'services'

  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab)
  const [services, setServices] = useState<InstitutionService[]>(initialServices)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deleting, setDeleting] = useState<InstitutionService | null>(null)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(['p1', 'p2'])
  const [poolKeyword, setPoolKeyword] = useState('')
  const [poolCategory, setPoolCategory] = useState('全部')
  const [rangeType, setRangeType] = useState<'street' | 'fence'>('street')
  const [introTitle, setIntroTitle] = useState(detail.intro.displayTitle)
  const [introDesc, setIntroDesc] = useState(detail.intro.description)
  const [introTags, setIntroTags] = useState<string[]>(detail.intro.tags)
  const [introVisible, setIntroVisible] = useState(detail.intro.visible)

  useEffect(() => {
    setActiveTab(initialTab)
    setIntroTitle(detail.intro.displayTitle)
    setIntroDesc(detail.intro.description)
    setIntroTags(detail.intro.tags)
    setIntroVisible(detail.intro.visible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId, isPatientRoute, queryTab])

  const filteredPool = useMemo(() => {
    return servicePoolMocks.filter((item) => {
      const keywordHit =
        !poolKeyword.trim() ||
        item.name.includes(poolKeyword.trim()) ||
        item.code.toLowerCase().includes(poolKeyword.trim().toLowerCase())
      const categoryHit = poolCategory === '全部' || item.category === poolCategory
      return keywordHit && categoryHit
    })
  }, [poolCategory, poolKeyword])

  const tabItems = useMemo(
    () => [
      { key: 'base', label: '基础资料' },
      { key: 'services', label: `服务项目 ${services.length}` },
      { key: 'patient', label: '患者端介绍' },
      { key: 'operation', label: '经营设置' },
    ],
    [services.length],
  )

  const handleTabChange = (key: string) => {
    const tab = key as DetailTab
    setActiveTab(tab)
    if (tab === 'patient') {
      navigate(`/institution/patient-intro?id=${institutionId}`)
      return
    }
    navigate(`/institution/detail/${institutionId}?tab=${tab}`)
  }

  const togglePoolService = (id: string, checked: boolean) => {
    setSelectedServiceIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((item) => item !== id)))
  }

  const handleAddServices = () => {
    const exists = new Set(services.map((item) => item.code))
    const adding = servicePoolMocks
      .filter((item) => selectedServiceIds.includes(item.id) && !exists.has(item.code))
      .map<InstitutionService>((item) => ({
        id: `s-${item.id}`,
        code: item.code,
        name: item.name,
        category: item.category,
        mode: item.mode,
        price: item.price,
        configSource: '机构默认',
        range: '按机构默认配置',
        status: '可预约',
      }))
    setServices((prev) => [...prev, ...adding])
    setDrawerOpen(false)
    message.success(`已添加 ${adding.length} 项服务`)
  }

  const handleDeleteService = () => {
    if (!deleting) return
    setServices((prev) => prev.filter((item) => item.id !== deleting.id))
    message.success(`已删除 ${deleting.name}`)
    setDeleting(null)
  }

  const handleSaveIntro = () => {
    message.success('患者端介绍已保存')
  }

  const serviceColumns = useMemo<ColumnsType<InstitutionService>>(
    () => [
      {
        title: '服务项目',
        key: 'name',
        render: (_, record) => (
          <div className="service-cell">
            <strong>{record.name}</strong>
            <span>{record.code}</span>
          </div>
        ),
      },
      { title: '服务方式', dataIndex: 'mode', key: 'mode', width: 90 },
      {
        title: '集团定价',
        dataIndex: 'price',
        key: 'price',
        width: 110,
        render: (value: number) => `¥${value} / 次`,
      },
      { title: '配置来源', dataIndex: 'configSource', key: 'configSource', width: 110 },
      { title: '线上履约范围', dataIndex: 'range', key: 'range' },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: InstitutionService['status']) => (
          <span className={`service-status service-status--${status === '可预约' ? 'on' : 'off'}`}>{status}</span>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 150,
        render: (_, record) => (
          <div className="service-actions">
            <Button type="link" size="small" onClick={() => message.info('编辑配置开发中')}>
              编辑配置
            </Button>
            {record.status === '已下架' && (
              <Button type="link" size="small" danger onClick={() => setDeleting(record)}>
                删除
              </Button>
            )}
          </div>
        ),
      },
    ],
    [message],
  )

  const poolColumns = useMemo<ColumnsType<ServicePoolItem>>(
    () => [
      {
        title: '',
        key: 'checked',
        width: 44,
        render: (_, record) => (
          <Checkbox
            checked={selectedServiceIds.includes(record.id)}
            onChange={(event) => togglePoolService(record.id, event.target.checked)}
          />
        ),
      },
      {
        title: '服务项目',
        key: 'name',
        render: (_, record) => (
          <div className="service-cell">
            <strong>{record.name}</strong>
            <span>{record.category} · {record.code}</span>
          </div>
        ),
      },
      { title: '服务方式', dataIndex: 'mode', key: 'mode', width: 100 },
      {
        title: '集团定价',
        dataIndex: 'price',
        key: 'price',
        width: 120,
        render: (value: number) => `¥${value} / 次`,
      },
      {
        title: '选择状态',
        key: 'selected',
        width: 100,
        render: (_, record) => (selectedServiceIds.includes(record.id) ? '已选择' : '未选择'),
      },
    ],
    [selectedServiceIds],
  )

  const summary = (
    <Card variant="borderless" className="institution-summary">
      <div className="institution-summary__main">
        <h3>{detail.name}</h3>
        <p>机构编码 {detail.code} · {detail.type}{isPatientRoute ? ' · 资料已同步' : ''}</p>
      </div>
      <div className="institution-summary__item">
        <span>经营地址</span>
        <strong>{detail.address}</strong>
      </div>
      <div className="institution-summary__item">
        <span>联系电话</span>
        <strong>{detail.contactPhone}</strong>
      </div>
      <Tag className="institution-summary__status" color={isPatientRoute ? 'blue' : 'green'}>
        {isPatientRoute ? '正常运营' : '已同步'}
      </Tag>
    </Card>
  )

  const servicesContent = (
    <>
      <Card variant="borderless" className="detail-card">
        <div className="detail-card__header">
          <div>
            <h3>机构默认服务配置</h3>
            <p>新添加的服务自动继承；仅有差异的服务再单独调整</p>
          </div>
          <Button type="primary" onClick={() => message.success('默认配置已保存')}>
            保存默认配置
          </Button>
        </div>
        <Alert
          className="detail-card__alert"
          type="info"
          showIcon
          icon={<InfoCircleFilled />}
          message="服务范围仅作用于线上/上门服务；到店服务无需配置，医养服务工作台不维护此项。"
        />
        <div className="service-config">
          <div className="service-config__panel">
            <div className="service-config__title">
              线上服务覆盖范围
              <Radio.Group
                value={rangeType}
                onChange={(event) => setRangeType(event.target.value)}
                options={[
                  { label: '按街道', value: 'street' },
                  { label: '电子围栏', value: 'fence' },
                ]}
                optionType="button"
                buttonStyle="solid"
              />
            </div>
            <div className="service-config__grid">
              <label>
                <span>已选街道</span>
                <Input value="申花街道、祥符街道" readOnly />
              </label>
              <label>
                <span>电子围栏</span>
                <Input value="以机构地址为圆心 5 公里" readOnly={rangeType === 'street'} />
              </label>
            </div>
          </div>
          <div className="service-config__panel">
            <div className="service-config__title service-config__title--single">预约默认规则</div>
            <div className="service-config__grid service-config__grid--four">
              <label>
                <span>日容量</span>
                <Input value="8 单 / 日" readOnly />
              </label>
              <label>
                <span>提前预约</span>
                <Input value="至少提前 2 小时" readOnly />
              </label>
              <label>
                <span>接单时段</span>
                <Input value="08:00—18:00" readOnly />
              </label>
              <label>
                <span>取消规则</span>
                <Input value="服务前 2 小时" readOnly />
              </label>
            </div>
          </div>
        </div>
      </Card>

      <Card variant="borderless" className="detail-card">
        <div className="detail-card__header">
          <div>
            <h3>机构已添加服务</h3>
            <p>
              共 {services.length} 项 · 上架 {services.filter((item) => item.status === '可预约').length} 项 · 已下架 {services.filter((item) => item.status === '已下架').length} 项 ·
              <Button type="link" size="small" className="inline-link" onClick={() => navigate('/service')}>
                上下架请前往服务项目管理
              </Button>
            </p>
          </div>
          <Button type="primary" onClick={() => setDrawerOpen(true)}>
            添加服务项目
          </Button>
        </div>
        <Table<InstitutionService>
          rowKey="id"
          size="small"
          columns={serviceColumns}
          dataSource={services}
          pagination={false}
        />
      </Card>
    </>
  )

  const baseContent = (
    <Card variant="borderless" className="detail-card">
      <div className="detail-card__header">
        <div>
          <h3>基础资料</h3>
          <p>来自协作平台同步，平台侧仅维护患者端展示资料</p>
        </div>
      </div>
      <div className="sync-info sync-info--base">
        <div><span>机构名称</span><strong>{detail.name}</strong></div>
        <div><span>机构编码</span><strong>{detail.code}</strong></div>
        <div><span>机构类型</span><strong>{detail.type}</strong></div>
        <div><span>机构来源</span><strong>{detail.source}</strong></div>
        <div><span>经营地址</span><strong>{detail.address}</strong></div>
        <div><span>联系电话</span><strong>{detail.contactPhone}</strong></div>
      </div>
    </Card>
  )

  const operationContent = (
    <Card variant="borderless" className="detail-card">
      <div className="detail-card__header">
        <div>
          <h3>经营设置</h3>
          <p>经营状态、结算与接单设置（预留）</p>
        </div>
      </div>
      <Alert type="info" showIcon message="经营设置将跟随后端经营参数接口接入，当前为占位内容。" />
    </Card>
  )

  const patientContent = (
    <div className="patient-intro">
      <div className="patient-intro__left">
        <Card variant="borderless" className="detail-card">
          <div className="detail-card__header detail-card__header--compact">
            <h3>协作平台同步资料</h3>
            <span>只读 · 最近同步 {detail.lastSyncTime}</span>
          </div>
          <div className="sync-info">
            <div><span>机构类型</span><strong>{detail.type}</strong></div>
            <div><span>机构地址</span><strong>{detail.address}</strong></div>
            <div><span>联系电话</span><strong>{detail.contactPhone}</strong></div>
            <div><span>线上服务范围</span><strong>{detail.onlineRange}</strong></div>
          </div>
        </Card>

        <Card variant="borderless" className="detail-card">
          <div className="detail-card__header">
            <h3>患者端介绍</h3>
            <div className="patient-visible">
              <span>患者端展示</span>
              <Switch checked={introVisible} onChange={setIntroVisible} />
            </div>
          </div>
          <div className="intro-form">
            <label>
              <span>* 患者端展示标题</span>
              <Input value={introTitle} onChange={(event) => setIntroTitle(event.target.value)} />
            </label>
            <label>
              <span>* 机构介绍</span>
              <Input.TextArea rows={4} value={introDesc} onChange={(event) => setIntroDesc(event.target.value)} />
            </label>
            <div className="intro-tags">
              <span>特色标签（最多4个）</span>
              <div>
                {introTags.map((tag) => (
                  <Tag key={tag} closable onClose={() => setIntroTags((prev) => prev.filter((item) => item !== tag))}>
                    {tag}
                  </Tag>
                ))}
                {introTags.length < 4 && (
                  <Tag className="intro-tags__add" onClick={() => setIntroTags((prev) => [...prev, `特色标签${prev.length + 1}`])}>
                    + 添加标签
                  </Tag>
                )}
              </div>
            </div>
            <div className="intro-photos">
              <div className="intro-photos__item intro-photos__item--cover">
                <PlusOutlined />
                <span>上传机构封面</span>
              </div>
              <div className="intro-photos__item">
                <PlusOutlined />
                <span>添加环境照片</span>
              </div>
              <div className="intro-photos__item intro-photos__item--warm">
                <PlusOutlined />
                <span>添加环境照片</span>
              </div>
              <div className="intro-photos__item intro-photos__item--muted">
                <PlusOutlined />
                <span>最多9张</span>
              </div>
            </div>
            <p className="intro-photos__tip">建议封面尺寸 750×420；环境相册用于患者端了解机构环境与设施。</p>
          </div>
        </Card>
      </div>

      <Card variant="borderless" className="detail-card patient-preview">
        <div className="detail-card__header detail-card__header--compact">
          <h3>患者端实时预览</h3>
          <Button type="link" icon={<ReloadOutlined />} onClick={() => message.success('预览已刷新')}>
            刷新预览
          </Button>
        </div>
        <div className="phone">
          <div className="phone__status">
            <span>9:41</span>
            <i />
          </div>
          <div className="phone__nav">
            <span>‹</span>
            <strong>机构详情</strong>
            <span>···</span>
          </div>
          <div className="phone__hero">
            <h4>{detail.name}</h4>
            <p>专业照护 · 安心颐养</p>
            <span>{detail.address}</span>
          </div>
          <div className="phone__body">
            <h4>{detail.name}</h4>
            <div className="phone__tags">
              {introTags.slice(0, 3).map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <p>{introDesc}</p>
            <div className="phone__section">
              <div>
                <strong>机构环境</strong>
                <span>查看全部 9 张 ›</span>
              </div>
              <div className="phone__photos">
                {(detail.intro.photos.length ? detail.intro.photos : ['接待大厅', '康复空间', '适老房间']).map((item) => (
                  <i key={item}>{item}</i>
                ))}
              </div>
            </div>
            <div className="phone__tabs">
              <span>机构介绍</span>
              <span>服务项目</span>
              <span>近期活动</span>
            </div>
          </div>
          <div className="phone__cta">
            <Button type="primary" icon={<PhoneOutlined />} block>
              电话咨询
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )

  return (
    <PageContainer
      title={isPatientRoute ? '机构详情' : detail.name}
      description={
        isPatientRoute
          ? `维护${detail.name}的患者端介绍与环境相册`
          : '管理机构默认服务配置、已添加服务及线上履约范围'
      }
      extra={
        isPatientRoute ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleSaveIntro}>
            保存介绍
          </Button>
        ) : (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)}>
            添加服务项目
          </Button>
        )
      }
    >
      <div className="institution-detail">
        {summary}
        <Card variant="borderless" className="detail-tabs-card">
          <Tabs activeKey={activeTab} items={tabItems} onChange={handleTabChange} />
        </Card>

        {activeTab === 'services' && servicesContent}
        {activeTab === 'base' && baseContent}
        {activeTab === 'operation' && operationContent}
        {activeTab === 'patient' && patientContent}
      </div>

      <Drawer
        width={720}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          <div className="service-drawer__title">
            <h3>添加服务项目</h3>
            <p>从集团服务池选择，可勾选一项或多项</p>
          </div>
        }
        footer={
          <div className="service-drawer__footer">
            <span>已选择 {selectedServiceIds.length} 项服务</span>
            <div>
              <Button onClick={() => setDrawerOpen(false)}>取消</Button>
              <Button type="primary" icon={<CheckOutlined />} onClick={handleAddServices}>
                确认添加 {selectedServiceIds.length} 项
              </Button>
            </div>
          </div>
        }
      >
        <Alert
          className="service-drawer__alert"
          type="info"
          showIcon
          message={
            <span>
              <strong>{detail.name}</strong> 所选服务将自动继承机构默认预约配置与线上履约范围
            </span>
          }
        />
        <div className="service-drawer__search">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索服务名称、项目编码（共 58 项）"
            value={poolKeyword}
            onChange={(event) => setPoolKeyword(event.target.value)}
          />
          <Select
            value={poolCategory}
            onChange={setPoolCategory}
            options={serviceCategories.map((item) => ({ label: item === '全部' ? '全部分类' : item, value: item }))}
          />
        </div>
        <div className="service-drawer__categories">
          {serviceCategories.map((item) => (
            <button
              type="button"
              key={item}
              className={poolCategory === item ? 'is-active' : ''}
              onClick={() => setPoolCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <Table<ServicePoolItem>
          rowKey="id"
          size="small"
          columns={poolColumns}
          dataSource={filteredPool}
          pagination={false}
        />
      </Drawer>

      <Modal
        open={!!deleting}
        title="删除服务项目"
        onCancel={() => setDeleting(null)}
        footer={
          <div className="delete-modal__footer">
            <Button onClick={() => setDeleting(null)}>取消</Button>
            <Button danger type="primary" onClick={handleDeleteService}>
              确认删除
            </Button>
          </div>
        }
      >
        {deleting && (
          <div className="delete-modal">
            <div className="delete-modal__warning">
              <strong>确认从该机构删除此服务项目？</strong>
              <p>删除仅解除机构关联，不删除集团服务定义；历史订单仍可查询。</p>
            </div>
            <div className="delete-modal__service">
              <span>{detail.name} · {deleting.name}</span>
              <span>{deleting.code}</span>
            </div>
            <div className="delete-modal__conditions">
              <p>删除条件 <Tag color="green">已满足</Tag></p>
              <div>
                <span><CheckOutlined /> 服务状态为已下架</span>
                <span><CheckOutlined /> 当前机构无待履约订单</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  )
}
