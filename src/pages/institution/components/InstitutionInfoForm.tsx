/**
 * 机构基础信息 + 患者端展示详情（新增机构 / 机构详情-基础资料 Tab 共用）
 * 布局：左侧「基础信息」「患者端展示详情」卡片 + 右侧患者端手机实时预览
 * - 不传 detail → 新增模式（institutionApi.createInstitution），保存成功后回调 onSaved(新机构 id)
 * - 传入 detail → 编辑模式（institutionApi.updateInstitution，后端 PUT 全量覆盖），保存成功后回调 onSaved()
 * 外层自行提供 <Form> 的父级布局与页面标题；封面 / 图文详情为受控状态，随表单一起提交
 */
import { useState } from 'react'
import { App, Button, Card, Form, Input, Upload } from 'antd'
import { CheckOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import { institutionApi } from '@/api'
import { useImageUpload } from '@/hooks'
import type { InstitutionItem, InstitutionType } from '@/api/modules/institution'
import RichDetailEditor from '@/components/RichDetailEditor'
import RichDetailPreview, { isRichDetailEmpty } from '@/components/RichDetailPreview'
import PhonePreview from '@/components/PhonePreview'
import InstitutionBaseFields from './InstitutionBaseFields'
import './InstitutionInfoForm.less'

/** 系统默认接单时段：08:00 ~ 18:00（当天 0 点秒偏移） */
const DEFAULT_OPEN_SECOND = 28800
const DEFAULT_CLOSE_SECOND = 64800
/** 系统默认日容量 / 预约提前 / 取消间隔 */
const DEFAULT_MAX_WORK_ORDERS = 16
const DEFAULT_LEAD_TIME_MIN = 180
const DEFAULT_CANCEL_INTERVAL_MIN = 180

/** 当天秒偏移 → 时间选择器值（用于接单时段回填） */
const secondsToTime = (seconds: number): Dayjs =>
  dayjs()
    .startOf('day')
    .add(Math.min(Math.max(seconds, 0), 86399), 'second')

/** 时间选择器值 → 当天秒偏移（daily_open_second / daily_close_second） */
const timeToSeconds = (value?: Dayjs | null): number | null =>
  value ? value.hour() * 3600 + value.minute() * 60 + value.second() : null

export interface InstitutionInfoFormProps {
  /** 编辑模式传入机构详情；不传则为新增模式 */
  detail?: InstitutionItem
  /** 保存成功回调：新增模式带回新机构 id，编辑模式带回当前机构 id */
  onSaved?: (id: number) => void
  /** 取消回调（仅新增模式展示「取消」按钮） */
  onCancel?: () => void
}

/** 表单值：基础信息字段与 InstitutionItem 一一对应，region 为省市区三级数组（提交时拆分） */
interface InstitutionInfoValues {
  name: string
  name_en?: string
  type: InstitutionType
  region: string[]
  address: string
  contact_phone: string
  manager_name?: string
  manager_phone?: string
  service_radius_km?: number
  /** 日容量：每日可预约工单数上限 */
  daily_max_work_orders?: number
  /** 接单时段（提交时转 daily_open_second / daily_close_second） */
  daily_time_range?: [Dayjs, Dayjs] | null
  /** 预约至少提前（分钟） */
  min_lead_time_min?: number
  /** 取消规则：服务前多少分钟内不可取消（分钟） */
  max_cancel_interval_min?: number
  /** 患者端展示标题（存储回 brief） */
  brief: string
}

export default function InstitutionInfoForm({ detail, onSaved, onCancel }: InstitutionInfoFormProps) {
  const isCreate = !detail
  const { message } = App.useApp()
  const { uploading, upload } = useImageUpload()
  const [form] = Form.useForm<InstitutionInfoValues>()
  /** 封面预览地址（本地 objectURL 或服务器地址） */
  const [coverUrl, setCoverUrl] = useState<string | null>(detail?.cover_url || null)
  /** 封面服务器地址（上传成功后写入 cover_url） */
  const [coverServerUrl, setCoverServerUrl] = useState(detail?.cover_url ?? '')
  /** 图文详情（ProseMirror JSON 字符串），随提交写入 description */
  const [richDesc, setRichDesc] = useState(detail?.description || '')
  const [submitting, setSubmitting] = useState(false)

  // 患者端预览实时联动展示标题
  const previewBrief = Form.useWatch('brief', form)

  /** 封面选择：本地预览 + 后台上传，成功后保存服务器地址供提交 */
  const handleCoverUpload = async (file: File) => {
    await upload(file, {
      onLocalPreview: (localUrl) => setCoverUrl(localUrl),
      onUploaded: (url) => {
        setCoverServerUrl(url)
        setCoverUrl(url)
        message.success('机构封面已上传')
      },
      onError: () => {
        // 上传失败：保留本地预览但回退可提交地址，避免把本地 blob 地址提交给后端
        setCoverServerUrl(detail?.cover_url ?? '')
      },
    })
    return false
  }

  const handleSave = async () => {
    let values: InstitutionInfoValues
    try {
      values = await form.validateFields()
    } catch {
      message.warning('请先完善必填项')
      return
    }
    const [province = '', city = '', district = ''] = values.region ?? []
    const payload = {
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
      service_radius_km: values.service_radius_km ?? null,
      // 经营参数：日容量 / 接单时段（秒偏移）/ 预约提前 / 取消间隔
      daily_max_work_orders: values.daily_max_work_orders ?? null,
      daily_open_second: timeToSeconds(values.daily_time_range?.[0]),
      daily_close_second: timeToSeconds(values.daily_time_range?.[1]),
      min_lead_time_min: values.min_lead_time_min ?? null,
      max_cancel_interval_min: values.max_cancel_interval_min ?? null,
      brief: values.brief,
      description: richDesc,
      // 封面使用上传接口返回的服务器地址（无新上传时沿用原值）
      cover_url: coverServerUrl || (detail?.cover_url ?? ''),
    }
    setSubmitting(true)
    try {
      if (isCreate) {
        const result = await institutionApi.createInstitution({ ...payload, status: 1 })
        message.success('机构已创建，进入机构配置页')
        onSaved?.(result.id)
      } else {
        // 后端 PUT 全量覆盖：status 不在表单中，需原值回传
        await institutionApi.updateInstitution(detail.id, { ...payload, status: detail.status })
        message.success('基础资料已保存')
        onSaved?.(detail.id)
      }
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="institution-editor">
      <div className="institution-editor__form">
        <Form<InstitutionInfoValues>
          form={form}
          layout="vertical"
          initialValues={
            detail
              ? {
                  name: detail.name,
                  name_en: detail.name_en ?? undefined,
                  type: detail.type,
                  region: [detail.province, detail.city, detail.district],
                  address: detail.address,
                  contact_phone: detail.contact_phone,
                  manager_name: detail.manager_name,
                  manager_phone: detail.manager_phone,
                  service_radius_km: detail.service_radius_km ?? undefined,
                  daily_max_work_orders: detail.daily_max_work_orders ?? undefined,
                  daily_time_range:
                    detail.daily_open_second != null && detail.daily_close_second != null
                      ? [
                          secondsToTime(detail.daily_open_second),
                          secondsToTime(detail.daily_close_second),
                        ]
                      : undefined,
                  min_lead_time_min: detail.min_lead_time_min ?? undefined,
                  max_cancel_interval_min: detail.max_cancel_interval_min ?? undefined,
                  brief: detail.brief,
                }
              : {
                  // 新增机构：经营参数给出系统默认值，留空则后端使用默认
                  daily_max_work_orders: DEFAULT_MAX_WORK_ORDERS,
                  daily_time_range: [
                    secondsToTime(DEFAULT_OPEN_SECOND),
                    secondsToTime(DEFAULT_CLOSE_SECOND),
                  ],
                  min_lead_time_min: DEFAULT_LEAD_TIME_MIN,
                  max_cancel_interval_min: DEFAULT_CANCEL_INTERVAL_MIN,
                }
          }
        >
          <Card variant="borderless" className="editor-card">
            <div className="editor-card__header">
              <h3>基础信息</h3>
              <span>机构名称、类型、地址与管理员信息，保存后生成唯一机构编码</span>
            </div>
            <InstitutionBaseFields />
          </Card>

          <Card variant="borderless" className="editor-card">
            <div className="editor-card__header">
              <h3>患者端展示详情</h3>
              <span>展示标题、封面与图文详情，用于患者端机构详情页</span>
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
              <div className="patient-detail institution-editor__patient-detail">
                <div className="patient-detail__field patient-detail__cover">
                  <div className="institution-editor__cover-label">
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
                      <img className="institution-editor__cover-image" src={coverUrl} alt="机构封面" />
                    ) : (
                      <div>
                        <PlusOutlined />
                        <div className="institution-editor__upload-text">
                          {uploading ? '上传中…' : '上传封面'}
                        </div>
                      </div>
                    )}
                  </Upload>
                </div>
                <RichDetailEditor label="图文详情" value={richDesc} onChange={setRichDesc} />
              </div>
            </div>
          </Card>
        </Form>

        <div className="institution-editor__footer">
          <span>
            {isCreate
              ? '带 * 为必填项；保存后可在机构详情页继续配置服务项目与患者端展示。'
              : '机构基础信息由平台直接维护，修改后实时生效。'}
          </span>
          <div>
            {isCreate && <Button onClick={onCancel}>取消</Button>}
            <Button type="primary" icon={<CheckOutlined />} loading={submitting} onClick={handleSave}>
              {isCreate ? '保存并进入配置' : '保存修改'}
            </Button>
          </div>
        </div>
      </div>

      <Card variant="borderless" className="institution-editor__preview">
        <div className="editor-card__header">
          <h3>患者端预览</h3>
          <span>实时预览</span>
        </div>
        <div className="institution-phone">
          <PhonePreview title="机构详情">
            <div
              className={`institution-phone__cover${coverUrl ? '' : ' institution-phone__cover--empty'}`}
            >
              {coverUrl ? <img src={coverUrl} alt="机构封面" /> : '未上传机构封面'}
            </div>
            <div className="institution-phone__body">
              <h4>{previewBrief || detail?.brief || '患者端展示标题'}</h4>
              {isRichDetailEmpty(richDesc) ? (
                <p>编辑图文详情后在此展示机构简介</p>
              ) : (
                <RichDetailPreview value={richDesc} />
              )}
            </div>
          </PhonePreview>
        </div>
      </Card>
    </div>
  )
}
