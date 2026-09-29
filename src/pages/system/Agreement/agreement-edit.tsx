/**
 * 系统设置 - 新建 / 编辑协议版本
 * 后端接口未对接：页面以 Alert 提示；接口就绪后接入 systemApi.saveAgreement 并恢复编辑表单与患者端预览
 */
import { Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import ApiPendingAlert from '@/components/ApiPendingAlert'
import './agreement-edit.less'

export default function AgreementEdit() {
  const navigate = useNavigate()

  return (
    <PageContainer
      title="新建 / 编辑协议版本"
      description="维护协议文本与版本，发布后按生效时间切换"
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/system/agreement')}>
          返回列表
        </Button>
      }
    >
      <ApiPendingAlert feature="协议版本编辑" />
    </PageContainer>
  )
}
