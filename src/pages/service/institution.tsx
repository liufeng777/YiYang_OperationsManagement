/**
 * 服务项目 - 机构服务
 * 按机构维度查看服务接入情况，并跳转机构详情维护单项配置
 */
import { Button, Card, Col, Row } from 'antd'
import { ArrowRightOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import './institution.less'

const institutionServices = [
  { id: '1', name: '幸福里健康驿站', code: 'JG0001', serviceCount: 12, onlineCount: 10, offCount: 2 },
  { id: '2', name: '康乐护理院', code: 'JG0002', serviceCount: 7, onlineCount: 7, offCount: 0 },
  { id: '3', name: '怡康护理院', code: 'JG0003', serviceCount: 5, onlineCount: 3, offCount: 2 },
  { id: '4', name: '长青健康驿站', code: 'JG0004', serviceCount: 6, onlineCount: 6, offCount: 0 },
]

export default function ServiceInstitutionPage() {
  const navigate = useNavigate()
  return (
    <PageContainer
      title="机构服务"
      description="按机构查看已接入服务与上下架状态，单项履约配置请进入机构详情维护"
    >
      <Row gutter={[16, 16]} className="service-institution">
        {institutionServices.map((item) => (
          <Col xs={24} md={12} xl={6} key={item.id}>
            <Card variant="borderless" className="service-institution__card">
              <h3>{item.name}</h3>
              <p>机构编码 {item.code}</p>
              <div className="service-institution__stats">
                <div><span>已接入</span><strong>{item.serviceCount} 项</strong></div>
                <div><span>可预约</span><strong>{item.onlineCount} 项</strong></div>
                <div><span>已下架</span><strong>{item.offCount} 项</strong></div>
              </div>
              <Button
                type="link"
                icon={<ArrowRightOutlined />}
                iconPosition="end"
                onClick={() => navigate(`/institution/detail/${item.id}?tab=services`)}
              >
                前往机构配置
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </PageContainer>
  )
}
