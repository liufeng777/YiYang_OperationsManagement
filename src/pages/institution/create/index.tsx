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
import RichDetailEditor from '@/components/RichDetailEditor'
import { institutionApi } from '@/api'
import { useImageUpload } from '@/hooks'
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
  brief: string
  description?: string
}

export default function InstitutionCreate() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { uploading, upload } = useImageUpload()
  const [form] = Form.useForm<InstitutionCreateValues>()
  /** 封面预览地址（本地 objectURL 或服务器地址） */
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  /** 封面服务器地址（上传成功后的可提交值，写入 cover_url） */
  const [coverServerUrl, setCoverServerUrl] = useState('')
  /** 图文详情（ProseMirror JSON 字符串），随提交写入 description */
  const [richDesc, setRichDesc] = useState('')
  /** 提交中 */
  const [submitting, setSubmitting] = useState(false)

  /** 封面选择：本地预览 + 后台上传，成功后保存服务器地址供提交 */
  const handleCoverUpload = async (file: File) => {
    await upload(file, {
      onLocalPreview: (localUrl) => setCoverUrl(localUrl),
      onUploaded: (url) => {
        setCoverServerUrl(url)
        setCoverUrl(url)
        message.success('封面已上传')
      },
      onError: () => {
        // 上传失败：保留本地预览但清空可提交地址，避免把本地 blob 地址提交给后端
        setCoverServerUrl('')
      },
    })
    return Upload.LIST_IGNORE
  }

  const handleCancel = () => navigate('/institution')

  const handleSubmit = async () => {
    let values: InstitutionCreateValues
    try {
      values = await form.validateFields()
    } catch {
      message.warning('请先完善必填项')
      return
    }
    const [province = '', city = '', district = ''] = values.region ?? []
    setSubmitting(true)
    try {
      const result = await institutionApi.createInstitution({
        name: values.name,
        name_en: values.name_en ?? '',
        type: values.type,
        province,
        city,
        district,
        address: values.address,
        contact_phone: values.contact_phone,
        manager_name: values.manager_name ?? '',
        manager_phone: values.manager_phone ?? '',
        brief: values.brief,
        description: richDesc,
        // 封面使用上传接口返回的服务器地址（uploadApi.uploadFile）
        cover_url: coverServerUrl,
        service_radius_km: values.service_radius_km ?? null,
        status: 1,
      })
      message.success('机构已创建，进入机构配置页')
      navigate(`/institution/detail/${result.id}?tab=services`)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageContainer
      title="新增机构"
      description="登记机构基础信息与患者端展示介绍，保存后进入机构配置页"
      extra={
        <Button color="primary" variant='outlined' icon={<ArrowLeftOutlined />} onClick={handleCancel}>
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
              <h3>患者端展示详情</h3>
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
              <div className="patient-detail">
                <div className="patient-detail__field patient-detail__cover">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="patient-detail__label">机构封面</span>
                    <p className="patient-detail__tip">建议尺寸 750×420，展示于患者端机构详情页顶部。</p>
                  </div>
                  <Upload
                    listType="picture-card"
                    accept="image/*"
                    showUploadList={false}
                    disabled={uploading}
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
                        <div style={{ marginTop: 8 }}>{uploading ? '上传中…' : '上传封面'}</div>
                      </div>
                    )}
                  </Upload>
                </div>
                <RichDetailEditor label="图文详情" value={richDesc} onChange={setRichDesc} />
              </div>
              
              {/* <div className="institution-create__images">
                <span className="institution-create__images-label">患者端图片</span>
                <ImageSortGrid images={images} onChange={setImages} addText="添加图片" />
                <p className="institution-create__images-tip">
                  建议尺寸 750×420，可拖拽排序；患者端按图片顺序展示。
                </p>
              </div> */}
            </div>
          </Card>

          <div className="institution-create__footer">
            <span>带 * 为必填项；保存后可在机构详情页继续配置服务项目与患者端展示。</span>
            <div>
              <Button onClick={handleCancel}>取消</Button>
              <Button type="primary" icon={<CheckOutlined />} loading={submitting} onClick={handleSubmit}>
                保存并进入配置
              </Button>
            </div>
          </div>
        </div>
      </Form>
    </PageContainer>
  )
}
