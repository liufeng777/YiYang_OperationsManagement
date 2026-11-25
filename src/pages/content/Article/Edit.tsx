/**
 * 内容配置 - 新建 / 编辑科普内容
 * 数据来源：cmsApi.getCmsContent / createCmsContent / updateCmsContent / publishCmsContent /
 *          getCmsCategories（分类下拉）
 * 说明：正文为富文本 JSON 字符串（RichDetailEditor，ProseMirror JSON）；封面上传走 uploadApi
 * 保存：「保存草稿」仅落库（publish_status=1）；「保存并发布」落库后调用 /publish 接口
 */
import { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, Form, Input, Modal, Select, Skeleton, Upload } from 'antd'
import { ArrowLeftOutlined, EyeOutlined, UploadOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import RichDetailEditor from '@/components/RichDetailEditor'
import { cmsApi } from '@/api'
import type { CmsCategoryDTO, CmsContentDTO } from '@/api/modules/cms'
import { useImageUpload } from '@/hooks'
import ArticlePhonePreview from './ArticlePhonePreview'
import { parseArticleTags } from '../articleTags'
import Tags from '@/components/Tags'
import './Edit.less'

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
  author?: string
  source?: string
  platform?: string
  tags?: string
}

export default function ArticleEdit() {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const { message } = App.useApp()
  const { uploading, upload } = useImageUpload()
  const isEdit = !!params.id && params.id !== 'new'
  const contentId = Number(params.id)

  const [form] = Form.useForm<ArticleFormValues>()
  const watchedValues = Form.useWatch([], form)
  const [detail, setDetail] = useState<CmsContentDTO | null>(null)
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [categories, setCategories] = useState<CmsCategoryDTO[]>([])
  /** 封面地址（本地预览或服务器地址） */
  const [coverUrl, setCoverUrl] = useState('')
  /** 正文（富文本 JSON 字符串） */
  const [body, setBody] = useState('')

  const previewArticle = {
    ...watchedValues,
    cover: coverUrl,
    body,
    categoryName: categories.find((item) => item.id === watchedValues?.category_id)?.name,
  }

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
      author: detail.author,
      source: detail.source,
      platform: detail.platform || 'all',
      tags: JSON.stringify(parseArticleTags(detail.tags)),
    })
    setCoverUrl(detail.cover ?? '')
    setBody(detail.body ?? '')
  }, [detail, form])

  /** 封面选择：本地预览 + 上传后端 */
  const handlePickCover = async (file: File) => {
    await upload(file, {
      onLocalPreview: (localUrl) => setCoverUrl(localUrl),
      onUploaded: (serverUrl) => setCoverUrl(serverUrl),
      onError: () => setCoverUrl(detail?.cover ?? ''),
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
        cover: coverUrl,
        body,
        tags: JSON.stringify(parseArticleTags(values.tags)),
        author: values.author?.trim(),
        source: values.source?.trim(),
        platform: values.platform ?? 'all',
        // 编辑已发布内容时保持原状态，其余落库均为草稿，发布走 /publish 接口
        status: detail?.status === 2 ? 2 : 1,
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
      description="左侧编辑内容，右侧完成发布设置并实时查看患者端效果"
      extra={
        <Button color="primary" variant="outlined" icon={<ArrowLeftOutlined />} onClick={() => navigate('/content/article')}>
          返回列表
        </Button>
      }
    >
      <div className='article-edit'>
        {loading ? (
          <Card variant="borderless" className="article-edit__loading">
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        ) : (
          <div style={{height: '100%'}}>
            <Form
              style={{height: '100%'}}
              form={form}
              layout="vertical"
              requiredMark={false}
              initialValues={{ platform: 'all', tags: '[]' }}
            >
              <div className="article-container">
                <div className="article-edit__form">
                  <Card variant="borderless" className="edit-card">
                    <div className="edit-card__header">
                      <h3>基本信息</h3>
                      <span>用于患者端列表、分享与详情展示</span>
                    </div>
                    <Form.Item
                      name="title"
                      label="内容标题"
                      rules={[{ required: true, message: '请输入内容标题' }]}
                    >
                      <Input placeholder="请输入内容标题" maxLength={100} showCount />
                    </Form.Item>
                    <div className="form-grid form-grid--two">
                      <Form.Item name="category_id" label="内容分类">
                        <Select
                          allowClear
                          placeholder="请选择分类"
                          options={categories.map((item) => ({ label: item.name, value: item.id }))}
                        />
                      </Form.Item>
                      <Form.Item name="tags" label="内容标签">
                        <Tags
                          tags={parseArticleTags(watchedValues?.tags)}
                          setTags={(tags) => form.setFieldsValue({ tags: JSON.stringify(tags) })}
                        />
                      </Form.Item>
                    </div>
                    <Form.Item name="summary" label="内容摘要">
                      <Input.TextArea
                        rows={3}
                        placeholder="简要概括文章重点，将用于列表与分享场景"
                        maxLength={200}
                        showCount
                      />
                    </Form.Item>
                    <Form.Item label="封面图" className="article-edit__cover-field">
                      <div className="cover-upload">
                        {coverUrl ? (
                          <img className="cover-upload__image" src={coverUrl} alt="科普内容封面" />
                        ) : (
                          <div className="cover-upload__placeholder">暂未上传封面</div>
                        )}
                        <div className="cover-upload__action">
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
                          <p>建议上传清晰横图，预览区会同步更新展示效果。</p>
                        </div>
                      </div>
                    </Form.Item>
                  </Card>

                  <Card variant="borderless" className="edit-card">
                    <div className="edit-card__header">
                      <h3>正文内容</h3>
                      <span>支持文字、图片与富文本排版</span>
                    </div>
                    <RichDetailEditor label="图文详情" value={body} onChange={setBody} minHeight={420} />
                  </Card>

                  <Card variant="borderless" className="edit-card">
                    <div className="edit-card__header">
                      <h3>作者与来源</h3>
                      <span>选填，将展示在文章标题下方</span>
                    </div>
                    <div className="form-grid form-grid--two">
                      <Form.Item name="author" label="作者">
                        <Input placeholder="作者姓名" maxLength={30} />
                      </Form.Item>
                      <Form.Item name="source" label="来源">
                        <Input placeholder="如：院内原创 / 转载自XX" maxLength={50} />
                      </Form.Item>
                    </div>
                  </Card>
                </div>

                <aside className="article-edit__side">
                  <Card variant="borderless" className="edit-card publish-card">
                    <div className="edit-card__header">
                      <h3>发布设置</h3>
                      <span>确认投放范围后保存</span>
                    </div>
                    <Form.Item name="platform" label="投放端">
                      <Select options={platformOptions} />
                    </Form.Item>
                    {/* <p className="publish-note">保存草稿不会对外展示；发布后内容将同步至对应患者端。</p> */}
                    <div className="publish-actions">
                      <Button loading={submitting} onClick={() => handleSave(false)}>
                        保存草稿
                      </Button>
                      <Button type="primary" loading={submitting} onClick={() => handleSave(true)}>
                        保存并发布
                      </Button>
                    </div>
                  </Card>

                  <Card variant="borderless" className="edit-card preview-card">
                    <div className="edit-card__header preview-card__header">
                      <div>
                        <h3>患者端实时预览</h3>
                        <span>随表单内容同步更新</span>
                      </div>
                      <Button type="link" icon={<EyeOutlined />} onClick={() => setPreviewOpen(true)}>
                        放大预览
                      </Button>
                    </div>
                    <ArticlePhonePreview article={previewArticle} compact />
                  </Card>
                </aside>
              </div>
            </Form>
          </div>
        )}

        <Modal
          open={previewOpen}
          width={440}
          centered
          footer={null}
          title="患者端手机预览"
          className="article-preview-modal"
          onCancel={() => setPreviewOpen(false)}
          destroyOnHidden
        >
          <ArticlePhonePreview article={previewArticle} />
        </Modal>
      </div>
    </PageContainer>
  )
}
