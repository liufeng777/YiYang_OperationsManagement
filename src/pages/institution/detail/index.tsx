/**
 * 机构管理 - 机构详情（编辑与配置）
 * - 基础资料（可编辑）/ 服务项目 / 患者端介绍为页内 Tab，已拆分为 components/ 下独立组件
 * - Tab 通过 ?tab= 查询参数驱动，可直接分享链接；默认展示「基础资料」
 * - 机构信息由平台直接维护，无「同步」概念
 * 数据来源：institutionApi.getInstitution
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Empty, Skeleton, Tabs } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import { institutionApi } from '@/api'
import type { InstitutionItem, InstitutionType } from '@/api/modules/institution'
import BaseInfoTab from '../components/BaseInfoTab'
import ServicesTab from '../components/ServicesTab'
import PatientIntroTab from '../components/PatientIntroTab'
import './index.less'

type DetailTab = 'base' | 'services' | 'patient'

const typeText: Record<InstitutionType, string> = {
  1: '护理院',
  2: '驿站',
}

const detailTabs: { key: DetailTab; label: string }[] = [
  { key: 'base', label: '基础资料' },
  { key: 'patient', label: '患者端介绍' },
  { key: 'services', label: '服务项目' },
]

export default function InstitutionDetailPage() {
  const navigate = useNavigate()
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const institutionId = params.id ?? ''
  const [detail, setDetail] = useState<InstitutionItem | null>(null)
  const [loading, setLoading] = useState(true)
  /** 服务项目数量（Tab 角标用，由 ServicesTab 回传） */
  const [serviceCount, setServiceCount] = useState(0)

  /** 拉取机构详情 */
  const fetchDetail = useCallback(async () => {
    if (!institutionId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await institutionApi.getInstitution(Number(institutionId))
      setDetail(data)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [institutionId])

  useEffect(() => {
    void fetchDetail()
  }, [fetchDetail])

  const queryTab = searchParams.get('tab')
  const activeTab: DetailTab = detailTabs.some((item) => item.key === queryTab)
    ? (queryTab as DetailTab)
    : 'base'

  const tabItems = useMemo(
    () =>
      detailTabs.map((item) =>
        item.key === 'services' ? { ...item, label: `服务项目 ${serviceCount}` } : item,
      ),
    [serviceCount],
  )

  const handleTabChange = (key: string) => {
    setSearchParams({ tab: key }, { replace: true })
  }

  if (loading) {
    return (
      <PageContainer title="机构详情" description="编辑机构基础资料、配置服务项目与患者端展示介绍">
        <Card variant="borderless">
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      </PageContainer>
    )
  }

  if (!detail) {
    return (
      <PageContainer title="机构详情" description="编辑机构基础资料、配置服务项目与患者端展示介绍">
        <Card variant="borderless">
          <Empty description="未找到该机构，可能已被删除" />
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title={detail.name}
      description="编辑机构基础资料、配置服务项目与患者端展示介绍"
      extra={
        <Button
          color="primary"
          variant="outlined"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/institution')}
        >
          返回机构列表
        </Button>
      }
    >
      <div className="institution-detail">
        <Card variant="borderless" className="institution-summary">
          <div className="institution-summary__main">
            <h3>{detail.name}</h3>
            <p>
              {detail.name_en || '—'} · {typeText[detail.type]}
            </p>
          </div>
          <div className="institution-summary__item">
            <span>经营地址</span>
            <strong>
              {detail.province} · {detail.city} · {detail.district} · {detail.address}
            </strong>
          </div>
          <div className="institution-summary__item">
            <span>联系电话</span>
            <strong>{detail.contact_phone}</strong>
          </div>
          <span
            className={`status-btn ${detail.status === 1 ? 'status--success' : 'status--danger'}`}
          >
            {detail.status === 1 ? '启用' : '停用'}
          </span>
        </Card>

        <Card variant="borderless" className="detail-tabs-card">
          <Tabs activeKey={activeTab} items={tabItems} onChange={handleTabChange} />
        </Card>

        {activeTab === 'base' && (
          <BaseInfoTab key={detail.id} detail={detail} onSaved={fetchDetail} />
        )}
        {activeTab === 'patient' && (
          <PatientIntroTab key={detail.id} detail={detail} onSaved={fetchDetail} />
        )}
        {activeTab === 'services' && (
          <ServicesTab detail={detail} onCountChange={setServiceCount} />
        )}
      </div>
    </PageContainer>
  )
}
