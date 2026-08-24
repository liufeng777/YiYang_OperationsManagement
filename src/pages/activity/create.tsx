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
  SearchOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import ImageSortGrid from '@/components/ImageSortGrid'
import type { SortableImage } from '@/components/ImageSortGrid'
import type { ActivityInstitutionConfig } from '@/api/modules/activity'
import './create.less'

const initialInstitutions: ActivityInstitutionConfig[] = [
  { id: '1', name: '幸福里健康驿站', area: '拱墅区·申花街道', activityTime: '09-20 09:00', capacity: 40 },
  { id: '2', name: '康乐护理院', area: '西湖区·古荡街道', activityTime: '09-20 09:00', capacity: 50 },
  { id: '3', name: '长青健康驿站', area: '滨江区·长河街道', activityTime: '09-20 14:00', capacity: 30 },
]

const initialDetailImages: SortableImage[] = [
  { id: '1', title: '活动亮点', size: '750 × 980px' },
  { id: '2', title: '活动流程', size: '750 × 1200px' },
  { id: '3', title: '环境与须知', size: '750 × 960px' },
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
  const { message } = App.useApp()
  const params = useParams<{ id: string }>()
  const isEdit = !!params.id && params.id !== 'new'

  const [form] = Form.useForm()
  const name = Form.useWatch('name', form) ?? ''
  const summary = Form.useWatch('summary', form) ?? ''
  const audience = Form.useWatch('audience', form) ?? ''
  const feeType = Form.useWatch('feeType', form) ?? 'free'
  const notice = Form.useWatch('notice', form) ?? ''
  const [institutions, setInstitutions] = useState<ActivityInstitutionConfig[]>(initialInstitutions)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewStatus, setPreviewStatus] = useState('normal')
  const [drawerKeyword, setDrawerKeyword] = useState('')
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [images, setImages] = useState<SortableImage[]>(initialDetailImages)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)

  const totalCapacity = institutions.reduce((sum, item) => sum + (item.capacity || 0), 0)
  const feeText = feeType === 'free' ? '免费' : '付费'

  const handleRemoveInstitution = (id: string) => {
    setInstitutions((prev) => prev.filter((item) => item.id !== id))
  }

  const handleCapacityChange = (id: string, value: number | null) => {
    setInstitutions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, capacity: value ?? 0 } : item)),
    )
  }

  const handleTimeChange = (id: string, value: string) => {
    setInstitutions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, activityTime: value } : item)),
    )
  }

  const handleAddInstitution = () => {
    const keyword = drawerKeyword.trim()
    if (!keyword) {
      message.warning('请先搜索并选择要添加的机构')
      return
    }
    setInstitutions((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: keyword,
        area: '待补充区域',
        activityTime: '09-20 09:00',
        capacity: 20,
      },
    ])
    setDrawerKeyword('')
  }

  const handleImageUpload = (file: File) => {
    setImages((prev) => [
      ...prev,
      {
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: file.name.replace(/\.[^.]+$/, ''),
        size: '750px 宽',
        url: URL.createObjectURL(file),
      },
    ])
    message.success('已添加详情图')
    return false
  }

  const handleCoverUpload = (file: File) => {
    setCoverUrl(URL.createObjectURL(file))
    message.success('封面已更新')
    return false
  }

  const institutionColumns: ColumnsType<ActivityInstitutionConfig> = [
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
      title: '活动时间',
      key: 'activityTime',
      width: 180,
      render: (_, record) => (
        <Input
          value={record.activityTime}
          onChange={(event) => handleTimeChange(record.id, event.target.value)}
        />
      ),
    },
    {
      title: '承接人数',
      key: 'capacity',
      width: 140,
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
      width: 80,
      render: (_, record) => (
        <Button type="link" size="small" danger onClick={() => handleRemoveInstitution(record.id)}>
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
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(isEdit ? `/activity/detail/${params.id}` : '/activity')}
        >
          {isEdit ? '返回活动详情' : '返回活动列表'}
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          name: isEdit ? '秋日康养游园会' : '',
          type: '社区活动',
          summary: isEdit ? '健康相伴 · 乐享秋日好时光' : '',
          signupTime: '2026-08-15 至 09-18',
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
                  <Form.Item name="summary" label="活动摘要">
                    <Input placeholder="用于活动列表和详情首屏展示，建议 30 字以内" />
                  </Form.Item>
                </div>
                <div className='create-card__basicInfo__right'>
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
                </div>
              </div>
            </Card>

            <Card variant="borderless" className="create-card">
              <h3>报名与参与设置<span>活动内容统一配置；各机构独立设置活动时间和承接人数</span></h3>
              <div className="create-grid create-grid--three">
                <Form.Item
                  name="signupTime"
                  label="报名时间"
                  rules={[{ required: true, message: '请输入报名时间' }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item name="audience" label="适用人群">
                  <Input />
                </Form.Item>
                <Form.Item
                  name="feeType"
                  label="收费方式"
                  rules={[{ required: true, message: '请选择收费方式' }]}
                >
                  <Select
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
              <h3>患者端活动详情<span>多张图片纵向拼接，可拖动调整顺序</span></h3>
              <Upload accept="image/*" showUploadList={false} multiple beforeUpload={handleImageUpload}>
                <button type="button" className='create-upload' style={{width: '100%', height: 50}}>
                  <PlusOutlined />
                  <span>上传详情图片</span>
                  <em>统一宽度 750px，建议上传 3-8 张</em>
                </button>
              </Upload>
              <ImageSortGrid
                images={images}
                onChange={setImages}
                addable={false}
              />
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
                      try {
                        await form.validateFields()
                      } catch {
                        message.warning('请先完善必填项：活动名称、活动类型、报名时间、收费方式')
                        return
                      }
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
        width={720}
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
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索机构名称，添加到本活动"
              value={drawerKeyword}
              onChange={(event) => setDrawerKeyword(event.target.value)}
              onPressEnter={handleAddInstitution}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddInstitution}>
              添加机构
            </Button>
          </div>
          <div className="institution-drawer__summary">
            已选择 {institutions.length} 家参与机构 / 总承接 {totalCapacity} 人
          </div>
          <Table<ActivityInstitutionConfig>
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
