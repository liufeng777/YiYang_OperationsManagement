/**
 * 机构管理 - 机构详情
 * - 基础资料 / 服务项目 / 患者端介绍为页内 Tab，已拆分为 components/ 下独立组件
 * - Tab 通过 ?tab= 查询参数驱动，可直接分享链接；默认展示「服务项目」
 * 当前为 mock 数据，后端就绪后替换为 institutionApi 对应接口
 */
import { useMemo, useState } from 'react'
import { Button, Card, Tabs, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import type { InstitutionDetail, InstitutionService } from '@/api/modules/institution'
import BaseInfoTab from './components/BaseInfoTab'
import ServicesTab from './components/ServicesTab'
import PatientIntroTab from './components/PatientIntroTab'
import './detail.less'

type DetailTab = 'base' | 'services' | 'patient'

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

const detailTabs: { key: DetailTab; label: string }[] = [
  { key: 'base', label: '基础资料' },
  { key: 'services', label: '服务项目' },
  { key: 'patient', label: '患者端介绍' },
]

function getInstitutionMock(id: string): InstitutionDetail {
  return institutionMocks[id] ?? institutionMocks['1']
}

export default function InstitutionDetailPage() {
  const navigate = useNavigate()
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const institutionId = params.id ?? '1'
  const detail = useMemo(() => getInstitutionMock(institutionId), [institutionId])

  const queryTab = searchParams.get('tab')
  const activeTab: DetailTab = detailTabs.some((item) => item.key === queryTab)
    ? (queryTab as DetailTab)
    : 'services'

  // 服务列表数据提升到页面层持有，切换 Tab 不丢失；UI 状态在各 Tab 组件内
  const [services, setServices] = useState<InstitutionService[]>(initialServices)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const tabItems = useMemo(
    () =>
      detailTabs.map((item) =>
        item.key === 'services' ? { ...item, label: `服务项目 ${services.length}` } : item,
      ),
    [services.length],
  )

  const handleTabChange = (key: string) => {
    setSearchParams({ tab: key }, { replace: true })
  }

  return (
    <PageContainer
      title={detail.name}
      description="管理机构基础资料、服务项目与患者端展示介绍"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          navigate(`/institution`)
        }}>
          返回机构列表
        </Button>
      }
    >
      <div className="institution-detail">
        <Card variant="borderless" className="institution-summary">
          <div className="institution-summary__main">
            <h3>{detail.name}</h3>
            <p>机构编码 {detail.code} · {detail.type}</p>
          </div>
          <div className="institution-summary__item">
            <span>经营地址</span>
            <strong>{detail.address}</strong>
          </div>
          <div className="institution-summary__item">
            <span>联系电话</span>
            <strong>{detail.contactPhone}</strong>
          </div>
          <Tag className="institution-summary__status" color="green">
            已同步
          </Tag>
        </Card>

        <Card variant="borderless" className="detail-tabs-card">
          <Tabs activeKey={activeTab} items={tabItems} onChange={handleTabChange} />
        </Card>

        {activeTab === 'base' && <BaseInfoTab detail={detail} />}
        {activeTab === 'services' && (
          <ServicesTab
            detail={detail}
            services={services}
            onServicesChange={setServices}
            drawerOpen={drawerOpen}
            onDrawerOpenChange={setDrawerOpen}
          />
        )}
        {activeTab === 'patient' && <PatientIntroTab key={detail.id} detail={detail} />}
      </div>
    </PageContainer>
  )
}
