/**
 * 机构管理 - 机构详情（编辑与配置）
 * - 基础资料（可编辑）/ 服务项目 / 患者端介绍为页内 Tab，已拆分为 components/ 下独立组件
 * - Tab 通过 ?tab= 查询参数驱动，可直接分享链接；默认展示「服务项目」
 * - 机构信息由平台直接维护，无「同步」概念
 * 当前为 mock 数据，后端就绪后替换为 institutionApi.getInstitution
 */
import { useMemo, useState } from 'react'
import { Button, Card, Tabs, Tag } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import type { InstitutionItem, InstitutionService, InstitutionType } from '@/api/modules/institution'
import BaseInfoTab from '../components/BaseInfoTab'
import ServicesTab from '../components/ServicesTab'
import PatientIntroTab from '../components/PatientIntroTab'
import './detail.less'

type DetailTab = 'base' | 'services' | 'patient'

const typeText: Record<InstitutionType, string> = {
  1: '护理院',
  2: '驿站',
}

const institutionMocks: Record<string, InstitutionItem> = {
  '1': {
    id: 1,
    code: 'JG0001',
    name: '幸福里健康驿站',
    name_en: 'Xingfuli Health Station',
    type: 2,
    province: '浙江省',
    city: '杭州市',
    district: '拱墅区',
    address: '申花街道莫干山路 987 号',
    contact_phone: '0571-8876 1028',
    manager_name: '刘主任',
    manager_phone: '13866661028',
    service_radius_km: 5,
    brief: '幸福里健康驿站 · 专业照护，安心颐养',
    description:
      '面向长者提供专业护理、康复训练、慢病管理与健康咨询服务。站内配备专业护理团队和适老化环境，为长者提供安全、温暖、有尊严的照护体验。',
    cover_image: '',
    images: [],
    status: 1,
    created_at: 1788244635,
  },
  '2': {
    id: 2,
    code: 'JG0002',
    name: '康乐护理院',
    name_en: null,
    type: 1,
    province: '浙江省',
    city: '杭州市',
    district: '西湖区',
    address: '古荡街道文三西路 428 号',
    contact_phone: '0571-8899 2631',
    manager_name: '赵海',
    manager_phone: '13888886666',
    service_radius_km: 3,
    brief: '康乐护理院 · 专业照护，安心颐养',
    description: '面向长者提供专业护理、康复训练、慢病管理与健康咨询服务。',
    cover_image: '',
    images: [],
    status: 9,
    created_at: 1788244635,
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
  { key: 'patient', label: '患者端介绍' },
  { key: 'services', label: '服务项目' },
]

function getInstitutionMock(id: string): InstitutionItem {
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
      description="编辑机构基础资料、配置服务项目与患者端展示介绍"
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => {
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
            <p>机构编码 {detail.code} · {typeText[detail.type]}</p>
          </div>
          <div className="institution-summary__item">
            <span>经营地址</span>
            <strong>{detail.province} · {detail.city} · {detail.district} · {detail.address}</strong>
          </div>
          <div className="institution-summary__item">
            <span>联系电话</span>
            <strong>{detail.contact_phone}</strong>
          </div>
          <Tag
            className="institution-summary__status"
            color={detail.status === 1 ? 'green' : 'red'}
          >
            {detail.status === 1 ? '启用' : '停用'}
          </Tag>
        </Card>

        <Card variant="borderless" className="detail-tabs-card">
          <Tabs activeKey={activeTab} items={tabItems} onChange={handleTabChange} />
        </Card>

        {activeTab === 'base' && <BaseInfoTab key={detail.id} detail={detail} />}
        {activeTab === 'patient' && <PatientIntroTab key={detail.id} detail={detail} />}
        {activeTab === 'services' && (
          <ServicesTab
            detail={detail}
            services={services}
            onServicesChange={setServices}
            drawerOpen={drawerOpen}
            onDrawerOpenChange={setDrawerOpen}
          />
        )}
      </div>
    </PageContainer>
  )
}
