/**
 * 机构管理 - 新增机构
 * 表单分两块：a. 基础信息（共用 InstitutionBaseFields）b. 患者端介绍（brief / description / images）
 * 保存后跳转到机构详情（配置）页；当前为 mock 提交，后端就绪后替换为 institutionApi.createInstitution
 */
import { useState } from 'react'
import { App, Button, Card, Form, Input, Upload } from 'antd'
import { ArrowLeftOutlined, CheckOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import ImageSortGrid from '@/components/ImageSortGrid'
import type { SortableImage } from '@/components/ImageSortGrid'
import type { InstitutionType } from '@/api/modules/institution'
import InstitutionBaseFields from '../components/InstitutionBaseFields'
import './index.less'

/** 新增机构表单值：region 为省市区三级数组，提交时拆分 */
interface InstitutionCreateValues {
  name: string
  name_en?: string
  type: InstitutionType
  region: string[]
  address: string
  contact_phone: string
  manager_name: string
  manager_phone: string
  service_radius_km?: number
  /** 封面单图（本地预览 URL，提交存真实地址） */
  cover_image?: string
  brief: string
  description?: string
}

export default function InstitutionCreate() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm<InstitutionCreateValues>()
  const [images, setImages] = useState<SortableImage[]>([])
  const [coverUrl, setCoverUrl] = useState<string | null>(null)

  /** 封面选择：拦截上传，本地预览（接后端后替换为上传接口） */
  const handleCoverUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('请上传图片文件')
      return Upload.LIST_IGNORE
    }
    setCoverUrl(URL.createObjectURL(file))
    return false
  }

  const handleCancel = () => navigate('/institution')

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      // TODO: 后端就绪后替换为 institutionApi.createInstitution，payload 组装：
      // { ...values, province: values.region[0], city: values.region[1], district: values.region[2],
      //   cover_image: coverUrl, images: images.map((item) => item.url ?? '') }（region 字段移除）
      void values
      void coverUrl
      const newId = Date.now()
      message.success('机构已创建，进入机构配置页')
      navigate(`/institution/detail/${newId}`)
    } catch {
      message.warning('请先完善必填项')
    }
  }

  return (
    <PageContainer
      title="新增机构"
      description="登记机构基础信息与患者端展示介绍，保存后进入机构配置页"
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={handleCancel}>
          返回机构列表
        </Button>
      }
    >
      <Form<InstitutionCreateValues> form={form} layout="vertical">
        <div className="institution-create">
          <Card variant="borderless" className="create-card">
            <div className="create-card__header">
              <h3>基础信息</h3>
              <span>机构名称、类型、地址与管理员信息，保存后生成唯一机构编码</span>
            </div>
            <InstitutionBaseFields />
          </Card>

          <Card variant="borderless" className="create-card">
            <div className="create-card__header">
              <h3>患者端介绍</h3>
              <span>展示标题、机构介绍与环境图片，用于患者端机构详情页</span>
            </div>
            <div className="institution-form institution-form--stack">
              <Form.Item
                name="brief"
                label={<span>患者端展示标题</span>}
                rules={[{ required: true, message: '请输入患者端展示标题' }]}
              >
                <Input
                  maxLength={64}
                  showCount
                  placeholder="例如：幸福里健康驿站 · 专业照护，安心颐养"
                />
              </Form.Item>
              <Form.Item name="description" label="机构介绍">
                <Input.TextArea
                  rows={4}
                  maxLength={255}
                  showCount
                  placeholder="介绍机构服务能力、团队与环境，255 字以内"
                />
              </Form.Item>
              <div className="institution-create__images">
                <span className="institution-create__images-label">机构封面</span>
                <Upload
                  listType="picture-card"
                  accept="image/*"
                  showUploadList={false}
                  beforeUpload={handleCoverUpload}
                >
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt="机构封面"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                    />
                  ) : (
                    <div>
                      <PlusOutlined />
                      <div style={{ marginTop: 8 }}>上传封面</div>
                    </div>
                  )}
                </Upload>
                <p className="institution-create__images-tip">建议尺寸 750×420，展示于患者端机构详情页顶部。</p>
              </div>
              <div className="institution-create__images">
                <span className="institution-create__images-label">患者端图片</span>
                <ImageSortGrid images={images} onChange={setImages} addText="添加图片" />
                <p className="institution-create__images-tip">
                  建议尺寸 750×420，可拖拽排序；患者端按图片顺序展示。
                </p>
              </div>
            </div>
          </Card>

          <div className="institution-create__footer">
            <span>带 * 为必填项；保存后可在机构详情页继续配置服务项目与患者端展示。</span>
            <div>
              <Button onClick={handleCancel}>取消</Button>
              <Button type="primary" icon={<CheckOutlined />} onClick={handleSubmit}>
                保存并进入配置
              </Button>
            </div>
          </div>
        </div>
      </Form>
    </PageContainer>
  )
}
