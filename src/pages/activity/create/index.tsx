/**
 * 活动管理 - 新建 / 编辑活动
 * 视觉对齐设计稿：左侧表单（基础信息两列 + 报名设置三列 + 详情图网格 + 底部操作条）
 * 右侧患者端实时预览；参与机构配置 Drawer；患者端活动预览弹窗（状态切换 + 预览范围）
 * 当前为 mock 数据，后端就绪后替换为 activityApi.saveActivity
 */
import { useState } from 'react'
import {
  App,
  Button,
  Card,
  Cascader,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Table,
  Upload,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
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
import pcaData from 'china-division/dist/pca.json'
import './index.less'

/** 省市区级联选项：{省:{市:[区]}} → Cascader 树 */
type PcaData = Record<string, Record<string, string[]>>
const pca = pcaData as PcaData
const regionOptions = Object.entries(pca).map(([province, cities]) => ({
  value: province,
  label: province,
  children: Object.entries(cities).map(([city, areas]) => ({
    value: city,
    label: city,
    children: areas.map((area) => ({ value: area, label: area })),
  })),
}))

/** 活动参与机构（页面展示/编辑用本地模型；提交时映射为 ActivityInstitutionDTO） */
interface InstitutionRow {
  /** 机构 id（页面 mock） */
  id: string
  name: string
  /** 机构区域展示，如 拱墅区·申花街道 */
  area: string
  /** 场次展示，如 09-20 09:00 */
  activityTime: string
  /** 承接人数（提交映射 max_participants） */
  capacity: number
  contactName?: string
  contactPhone?: string
  /** 场次开始/结束时间（dayjs，提交转 UTC 秒） */
  startTime?: Dayjs | null
  endTime?: Dayjs | null
}

const initialInstitutions: InstitutionRow[] = [
  { id: '1', name: '幸福里健康驿站', area: '拱墅区·申花街道', activityTime: '09-20 09:00', capacity: 40, contactName: '王老师', contactPhone: '138****0000', startTime: dayjs('2026-09-20 09:00'), endTime: dayjs('2026-09-20 17:00') },
  { id: '2', name: '康乐护理院', area: '西湖区·古荡街道', activityTime: '09-20 09:00', capacity: 50, contactName: '李馆长', contactPhone: '139****0000', startTime: dayjs('2026-09-20 09:00'), endTime: dayjs('2026-09-20 17:00') },
  { id: '3', name: '长青健康驿站', area: '滨江区·长河街道', activityTime: '09-20 14:00', capacity: 30, contactName: '张站长', contactPhone: '137****0000', startTime: dayjs('2026-09-20 14:00'), endTime: dayjs('2026-09-20 18:00') },
]

/** 全部机构池（mock）：供可搜索 Select 选择；已添加的机构 disabled 并标识（已添加） */
const mockInstitutionPool: Array<{ id: string; name: string; area: string }> = [
  { id: '1', name: '幸福里健康驿站', area: '拱墅区·申花街道' },
  { id: '2', name: '康乐护理院', area: '西湖区·古荡街道' },
  { id: '3', name: '长青健康驿站', area: '滨江区·长河街道' },
  { id: '4', name: '安怡养老院', area: '上城区·四季青街道' },
  { id: '5', name: '和睦护理中心', area: '拱墅区·半山街道' },
  { id: '6', name: '乐活居家养老站', area: '西湖区·转塘街道' },
  { id: '7', name: '松鹤护理院', area: '滨江区·浦沿街道' },
  { id: '8', name: '幸福家园驿站', area: '余杭区·闲林街道' },
]

/** 预览状态：正常报名 / 报名成功 / 名额已满 */
const previewStatusOptions = [
  { value: 'normal', title: '正常报名', desc: '展示“立即报名”按钮' },
  { value: 'success', title: '报名成功', desc: '展示报名成功结果' },
  { value: 'full', title: '名额已满', desc: '报名按钮置灰不可操作' },
]

const previewScopes = ['活动封面与基础信息', '多张详情长图及排序效果', '底部费用与报名操作栏']

export default function ActivityCreate() {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const params = useParams<{ id: string }>()
  const isEdit = !!params.id && params.id !== 'new'

  const [form] = Form.useForm()
  const name = Form.useWatch('name', form) ?? ''
  const summary = Form.useWatch('summary', form) ?? ''
  const audience = Form.useWatch('audience', form) ?? ''
  const feeType = Form.useWatch('feeType', form) ?? 'free'
  const notice = Form.useWatch('notice', form) ?? ''
  const activityStart = Form.useWatch('start_date', form) as Dayjs | undefined
  const activityEnd = Form.useWatch('end_date', form) as Dayjs | undefined
  const [institutions, setInstitutions] = useState<InstitutionRow[]>(initialInstitutions)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewStatus, setPreviewStatus] = useState('normal')
  /** 可搜索 Select 当前选中的机构 id（选中即添加并清空） */
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | undefined>()
  // 报名须知编辑入口暂时隐藏（切换按钮被注释），保留状态便于恢复
  const [noticeOpen] = useState(false)
  /** 封面（cover_image）：本地预览 URL，提交存真实地址 */
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  /** 图文详情（description）：富文本 ProseMirror JSON 字符串 */
  const [description, setDescription] = useState('')

  const totalCapacity = institutions.reduce((sum, item) => sum + (item.capacity || 0), 0)
  const feeText = feeType === 'free' ? '免费' : '付费'

  const handleRemoveInstitution = (record: InstitutionRow) => {
    modal.confirm({
      title: `确认移除机构「${record.name}」？`,
      content: '移除后该机构将不参与本活动，已配置的场次时间与承接人数将被清空。',
      okText: '确认移除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        setInstitutions((prev) => prev.filter((item) => item.id !== record.id))
        message.success(`已移除「${record.name}」（mock）`)
      },
    })
  }

  const handleCapacityChange = (id: string, value: number | null) => {
    setInstitutions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, capacity: value ?? 0 } : item)),
    )
  }

  /** 更新机构联系类字段（联系人/电话） */
  const updateInstitution = (id: string, patch: Partial<InstitutionRow>) => {
    setInstitutions((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const handleStartTimeChange = (id: string, value: Dayjs | null) => {
    setInstitutions((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const startTime = value ?? null
        // 若结束时间早于新开始时间，自动同步结束时间
        const endTime = item.endTime && startTime && item.endTime.isBefore(startTime)
          ? startTime
          : item.endTime
        return { ...item, startTime, endTime, activityTime: startTime?.format('MM-DD HH:mm') ?? '' }
      }),
    )
  }

  const handleEndTimeChange = (id: string, value: Dayjs | null) => {
    setInstitutions((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, endTime: value ?? null, activityTime: item.startTime?.format('MM-DD HH:mm') ?? '' }
          : item,
      ),
    )
  }

  /** 机构场次日期限制在活动 start_date ~ end_date 区间内 */
  const disableInstitutionDate = (current: Dayjs) => {
    if (activityStart && current.isBefore(activityStart.startOf('day'))) return true
    if (activityEnd && current.isAfter(activityEnd.endOf('day'))) return true
    return false
  }

  const handleAddInstitution = (id?: string) => {
    if (!id) return
    const poolItem = mockInstitutionPool.find((item) => item.id === id)
    if (!poolItem) return
    if (institutions.some((item) => item.id === id)) {
      message.warning('该机构已添加，请选择其他机构')
      setSelectedInstitutionId(undefined)
      return
    }
    setInstitutions((prev) => [
      ...prev,
      {
        id: poolItem.id,
        name: poolItem.name,
        area: poolItem.area,
        activityTime: '',
        capacity: 20,
        contactName: '',
        contactPhone: '',
        startTime: null,
        endTime: null,
      },
    ])
    setSelectedInstitutionId(undefined)
    message.success(`已添加「${poolItem.name}」`)
  }

  /** 封面（cover_image）：拦截真实上传，本地预览；接后端后替换为 uploadApi.uploadFile */
  const handleCoverUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('请上传图片文件')
      return Upload.LIST_IGNORE
    }
    setCoverUrl(URL.createObjectURL(file))
    message.success('封面已更新')
    return false
  }

  const institutionColumns: ColumnsType<InstitutionRow> = [
    {
      title: '参与机构',
      key: 'name',
      render: (_, record) => (
        <div className="institution-cell">
          <strong>{record.name}</strong>
          <span>{record.area}</span>
        </div>
      ),
    },
    {
      title: '联系人',
      key: 'contactName',
      width: 110,
      render: (_, record) => (
        <Input
          value={record.contactName}
          placeholder="联系人"
          onChange={(e) => updateInstitution(record.id, { contactName: e.target.value })}
        />
      ),
    },
    {
      title: '联系电话',
      key: 'contactPhone',
      width: 140,
      render: (_, record) => (
        <Input
          value={record.contactPhone}
          placeholder="联系电话"
          onChange={(e) => updateInstitution(record.id, { contactPhone: e.target.value })}
        />
      ),
    },
    {
      title: '场次开始',
      key: 'startTime',
      width: 180,
      render: (_, record) => (
        <DatePicker
          showTime
          format="MM-DD HH:mm"
          disabledDate={disableInstitutionDate}
          value={record.startTime}
          onChange={(value) => handleStartTimeChange(record.id, value)}
        />
      ),
    },
    {
      title: '场次结束',
      key: 'endTime',
      width: 180,
      render: (_, record) => (
        <DatePicker
          showTime
          format="MM-DD HH:mm"
          disabledDate={disableInstitutionDate}
          value={record.endTime}
          onChange={(value) => handleEndTimeChange(record.id, value)}
        />
      ),
    },
    {
      title: '承接人数',
      key: 'capacity',
      width: 120,
      render: (_, record) => (
        <InputNumber
          min={1}
          value={record.capacity}
          addonAfter="人"
          onChange={(value) => handleCapacityChange(record.id, value)}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 70,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          danger
          onClick={() => handleRemoveInstitution(record)}
        >
          移除
        </Button>
      ),
    },
  ]

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
          <span>{summary || '健康相伴 · 乐享秋日好时光'}</span>
        </div>
        <div className="phone-preview__tags">
          <em>社区活动</em>
          <em>{institutions.length} 家机构可选</em>
        </div>
        <div className="phone-preview__info">
          <p className='phone-preview__info__title'>选择机构后展示对应活动时间</p>
          <p className='phone-preview__info__label'>{institutions.length} 家参与机构可选 · 共承接 {totalCapacity} 人</p>
          <p className='phone-preview__info__highlight'>适合 {audience || '60 岁以上长者'} · {feeText}</p>
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
          name: isEdit ? '秋日康养游园会' : '',
          type: '社区活动',
          summary: isEdit ? '健康相伴 · 乐享秋日好时光' : '',
          location: undefined,
          addressDetail: '',
          start_date: dayjs('2026-08-15'),
          end_date: dayjs('2026-09-18'),
          audience: '60 岁以上长者',
          feeType: 'free',
          notice: isEdit ? '活动免费，报名成功后如需取消请提前 24 小时操作；名额有限，先到先得。' : '',
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
                    <Form.Item
                      name="type"
                      label="活动类型"
                      rules={[{ required: true, message: '请选择活动类型' }]}
                    >
                      <Select
                        options={[
                          { label: '社区活动', value: '社区活动' },
                          { label: '康养旅游', value: '康养旅游' },
                          { label: '健康课堂', value: '健康课堂' },
                          { label: '健康活动', value: '健康活动' },
                        ]}
                      />
                    </Form.Item>
                  </div>
                  
                  <div className="create-grid create-grid--two">
                    <Form.Item
                      name="location"
                      label={<span>活动地址</span>}
                      rules={[{ required: true, message: '请选择省 / 市 / 区' }]}
                    >
                      <Cascader
                        options={regionOptions}
                        placeholder="请选择省 / 市 / 区"
                        showSearch
                      />
                    </Form.Item>
                    <Form.Item
                      name="addressDetail"
                      label={<span>详细地址</span>}
                      rules={[{ required: true, message: '请输入详细地址' }]}
                    >
                      <Input placeholder="请输入详细地址（街道、门牌）" />
                    </Form.Item>
                  </div>
                  
                  {/* <Form.Item name="summary" label="活动摘要">
                    <Input placeholder="用于活动列表和详情首屏展示，建议 30 字以内" />
                  </Form.Item> */}
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
                <Form.Item name="audience" label="适用人群">
                  <Input />
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
                  <Button onClick={() => message.success('草稿已保存')}>保存草稿</Button>
                  <Button onClick={() => setPreviewOpen(true)}>手机预览</Button>
                  <Button
                    type="primary"
                    onClick={async () => {
                      let values: unknown
                      try {
                        values = await form.validateFields()
                      } catch {
                        message.warning('请先完善必填项：活动名称、活动类型、省市区与详细地址、报名起止日期、收费方式')
                        return
                      }
                      // TODO: 后端就绪后替换为 activityApi.createActivity / updateActivity，payload 组装：
                      // {
                      //   ...values,
                      //   location: `${values.location?.join(' ')} ${values.addressDetail}`,
                      //   cover_image: coverUrl ?? '',
                      //   description, // 富文本 ProseMirror JSON 字符串
                      //   start_date: values.start_date.valueOf() / 1000, // UTC 秒
                      //   end_date: values.end_date.valueOf() / 1000,
                      //   institutions: institutions.map(...),
                      // }
                      void values
                      void coverUrl
                      void description
                      message.success(isEdit ? '活动已更新并发布' : '活动已发布')
                      navigate(isEdit ? `/activity/detail/${params.id}` : '/activity')
                    }}
                  >
                    发布活动
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

      <Drawer
        open={drawerOpen}
        width={1000}
        title="配置参与机构"
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="institution-drawer__footer">
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button
              type="primary"
              onClick={() => {
                setDrawerOpen(false)
                message.success('参与机构配置已更新')
              }}
            >
              完成配置
            </Button>
          </div>
        }
      >
        <div className="institution-drawer">
          <p className="institution-drawer__desc">每家机构独立配置活动时间与承接人数</p>
          <div className="institution-drawer__add">
            <Select
              showSearch
              allowClear
              placeholder="搜索机构名称，选择后添加到本活动"
              value={selectedInstitutionId}
              onChange={handleAddInstitution}
              optionFilterProp="label"
              options={mockInstitutionPool.map((item) => {
                const added = institutions.some((inst) => inst.id === item.id)
                return {
                  value: item.id,
                  label: added ? `${item.name}（已添加）` : item.name,
                  disabled: added,
                }
              })}
            />
          </div>
          <div className="institution-drawer__summary">
            已选择 {institutions.length} 家参与机构 / 总承接 {totalCapacity} 人
          </div>
          <Table<InstitutionRow>
            rowKey="id"
            size="small"
            columns={institutionColumns}
            dataSource={institutions}
            pagination={false}
          />
          <div className="institution-drawer__tip">
            患者端选择机构后，自动带出该机构地址、活动时间和剩余名额。
          </div>
        </div>
      </Drawer>

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
