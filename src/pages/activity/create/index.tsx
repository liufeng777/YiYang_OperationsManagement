/**
 * 活动管理 - 新建 / 编辑活动
 * 视觉对齐设计稿：左侧表单（基础信息 + 报名与参与设置 + 患者端展示详情 + 底部操作条）
 * 右侧患者端实时预览；参与机构配置抽屉（独立组件 components/InstitutionConfigDrawer）；患者端活动预览弹窗
 * 数据来源：GET/POST/PUT /v1/admin/activities（编辑 PUT 为全量覆盖）
 */
import { useEffect, useState } from 'react'
import {
  App,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Upload,
} from 'antd'
import {
  ArrowLeftOutlined,
  CheckOutlined,
  LeftOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import RichDetailEditor from '@/components/RichDetailEditor'
import { activityApi } from '@/api'
import { useImageUpload } from '@/hooks'
import type { ActivityInstitutionConfig, ActivitySaveBody } from '@/api/modules/activity'
import InstitutionConfigDrawer, {
  toInstitutionConfigs,
  toInstitutionRows,
  type ActivityInstitutionRow,
} from '../components/InstitutionConfigDrawer'
import './index.less'

/** 预览状态：正常报名 / 报名成功 / 名额已满 */
const previewStatusOptions = [
  { value: 'normal', title: '正常报名', desc: '展示“立即报名”按钮' },
  { value: 'success', title: '报名成功', desc: '展示报名成功结果' },
  { value: 'full', title: '名额已满', desc: '报名按钮置灰不可操作' },
]

const previewScopes = ['活动封面与基础信息', '多张详情长图及排序效果', '底部费用与报名操作栏']

/** 活动类型：后端数值 ↔ 表单中文标签（表单沿用了设计稿的中文选项） */
const activityTypeOptions = [
  { label: '社区活动', value: 1 },
  { label: '康养旅游', value: 2 },
  { label: '健康课堂', value: 3 },
  { label: '健康活动', value: 4 },
  { label: '其他', value: 5 },
] as const

/** 后端数值 → 表单标签 */
const typeValueToLabel = (value?: number) =>
  activityTypeOptions.find((item) => item.value === value)?.label ?? ''

/** 表单标签 → 后端数值（取不到时回退 1，调用处已由必填校验兜底） */
const labelToTypeValue = (label?: unknown) =>
  activityTypeOptions.find((item) => item.label === label)?.value ?? 1

export default function ActivityCreate() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { uploading, upload } = useImageUpload()
  const params = useParams<{ id: string }>()
  const isEdit = !!params.id && params.id !== 'new'

  const [form] = Form.useForm()
  /** 编辑态详情加载中 */
  const [detailLoading, setDetailLoading] = useState(false)
  /** 提交中 */
  const [submitting, setSubmitting] = useState(false)
  const name = Form.useWatch('name', form) ?? ''
  const typeLabel = Form.useWatch('type', form) ?? ''
  const location = Form.useWatch('location', form) ?? ''
  const targetCrowd = Form.useWatch('target_crowd', form) ?? ''
  const feeType = Form.useWatch('feeType', form) ?? 'free'
  const notice = Form.useWatch('notice', form) ?? ''
  const activityStart = Form.useWatch('start_date', form) as Dayjs | undefined
  const activityEnd = Form.useWatch('end_date', form) as Dayjs | undefined
  /** 参与机构（本地行，抽屉内编辑后回传） */
  const [institutions, setInstitutions] = useState<ActivityInstitutionRow[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewStatus, setPreviewStatus] = useState('normal')
  // 报名须知编辑入口暂时隐藏（切换按钮被注释），保留状态便于恢复
  const [noticeOpen] = useState(false)
  /** 封面预览地址（本地 objectURL 或服务器地址） */
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  /** 封面服务器地址（上传成功后写入 cover_url） */
  const [coverServerUrl, setCoverServerUrl] = useState('')
  /** 编辑态原始数据：PUT 为全量覆盖，未在表单暴露的字段（code）与原封面需原值回写 */
  const [originCode, setOriginCode] = useState('')
  const [originCoverUrl, setOriginCoverUrl] = useState('')
  /** 编辑态原始时间：用户清空日期时回退原值，避免被 0 覆盖 */
  const [originMeta, setOriginMeta] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  })
  /** 编辑态原始参与机构：PUT 全量覆盖下，机构场次 / 名额被清空时回退原值 */
  const [originInstitutions, setOriginInstitutions] = useState<
    ActivityInstitutionConfig[]
  >([])
  /** 图文详情（description）：富文本 ProseMirror JSON 字符串 */
  const [description, setDescription] = useState('')

  const totalCapacity = institutions.reduce((sum, item) => sum + (item.capacity || 0), 0)
  const feeText = feeType === 'free' ? '免费' : '付费'

  /** 封面（cover_url）：本地预览 + 后台上传，成功后保存服务器地址 */
  const handleCoverUpload = async (file: File) => {
    await upload(file, {
      onLocalPreview: (localUrl) => setCoverUrl(localUrl),
      onUploaded: (url) => {
        setCoverServerUrl(url)
        setCoverUrl(url)
        message.success('封面已上传')
      },
      onError: () => setCoverServerUrl(originCoverUrl),
    })
    return Upload.LIST_IGNORE
  }

  /** 编辑态：拉取活动详情回填表单、封面、图文详情与承接机构 */
  useEffect(() => {
    if (!isEdit || !params.id) return
    let cancelled = false
    setDetailLoading(true)
    activityApi
      .getActivity(Number(params.id))
      .then((detail) => {
        if (cancelled) return
        form.setFieldsValue({
          name: detail.title,
          title_en: detail.title_en ?? '',
          type: typeValueToLabel(detail.activity_type),
          // location 现在为「活动区域」文本，可直接回填
          location: detail.location ?? '',
          target_crowd: detail.target_crowd ?? '',
          start_date: detail.start_date ? dayjs(detail.start_date * 1000) : undefined,
          end_date: detail.end_date ? dayjs(detail.end_date * 1000) : undefined,
          notice: '',
        })
        // 出参与入参字段名同为 cover_url
        setCoverUrl(detail.cover_url || null)
        setCoverServerUrl(detail.cover_url ?? '')
        setOriginCoverUrl(detail.cover_url ?? '')
        setOriginCode(detail.code ?? '')
        setOriginMeta({
          start: detail.start_date ?? 0,
          end: detail.end_date ?? 0,
        })
        setDescription(detail.description ?? '')
        // 记录原始机构，供 PUT 全量覆盖时对空值回退
        setOriginInstitutions(detail.institutions ?? [])
        // 参与机构回填（机构名 / 区域由抽屉用机构池补全，页面无需额外查询）
        setInstitutions(toInstitutionRows(detail.institutions))
      })
      .catch(() => {
        /* 拦截器已统一提示 */
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isEdit, params.id, form])

  /**
   * 提交：组装 ActivitySaveBody（契约见 api/modules/activity.ts）
   * 注意 PUT 为全量覆盖：表单未暴露的字段（code）与原封面需原值回写，避免清空后端数据
   */
  const buildPayload = (
    values: Record<string, unknown>,
    descriptionValue: string,
  ): ActivitySaveBody => {
    const toSeconds = (value: unknown, fallback: number) =>
      value ? Math.floor((value as Dayjs).valueOf() / 1000) : fallback
    return {
      title: String(values.name ?? ''),
      title_en: String(values.title_en ?? '').trim(),
      code: originCode,
      activity_type: labelToTypeValue(values.type),
      description: descriptionValue,
      // 封面：使用上传接口返回的服务器地址（无新上传时沿用编辑态原值，避免写入失效地址）
      cover_url: coverServerUrl || originCoverUrl,
      location: String(values.location ?? '').trim(),
      target_crowd: String(values.target_crowd ?? '').trim(),
      start_date: toSeconds(values.start_date, originMeta.start),
      end_date: toSeconds(values.end_date, originMeta.end),
      // 参与机构：抽屉回传的本地行 → 契约 institutions[]（空值回退原配置）
      institutions: toInstitutionConfigs(institutions, originInstitutions),
    }
  }

  /** 患者端手机预览；status 控制底部报名按钮状态 */
  const renderPhonePreview = (status: string = 'normal') => (
    <div className="phone-preview">
      <div className="phone-preview__screen">
        <div className="phone-preview__header">
          <LeftOutlined />
          活动详情
        </div>
        <div className="phone-preview__hero">
          <strong>{name || '秋日康养游园会'}</strong>
          <span>{location || '健康相伴 · 乐享秋日好时光'}</span>
        </div>
        <div className="phone-preview__tags">
          <em>{typeLabel || '社区活动'}</em>
          <em>{institutions.length} 家机构可选</em>
        </div>
        <div className="phone-preview__info">
          <p className='phone-preview__info__title'>选择机构后展示对应活动时间</p>
          <p className='phone-preview__info__label'>{institutions.length} 家参与机构可选 · 共承接 {totalCapacity} 人</p>
          <p className='phone-preview__info__highlight'>适合 {targetCrowd || '60 岁以上长者'} · {feeText}</p>
        </div>
        <div className="phone-preview__image phone-preview__image--cream">
          <em>DETAIL IMAGE 01</em>
          <strong>五大康养活动亮点</strong>
          <span>健康义诊 · 趣味运动 · 营养茶歇</span>
        </div>
        <div className="phone-preview__image phone-preview__image--green">
          <em>DETAIL IMAGE 02</em>
          <strong>活动流程与注意事项</strong>
          <span>签到集合 · 分组体验 · 午间休息 · 快乐返程</span>
        </div>
        {status === 'success' && (
          <div className="phone-preview__success">
            <CheckOutlined /> 报名成功，已为您预留名额
          </div>
        )}
        <div className="phone-preview__footer">
          <div>
            <span>活动费用</span>
            <strong>{feeText}</strong>
          </div>
          {status === 'full' ? (
            <button type="button" disabled>
              名额已满
            </button>
          ) : (
            <button type="button">{status === 'success' ? '已报名' : '立即报名'}</button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <PageContainer
      title={isEdit ? '编辑活动' : '新建活动'}
      description="单页面配置活动信息、参与机构和患者端详情图片"
      extra={
        <Button
          color="primary" variant='outlined'
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/activity')}
        >
          返回活动列表
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          type: '社区活动',
          feeType: 'free',
        }}
      >
        <div className="activity-create">
          <div className="activity-create__form">
            <Card variant="borderless" className="create-card basic-card">
              <h3>活动基础信息<span>患者端结构化展示</span></h3>
              <div className='create-card__basicInfo'>
                <div className='create-card__basicInfo__left'>
                  <div className="create-grid create-grid--two">
                    <Form.Item
                      name="name"
                      label="活动名称"
                      rules={[{ required: true, message: '请输入活动名称' }]}
                    >
                      <Input placeholder="请输入活动名称" />
                    </Form.Item>
                    <Form.Item name="title_en" label="英文标题">
                      <Input placeholder="选填，用于患者端英文展示" />
                    </Form.Item>
                  </div>

                  <div className="create-grid create-grid--two">
                    <Form.Item
                      name="type"
                      label="活动类型"
                      rules={[{ required: true, message: '请选择活动类型' }]}
                    >
                      <Select
                        options={activityTypeOptions.map((item) => ({
                          label: item.label,
                          value: item.label,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item
                      name="location"
                      label={<span>活动区域</span>}
                    >
                      <Input placeholder="请输入活动举办的区域，如 杭州市滨江区" />
                    </Form.Item>
                  </div>
                </div>
                {/* <div className='create-card__basicInfo__right'>
                  <Form.Item label="活动封面" className="create-cover">
                    <Upload accept="image/*" showUploadList={false} beforeUpload={handleCoverUpload}>
                      <button type="button" className={`create-upload${coverUrl ? ' has-image' : ''}`}>
                        {coverUrl ? (
                          <img src={coverUrl} alt="活动封面" />
                        ) : (
                          <>
                            <PlusOutlined />
                            <span>上传 750 × 560px</span>
                          </>
                        )}
                      </button>
                    </Upload>
                  </Form.Item>
                </div> */}
              </div>
            </Card>

            <Card variant="borderless" className="create-card">
              <h3>报名与参与设置<span>活动内容统一配置；各机构独立设置活动时间和承接人数</span></h3>
              <div className="create-grid create-grid--four">
                <Form.Item
                  name="start_date"
                  label={<span>报名开始</span>}
                  rules={[{ required: true, message: '请选择报名开始日期' }]}
                >
                  <DatePicker placeholder="选择开始日期" style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item
                  name="end_date"
                  label={<span>报名结束</span>}
                  rules={[{ required: true, message: '请选择报名结束日期' }]}
                >
                  <DatePicker placeholder="选择结束日期" style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="target_crowd" label="适用人群">
                  <Input placeholder="如 60 岁以上长者" />
                </Form.Item>
                <Form.Item
                  name="feeType"
                  label="收费方式"
                  rules={[{ message: '请选择收费方式' }]}
                >
                  <Select
                    disabled
                    options={[
                      { label: '免费', value: 'free' },
                      { label: '付费', value: 'paid' },
                    ]}
                  />
                </Form.Item>
              </div>
              <div className="create-config">
                <div className="create-config__bar">
                  <strong>已配置 {institutions.length} 家参与机构 · 总承接 {totalCapacity} 人</strong>
                  <span>总名额由各机构承接人数自动汇总</span>
                </div>
                <Button type="primary" onClick={() => setDrawerOpen(true)}>
                  配置参与机构
                </Button>
              </div>
            </Card>

            <Card variant="borderless" className="create-card">
              <h3>患者端展示详情</h3>
              <div className="patient-detail">
                <div className="patient-detail__field patient-detail__cover">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="patient-detail__label">活动封面</span>
                    <p className="patient-detail__tip">建议尺寸 750×560，展示于患者端活动详情页顶部。</p>
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
                        alt="活动封面"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                      />
                    ) : (
                      <div>
                        <PlusOutlined />
                        <div style={{ marginTop: 8 }}>上传封面</div>
                      </div>
                    )}
                  </Upload>
                </div>
                <RichDetailEditor label="图文详情" value={description} onChange={setDescription} />
              </div>
            </Card>

            <Card variant="borderless" className="create-card create-card--footer">
              <div className="create-submit">
                <div className="create-submit__info">
                  <h3>报名须知与退款规则</h3>
                  <p>
                    {notice ? '已填写' : '未填写'} · 发布后同步展示在患者端
                    {/* <Button type="link" size="small" onClick={() => setNoticeOpen((prev) => !prev)}>
                      {noticeOpen ? '收起' : '修改'}
                    </Button> */}
                  </p>
                </div>
                <div className="create-footer">
                  <Button onClick={() => setPreviewOpen(true)}>手机预览</Button>
                  <Button onClick={() => {}}>存为草稿</Button>
                  <Button
                    type="primary"
                    loading={submitting || detailLoading}
                    onClick={async () => {
                      let values: Record<string, unknown>
                      try {
                        values = (await form.validateFields()) as Record<string, unknown>
                      } catch {
                        message.warning('请先完善必填项：活动名称、活动类型、活动区域、报名起止日期、收费方式')
                        return
                      }
                      if (institutions.length === 0) {
                        message.warning('请先配置参与机构：需至少配置一家')
                        return
                      }
                      const payload = buildPayload(values, description)
                      setSubmitting(true)
                      try {
                        if (isEdit && params.id) {
                          await activityApi.updateActivity(Number(params.id), payload)
                          message.success('活动已更新')
                        } else {
                          await activityApi.createActivity(payload)
                          message.success('活动已发布')
                        }
                        navigate('/activity')
                      } catch {
                        /* 错误提示由 request 拦截器统一处理 */
                      } finally {
                        setSubmitting(false)
                      }
                    }}
                  >
                    {isEdit ? '保存活动' : '发布活动'}
                  </Button>
                </div>
              </div>
              {noticeOpen && (
                <Form.Item name="notice" className="create-notice">
                  <Input.TextArea rows={3} placeholder="将展示在患者端报名确认页" />
                </Form.Item>
              )}
            </Card>
          </div>

          <div className="activity-create__preview">
            <Card variant="borderless" className="create-preview">
              <h3>患者端实时预览<span>详情图片按 750px 等比缩放</span></h3>
              {renderPhonePreview()}
            </Card>
          </div>
        </div>
      </Form>

      <InstitutionConfigDrawer
        open={drawerOpen}
        value={institutions}
        activityStart={activityStart}
        activityEnd={activityEnd}
        onClose={() => setDrawerOpen(false)}
        onSubmit={(rows) => {
          setInstitutions(rows)
          setDrawerOpen(false)
          message.success('参与机构配置已更新')
        }}
      />

      <Modal
        open={previewOpen}
        width={920}
        footer={null}
        onCancel={() => setPreviewOpen(false)}
        title={
          <div className="preview-modal__title">
            <h3>患者端活动预览</h3>
            <p>预览内容不会产生真实报名数据</p>
          </div>
        }
      >
        <div className="preview-modal">
          <div className="preview-modal__left">
            <p className="preview-modal__caption">完整页面预览 · 可上下滚动查看详情长图</p>
            {renderPhonePreview(previewStatus)}
          </div>
          <div className="preview-modal__panel">
            <h4>预览状态</h4>
            <p className="preview-modal__aux">切换患者端关键结果状态</p>
            <Radio.Group
              className="preview-status"
              value={previewStatus}
              onChange={(event) => setPreviewStatus(event.target.value)}
            >
              {previewStatusOptions.map((item) => (
                <Radio key={item.value} value={item.value} className="preview-status__item">
                  <strong>{item.title}</strong>
                  <span>{item.desc}</span>
                </Radio>
              ))}
            </Radio.Group>
            <h4>预览范围</h4>
            <ul className="preview-scope">
              {previewScopes.map((item) => (
                <li key={item}>
                  <CheckOutlined />
                  {item}
                </li>
              ))}
            </ul>
            <div className="preview-modal__tip">
              <strong>仅用于展示检查</strong>
              <p>预览中的报名操作不会生成订单、报名记录或协作工单。</p>
            </div>
            <Button type="primary" block size="large" onClick={() => setPreviewOpen(false)}>
              关闭预览
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  )
}
