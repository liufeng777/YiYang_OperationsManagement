/**
 * 内容配置 - 新建 / 编辑科普内容
 * 数据来源：cmsApi.getCmsContent / createCmsContent / updateCmsContent / publishCmsContent /
 *          getCmsCategories（分类下拉）
 * 说明：正文为富文本 JSON 字符串（RichDetailEditor，ProseMirror JSON）；封面上传走 uploadApi
 * 保存：「保存草稿」仅落库（publish_status=1）；「保存并发布」落库后调用 /publish 接口
 */
import { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, Form, Image, Input, Select, Skeleton, Space, Upload } from 'antd'
import { ArrowLeftOutlined, UploadOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import RichDetailEditor from '@/components/RichDetailEditor'
import { cmsApi } from '@/api'
import type { CmsCategoryDTO, CmsContentDTO } from '@/api/modules/cms'
import { useImageUpload } from '@/hooks'
import './article-edit.less'

/** 投放端选项（swagger CmsContentDTO.platform） */
const platformOptions = [
  { label: '全部端', value: 'all' },
  { label: '用户小程序', value: 'user-app' },
  { label: '医护小程序', value: 'staff-app' },
  { label: '管理后台', value: 'admin' },
]

interface ArticleFormValues {
  title: string
  category_id?: number
  summary?: string
  author_name?: string
  source?: string
  platform?: string
  tags?: string[]
}

export default function ArticleEdit() {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const { message } = App.useApp()
  const { uploading, upload } = useImageUpload()
  const isEdit = !!params.id && params.id !== 'new'
  const contentId = Number(params.id)

  const [form] = Form.useForm<ArticleFormValues>()
  const [detail, setDetail] = useState<CmsContentDTO | null>(null)
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [categories, setCategories] = useState<CmsCategoryDTO[]>([])
  /** 封面地址（本地预览或服务器地址） */
  const [coverUrl, setCoverUrl] = useState('')
  /** 正文（富文本 JSON 字符串） */
  const [body, setBody] = useState('')

  /** 分类下拉 */
  useEffect(() => {
    let cancelled = false
    cmsApi
      .getCmsCategories({ page: 1, page_size: 100 })
      .then((res) => {
        if (!cancelled) setCategories(res.list ?? [])
      })
      .catch(() => {
        if (!cancelled) setCategories([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  /** 编辑态：拉取详情并回填 */
  const fetchDetail = useCallback(async () => {
    if (!isEdit) return
    setLoading(true)
    try {
      const res = await cmsApi.getCmsContent(contentId)
      setDetail(res)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setLoading(false)
    }
  }, [isEdit, contentId])

  useEffect(() => {
    void fetchDetail()
  }, [fetchDetail])

  useEffect(() => {
    if (!detail) return
    form.setFieldsValue({
      title: detail.title,
      category_id: detail.category_id || undefined,
      summary: detail.summary,
      author_name: detail.author_name,
      source: detail.source,
      platform: detail.platform || 'all',
      tags: detail.tags ?? [],
    })
    setCoverUrl(detail.cover_url ?? '')
    setBody(detail.body ?? '')
  }, [detail, form])

  /** 封面选择：本地预览 + 上传后端 */
  const handlePickCover = async (file: File) => {
    await upload(file, {
      onLocalPreview: (localUrl) => setCoverUrl(localUrl),
      onUploaded: (serverUrl) => setCoverUrl(serverUrl),
      onError: () => setCoverUrl(detail?.cover_url ?? ''),
    })
    return false
  }

  /** 保存：publish=true 时落库后调发布接口 */
  const handleSave = async (publish: boolean) => {
    let values: ArticleFormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        title: values.title.trim(),
        category_id: values.category_id,
        summary: values.summary?.trim(),
        cover_url: coverUrl,
        body,
        tags: values.tags ?? [],
        author_name: values.author_name?.trim(),
        source: values.source?.trim(),
        platform: values.platform ?? 'all',
        // 编辑已发布内容时保持原状态，其余落库均为草稿，发布走 /publish 接口
        publish_status: detail?.publish_status === 2 ? 2 : 1,
      } as const

      if (isEdit) {
        await cmsApi.updateCmsContent(contentId, { ...payload })
      } else {
        await cmsApi.createCmsContent({ ...payload })
      }
      if (publish) {
        if (isEdit) {
          await cmsApi.publishCmsContent(contentId)
          message.success('内容已保存并发布')
        } else {
          // 新建接口不返回 id：发布需在列表中对草稿执行发布
          message.success('内容已保存为草稿，请在列表中执行发布')
        }
      } else {
        message.success('草稿已保存')
      }
      navigate('/content/article')
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageContainer
      fixed
      title={isEdit ? '编辑科普内容' : '新建科普内容'}
      description="编辑健康科普文章并预览患者端展示效果"
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/content/article')}>
          返回列表
        </Button>
      }
    >
      {loading ? (
        <Card variant="borderless">
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      ) : (
        <Card variant="borderless">
          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            initialValues={{ platform: 'all', tags: [] }}
            style={{ maxWidth: 860 }}
          >
            <Form.Item
              name="title"
              label="内容标题"
              rules={[{ required: true, message: '请输入内容标题' }]}
            >
              <Input placeholder="请输入内容标题" maxLength={100} showCount />
            </Form.Item>
            <Form.Item name="category_id" label="内容分类">
              <Select
                allowClear
                placeholder="请选择分类"
                options={categories.map((item) => ({ label: item.name, value: item.id }))}
              />
            </Form.Item>
            <Form.Item name="summary" label="摘要">
              <Input.TextArea rows={2} placeholder="列表与分享场景展示的摘要" maxLength={200} />
            </Form.Item>
            <Form.Item label="封面图">
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => {
                  void handlePickCover(file)
                  return false
                }}
              >
                <Button icon={<UploadOutlined />} loading={uploading}>
                  {coverUrl ? '重新上传' : '上传封面'}
                </Button>
              </Upload>
              {coverUrl && (
                <div style={{ marginTop: 8 }}>
                  <Image src={coverUrl} width={240} style={{ objectFit: 'cover' }} />
                </div>
              )}
            </Form.Item>
            <Form.Item label="正文内容">
              <RichDetailEditor label="正文内容" value={body} onChange={setBody} minHeight={420} />
            </Form.Item>
            <Form.Item name="tags" label="标签">
              <Select mode="tags" placeholder="输入后回车添加标签" tokenSeparators={[',', ' ']} />
            </Form.Item>
            <Form.Item name="author_name" label="作者">
              <Input placeholder="作者姓名" maxLength={30} />
            </Form.Item>
            <Form.Item name="source" label="来源">
              <Input placeholder="如：院内原创 / 转载自XX" maxLength={50} />
            </Form.Item>
            <Form.Item name="platform" label="投放端">
              <Select options={platformOptions} />
            </Form.Item>
          </Form>
          <Space>
            <Button onClick={() => navigate('/content/article')}>取消</Button>
            <Button loading={submitting} onClick={() => handleSave(false)}>
              保存草稿
            </Button>
            <Button type="primary" loading={submitting} onClick={() => handleSave(true)}>
              保存并发布
            </Button>
          </Space>
        </Card>
      )}
    </PageContainer>
  )
}
