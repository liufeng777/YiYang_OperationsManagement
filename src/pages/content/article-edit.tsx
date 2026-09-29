/**
 * 内容配置 - 新建 / 编辑科普内容
 * 后端接口未对接：页面以 Alert 提示；接口就绪后接入 contentApi.saveArticle 并恢复编辑表单与患者端预览
 */
import { Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import ApiPendingAlert from '@/components/ApiPendingAlert'
import './article-edit.less'

export default function ArticleEdit() {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const isEdit = !!params.id && params.id !== 'new'

  return (
    <PageContainer
      title={isEdit ? '编辑科普内容' : '新建科普内容'}
      description="编辑健康科普文章并预览患者端展示效果"
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/content/article')}>
          返回列表
        </Button>
      }
    >
      <ApiPendingAlert feature="科普内容编辑" />
    </PageContainer>
  )
}
