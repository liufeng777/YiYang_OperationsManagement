/**
 * 服务项目 - 新建 / 编辑服务项目
 * 集团统一定义一次，机构选择后继承基础信息与价格
 * 表单使用 antd Form 管理（便于字段校验），排布样式仍由 detail.less 的 editor-grid 提供
 * 当前为 mock 数据，后端就绪后替换为 serviceApi.getServiceDetail / saveService
 */
import { useEffect, useMemo } from 'react'
import { App, Button, Card, Form, Input, Radio, Select, Switch } from 'antd'
import { ArrowLeftOutlined, CheckOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import type { ServiceDetail, ServiceMode, PriceUnit } from '@/api/modules/service'
import './detail.less'

const detailMocks: Record<string, ServiceDetail> = {
  '1': {
    id: '1',
    code: 'FW0001',
    name: '上门助浴服务',
    categoryId: 'c1',
    categoryName: '生活照护',
    mode: '上门',
    price: 168,
    institutionCount: 12,
    orderCount: 326,
    status: 'on',
    description: '专业护理人员上门提供安全、舒适的助浴服务',
    duration: '60 分钟',
    applyRange: '老年人、术后康复人群',
    bookingRule: '服务半径、日容量、接单时间与预约上下架，由机构添加服务后配置',
    cancelRule: '服务前 2 小时',
  },
}

const categoryOptions = ['生活照护', '康复护理', '健康管理', '居家安全', '陪诊出行'].map((item) => ({
  label: item,
  value: item,
}))

const modeOptions: Array<{ label: string; value: ServiceMode }> = [
  { label: '上门服务', value: '上门' },
  { label: '到店服务', value: '到店' },
  { label: '陪同服务', value: '陪同' },
]

const unitOptions: Array<{ label: string; value: PriceUnit }> = [
  { label: '次', value: '次' },
  { label: '小时', value: '小时' },
  { label: '天', value: '天' },
]

const consumableOptions = [
  { label: '是', value: '1' },
  { label: '否', value: '2' },
]

/** 表单值结构：与服务详情字段一一对应，便于后续接接口与校验 */
interface ServiceFormValues {
  name: string
  category: string
  mode: ServiceMode
  price: string
  unit: PriceUnit
  duration?: string
  audience?: string
  package?: string
  consumable: '1' | '2'
  consumableSpec?: string
  consumableList?: string
  summary: string
  content?: string
  publishStatus: 'draft' | 'on'
  openAfterSave: boolean
}

const initialFormValues: Partial<ServiceFormValues> = {
  mode: '上门',
  price: '168.00',
  unit: '次',
  duration: '60 分钟',
  audience: '老年人、术后康复人群',
  consumable: '1',
  publishStatus: 'draft',
  openAfterSave: true,
}

export default function ServiceEditorPage() {
  const navigate = useNavigate()
  const params = useParams()
  const { message } = App.useApp()
  const serviceId = params.id ?? 'new'
  const isCreate = serviceId === 'new'
  const detail = useMemo(() => detailMocks[serviceId], [serviceId])

  const [form] = Form.useForm<ServiceFormValues>()

  // 患者端预览实时联动字段
  const previewName = Form.useWatch('name', form)
  const previewPrice = Form.useWatch('price', form)
  const previewUnit = Form.useWatch('unit', form)
  const previewMode = Form.useWatch('mode', form)

  useEffect(() => {
    if (!detail) return
    form.setFieldsValue({
      name: detail.name,
      category: detail.categoryName,
      mode: detail.mode,
      price: detail.price.toFixed(2),
      duration: detail.duration,
      audience: detail.applyRange,
      summary: detail.description ?? '',
      publishStatus: detail.status === 'on' ? 'on' : 'draft',
    })
  }, [detail, form])

  const pageTitle = isCreate ? '新建服务项目' : '编辑服务项目'

  const handleSave = async (targetStatus: 'draft' | 'on') => {
    form.setFieldValue('publishStatus', targetStatus)
    try {
      await form.validateFields()
    } catch {
      message.warning('请先完善必填项：服务名称、服务分类、参考起售价、计价单位、列表摘要')
      return
    }
    message.success(targetStatus === 'on' ? '服务已保存并启用' : '草稿已保存')
    navigate('/service')
  }

  return (
    <PageContainer
      title={pageTitle}
      description="集团统一定义一次，机构选择后继承基础信息与价格；编辑时复用本页面"
      extra={
        <Button type="primary" icon={<ArrowLeftOutlined />} onClick={() => navigate('/service')}>
          返回服务池
        </Button>
      }
    >
      <Form<ServiceFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={initialFormValues}
      >
        <div className="service-editor">
          <div className="service-editor__form">
            <Card variant="borderless" className="editor-card">
              <div className="editor-card__header">
                <h3>集团服务基础信息</h3>
                <span>这些字段由集团统一维护，机构不可单独修改</span>
              </div>
              <div className="editor-grid">
                <div className="editor-grid__2">
                  <Form.Item
                    name="name"
                    label={<span>服务名称 <i>*</i></span>}
                    rules={[{ required: true, message: '请输入服务名称' }]}
                  >
                    <Input placeholder="例如：上门助浴服务" />
                  </Form.Item>
                  <Form.Item label="服务编码" extra="保存后生成唯一编码">
                    <Input value={detail?.code ?? '系统自动生成'} disabled />
                  </Form.Item>
                </div>
                <div className="editor-grid__4">
                  <Form.Item
                    name="category"
                    label={<span>服务分类 <i>*</i></span>}
                    rules={[{ required: true, message: '请选择服务分类' }]}
                  >
                    <Select placeholder="请选择服务分类" options={categoryOptions} />
                  </Form.Item>
                  <Form.Item
                    name="mode"
                    label={<span>服务方式 <i>*</i></span>}
                    rules={[{ required: true, message: '请选择服务方式' }]}
                  >
                    <Select options={modeOptions} />
                  </Form.Item>
                  <Form.Item
                    name="price"
                    label={<span>参考起售价 <i>*</i></span>}
                    rules={[
                      { required: true, message: '请输入参考起售价' },
                      { pattern: /^\d+(\.\d{1,2})?$/, message: '请输入正确价格（最多两位小数）' },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="unit"
                    label={<span>计价单位 <i>*</i></span>}
                    rules={[{ required: true, message: '请选择计价单位' }]}
                  >
                    <Select options={unitOptions} />
                  </Form.Item>
                </div>
                <div className="editor-grid__3">
                  <Form.Item name="duration" label="服务时长">
                    <Input />
                  </Form.Item>
                  <Form.Item name="audience" label="适用人群">
                    <Input />
                  </Form.Item>
                  <Form.Item name="package" label="启用套餐">
                    <Input placeholder="单次、5次、10次" />
                  </Form.Item>
                </div>
                <div className="editor-grid__3">
                  <Form.Item
                    name="consumable"
                    label={<span>是否涉及耗材 <i>*</i></span>}
                    rules={[{ required: true, message: '请选择是否涉及耗材' }]}
                  >
                    <Select options={consumableOptions} />
                  </Form.Item>
                  <Form.Item name="consumableSpec" label="耗材规格（条件显示）">
                    <Input placeholder="含耗材/不含耗材" />
                  </Form.Item>
                  <Form.Item name="consumableList" label="标准耗材清单">
                    <Input placeholder="清洁用品、护理垫" />
                  </Form.Item>
                </div>
                <Form.Item
                  className="editor-grid__full"
                  name="summary"
                  label={<span>列表摘要 <i>*</i></span>}
                  rules={[{ required: true, message: '请输入列表摘要' }]}
                >
                  <Input placeholder="专业护理人员上门提供安全、舒适的助浴服务" />
                </Form.Item>
              </div>
              <div className="editor-tip">提示：服务半径、日容量、接单时间与预约上下架，由机构添加服务后配置。</div>
            </Card>

            <Card variant="borderless" className="editor-card">
              <div className="editor-card__header">
                <h3>患者端展示内容</h3>
                <span>封面用于列表；详情建议按商品详情方式纵向编排图片</span>
              </div>
              <div className="editor-content">
                <div className="editor-upload editor-upload--cover">
                  <span>列表封面 <i>*</i></span>
                  <div className="editor-upload--cover--box">
                    <PlusOutlined />
                    <p>上传封面</p>
                    <em>建议 1:1</em>
                  </div>
                </div>
                <div className="editor-upload editor-upload--detail">
                  <span>详情图片 <i>*</i></span>
                  <div className="editor-upload__images">
                    <div className="is-blue">服务流程图<em>⇅ 拖动排序</em></div>
                    <div className="is-blue">服务场景图<em>⇅ 拖动排序</em></div>
                    <div className="is-add"><PlusOutlined />添加图片</div>
                  </div>
                </div>
                <Form.Item
                  className="editor-content__textarea"
                  name="content"
                  label="服务内容"
                >
                  <Input.TextArea
                    style={{ height: 100 }}
                    placeholder="填写服务包含项目、准备事项、服务流程和注意事项……"
                  />
                </Form.Item>
              </div>
              <p className="editor-upload__tip">患者端详情按图片顺序展示，可通过右侧手机预览确认整体阅读效果。</p>
            </Card>

            <Card variant="borderless" className="editor-card">
              <div className="editor-card__header">
                <h3>发布设置</h3>
              </div>
              <div className="editor-publish">
                <Form.Item name="publishStatus" noStyle>
                  <Radio.Group
                    options={[
                      { label: '草稿', value: 'draft' },
                      { label: '启用', value: 'on' },
                    ]}
                  />
                </Form.Item>
                <span>启用后机构可从服务池选择添加；历史订单保留创建时快照。</span>
              </div>
              <div className="editor-publish editor-publish--switch">
                <Form.Item name="openAfterSave" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
                <span>保存后立即向机构开放</span>
              </div>
            </Card>
          </div>

          <Card variant="borderless" className="editor-preview">
            <div className="editor-card__header">
              <h3>患者端预览</h3>
              <span>实时预览</span>
            </div>
            <div className="service-phone">
              <div className="service-phone__status">
                <span>9:41</span>
                <i>Wi-Fi</i>
              </div>
              <div className="service-phone__nav">
                <span>‹</span>
                <strong>服务详情</strong>
                <span />
              </div>
              <div className="service-phone__hero">
                <h4>{previewName || '上门助浴服务'}</h4>
                <p>安全 · 专业 · 有温度</p>
              </div>
              <div className="service-phone__body">
                <h4>{previewName || '上门助浴服务'}</h4>
                <div className="service-phone__price">
                  <strong>¥{Number(previewPrice || 0).toFixed(0)}</strong>
                  <span>/ {previewUnit}</span>
                </div>
                <div className="service-phone__meta">
                  <span>{previewMode}</span>
                  <em>由附近已上架机构提供</em>
                </div>
                <div className="service-phone__section">
                  <strong>服务介绍</strong>
                  <div className="is-blue">服务流程图</div>
                  <div className="is-warm">服务场景图</div>
                </div>
              </div>
              <div className="service-phone__footer">
                <Button type="link">收藏</Button>
                <Button type="primary">立即预约</Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="service-editor__footer">
          <span>必填项完成后可保存；编辑服务时，同一页面会带入已有内容。</span>
          <div>
            <Button onClick={() => handleSave('draft')}>保存草稿</Button>
            <Button type="primary" icon={<CheckOutlined />} onClick={() => handleSave('on')}>
              保存并启用
            </Button>
          </div>
        </div>
      </Form>
    </PageContainer>
  )
}
