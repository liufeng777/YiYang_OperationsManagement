/**
 * 机构管理 - 新增机构
 * 复用 InstitutionInfoForm（基础信息 + 患者端展示详情 + 患者端手机预览，与详情页基础资料 Tab 同一组件）
 * 保存成功后跳转到机构详情（配置）页
 */
import { Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import InstitutionInfoForm from '../components/InstitutionInfoForm'

export default function InstitutionCreate() {
  const navigate = useNavigate()

  const handleCancel = () => navigate('/institution')

  return (
    <PageContainer
      title="新增机构"
      description="登记机构基础信息与患者端展示介绍，保存后进入机构配置页"
      extra={
        <Button color="primary" variant="outlined" icon={<ArrowLeftOutlined />} onClick={handleCancel}>
          返回机构列表
        </Button>
      }
    >
      <InstitutionInfoForm
        onCancel={handleCancel}
        onSaved={(id) => navigate(`/institution/detail/${id}?tab=services`)}
      />
    </PageContainer>
  )
}
