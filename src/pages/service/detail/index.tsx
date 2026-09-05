/**
 * 服务项目 - 新建 / 编辑服务项目
 * 集团统一定义一次，机构选择后继承基础信息与价格
 * 表单使用 antd Form 管理（便于字段校验），排布样式仍由 detail.less 的 editor-grid 提供
 * 当前为 mock 数据，后端就绪后替换为 serviceApi.getServiceItem / saveService
 */
import { useEffect, useMemo, useState } from 'react'
import { App, Button, Card, Drawer, Form, Input, InputNumber, Modal, Radio, Select, Switch, Table, Upload } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined, ArrowDownOutlined, ArrowUpOutlined, CheckOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import RichTextEditor from '@/components/RichTextEditor'
import type { JSONContent } from '@/components/RichTextEditor'
import { uploadApi } from '@/api'
import type { ServiceItem, ServiceSaveBody, Package, PriceUnit } from '@/api/modules/service'
import { categories, typeText } from '../list'
import './index.less'

/** 患者端详情示例（ProseMirror JSON 字符串，存储到 ServiceItem.description） */
const demoDescription = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '服务包含项目' }],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '全身温水擦浴或淋浴助浴（约 60 分钟）' }],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '浴前生命体征测量与风险评估' }],
            },
          ],
        },
      ],
    },
  ],
} satisfies JSONContent)

const detailMocks: Record<string, ServiceItem> = {
  1: {
    id: 1,
    code: 'FW0001',
    category_id: 1,
    service_type: 1,
    name: '上门助浴服务',
    name_en: '',
    description: demoDescription,
    price: 168,
    unit: '次',
    duration: 60,
    status: 1,
    vital_sign: [],
    is_consumable_supported: true,
    packages: [
      { count: 5, price: 1100, price_with_consum: 1300 },
      { count: 10, price: 2100, price_with_consum: 2500 },
    ],
    service_process: JSON.stringify([
      { title: '上门评估', description: '核对身份，评估居室与洗浴环境安全' },
      { title: '助浴服务', description: '调节水温与室温，全程陪护助浴' },
      { title: '浴后护理', description: '皮肤护理与居室整理，记录服务结果' },
    ]),
    cover_url: '',
  },
}

const unitOptions: Array<{ label: string; value: PriceUnit }> = [
  { label: '次', value: '次' },
  { label: '小时', value: '小时' },
  { label: '天', value: '天' },
]

const consumableOptions = [
  { label: '是', value: '1' },
  { label: '否', value: '2' },
]

/** 服务套餐项：对齐 DTO Package（count/price/price_with_consum），fixed 为内置「单次服务」，不可删除 */
interface PackageItem extends Package {
  id: string
  fixed?: boolean
}

const initialPackages: PackageItem[] = [
  { id: 'pkg-1', count: 1, price_with_consum: 275, price: 235, fixed: true },
]

/** 套餐名称由次数派生：单次服务 / N次套餐 */
const packageName = (count: number) => (count === 1 ? '单次服务' : `${count}次套餐`)

/** 套餐价格展示：¥1,300.00 */
const formatPackagePrice = (value: number) =>
  `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** 表单值结构：字段名对齐 ServiceItem DTO，便于直接组装保存入参 */
interface ServiceFormValues {
  name: string
  category_id: number
  service_type: number
  price: string
  unit: PriceUnit
  duration?: number
  audience?: string
  package?: string
  /** '1' 涉及耗材（is_consumable_supported）/ '2' 不涉及 */
  consumable: '1' | '2'
  consumableSpec?: string
  consumableList?: string
  /** 是否启用多次套餐（关闭后仅保留「单次服务」） */
  packageEnabled: boolean
  summary: string
  /** draft → status 9；on → status 1 */
  publishStatus: 'draft' | 'on'
  openAfterSave: boolean
}

const initialFormValues: Partial<ServiceFormValues> = {
  service_type: 1,
  price: '168.00',
  unit: '次',
  duration: 60,
  audience: '老年人、术后康复人群',
  consumable: '1',
  consumableSpec: '含耗材',
  consumableList: '清洁用品、护理垫',
  packageEnabled: true,
  publishStatus: 'draft',
  openAfterSave: true,
}

/** 服务过程步骤：序列化为 JSON 字符串存入 ServiceItem.service_process，患者端按顺序展示 */
interface ProcessStep {
  id: string
  title: string
  description?: string
}

const initialProcessSteps: ProcessStep[] = [
  { id: 'step-1', title: '上门评估', description: '核对身份，评估居室与洗浴环境安全' },
  { id: 'step-2', title: '助浴服务', description: '调节水温与室温，全程陪护助浴' },
  { id: 'step-3', title: '浴后护理', description: '皮肤护理与居室整理，记录服务结果' },
]

/** 富文本字符串解析：JSON 解析失败时按 HTML 兼容返回 */
const parseRichContent = (raw: string): string | JSONContent => {
  if (!raw) return ''
  try {
    return JSON.parse(raw) as JSONContent
  } catch {
    return raw
  }
}

export default function ServiceEditorPage() {
  const navigate = useNavigate()
  const params = useParams()
  const { message, modal } = App.useApp()
  const serviceId = params.id ?? 'new'
  const isCreate = serviceId === 'new'
  const detail = useMemo(() => detailMocks[serviceId], [serviceId])

  const [form] = Form.useForm<ServiceFormValues>()
  /** 列表封面：存储到 ServiceItem.cover_url */
  const [coverUrl, setCoverUrl] = useState<string>()
  /** 患者端详情（富文本 JSON 字符串）：存储到 ServiceItem.description */
  const [description, setDescription] = useState('')
  /** 富文本 Drawer：richDraft 为弹窗内草稿（JSON 字符串），确定后写入 description */
  const [richEditorOpen, setRichEditorOpen] = useState(false)
  const [richDraft, setRichDraft] = useState('')
  /** 服务过程步骤：序列化存入 ServiceItem.service_process */
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>(initialProcessSteps)
  const [packages, setPackages] = useState<PackageItem[]>(initialPackages)
  const [packageModalOpen, setPackageModalOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<PackageItem | null>(null)
  const [packageForm] = Form.useForm<Package>()

  /** 封面上传：走共通上传接口存入 cover_url；接口不可用时降级本地预览 */
  const handleCoverUpload = async (file: File) => {
    const localUrl = URL.createObjectURL(file)
    setCoverUrl(localUrl)
    try {
      const result = await uploadApi.uploadFile(file)
      setCoverUrl(result.url)
      message.success('封面已上传')
    } catch {
      // TODO: 后端就绪后移除此降级分支
      message.success('封面已更新（本地预览）')
    }
    return false
  }

  /** 详情图文填写状态（入口提示用）：是否已填写 + 内容块数量 */
  const descriptionInfo = useMemo(() => {
    if (!description) return { filled: false, blocks: 0 }
    try {
      const doc = JSON.parse(description) as JSONContent
      return { filled: true, blocks: doc.content?.length ?? 0 }
    } catch {
      return { filled: true, blocks: 0 }
    }
  }, [description])

  /** 打开富文本 Drawer：以当前 description 作为草稿初始值 */
  const openRichEditor = () => {
    setRichDraft(description)
    setRichEditorOpen(true)
  }

  /** 确认富文本：草稿写回 description（JSON 字符串），保存服务时随表单提交 */
  const confirmRichEditor = () => {
    setDescription(richDraft)
    setRichEditorOpen(false)
    message.success('详情图文已更新')
  }

  /** 服务过程步骤：编辑 / 新增 / 删除 / 上下移动 */
  const updateStep = (id: string, patch: Partial<Omit<ProcessStep, 'id'>>) =>
    setProcessSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  const addStep = () => setProcessSteps((prev) => [...prev, { id: `step-${Date.now()}`, title: '' }])
  const removeStep = (id: string) => setProcessSteps((prev) => prev.filter((s) => s.id !== id))
  const moveStep = (id: string, dir: -1 | 1) =>
    setProcessSteps((prev) => {
      const index = prev.findIndex((s) => s.id === id)
      const target = index + dir
      if (index < 0 || target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  // 患者端预览实时联动字段
  const previewName = Form.useWatch('name', form)
  const previewPrice = Form.useWatch('price', form)
  const previewUnit = Form.useWatch('unit', form)
  const previewType = Form.useWatch('service_type', form)
  /** 耗材与套餐联动：是否涉及耗材 / 是否启用套餐 */
  const consumableValue = Form.useWatch('consumable', form) ?? '1'
  const packageEnabled = Form.useWatch('packageEnabled', form) ?? true

  /** 编辑场景：回填表单、封面、富文本详情与套餐 */
  useEffect(() => {
    if (!detail) return
    form.setFieldsValue({
      name: detail.name,
      category_id: detail.category_id,
      service_type: detail.service_type,
      price: detail.price.toFixed(2),
      duration: detail.duration,
      consumable: detail.is_consumable_supported ? '1' : '2',
      publishStatus: detail.status === 1 ? 'on' : 'draft',
    })
    setCoverUrl(detail.cover_url || undefined)
    setDescription(detail.description ?? '')
    setPackages((prev) => [
      ...prev.filter((item) => item.fixed),
      ...(detail.packages ?? [])
        .filter((item) => item.count !== 1)
        .map((item, index) => ({ id: `pkg-${item.count}-${index}`, ...item })),
    ])
    // 服务过程：JSON 字符串解析为步骤；为空或非法时保留默认步骤
    try {
      const steps = JSON.parse(detail.service_process) as Array<Omit<ProcessStep, 'id'>>
      if (Array.isArray(steps) && steps.length > 0) {
        setProcessSteps(
          steps.map((s, index) => ({
            id: `step-load-${index}`,
            title: s.title ?? '',
            description: s.description,
          })),
        )
      }
    } catch {
      /* 保留默认步骤 */
    }
  }, [detail, form])

  const pageTitle = isCreate ? '新建服务项目' : '编辑服务项目'

  /** 保存：按 ServiceItem DTO 组装入参（TODO: 接 createService / updateService） */
  const handleSave = async (targetStatus: 'draft' | 'on') => {
    form.setFieldValue('publishStatus', targetStatus)
    let values: ServiceFormValues
    try {
      values = await form.validateFields()
    } catch {
      message.warning('请先完善必填项：服务名称、服务分类、参考起售价、计价单位、列表摘要')
      return
    }
    const payload: ServiceSaveBody = {
      category_id: values.category_id,
      name: values.name,
      description, // 富文本 JSON 字符串（详情图片 + 服务内容）
      duration: values.duration,
      is_consumable_supported: values.consumable === '1',
      price: Number(values.price),
      unit: values.unit,
      service_process: JSON.stringify(
        processSteps
          .filter((s) => s.title.trim())
          .map(({ title, description: stepDesc }) => ({ title, description: stepDesc })),
      ),
      status: targetStatus === 'on' ? 1 : 9,
      service_type: values.service_type,
      packages: (packageEnabled ? packages : packages.filter((item) => item.fixed)).map(
        ({ count, price, price_with_consum }) => ({ count, price, price_with_consum }),
      ),
      cover_url: coverUrl ?? '',
      vital_sign: [],
    }
    console.log('[服务保存] payload:', payload)
    message.success(targetStatus === 'on' ? '服务已保存并启用' : '草稿已保存')
    navigate('/service')
  }

  /** 添加 / 编辑套餐：打开弹窗（回填在下方 useEffect 中处理，确保 Modal 内 Form 已挂载） */
  const openPackageModal = (pkg?: PackageItem) => {
    setEditingPackage(pkg ?? null)
    setPackageModalOpen(true)
  }

  useEffect(() => {
    if (!packageModalOpen) return
    if (editingPackage) {
      packageForm.setFieldsValue(editingPackage)
    } else {
      packageForm.resetFields()
    }
  }, [packageModalOpen, editingPackage, packageForm])

  const handlePackageSave = async () => {
    try {
      const values = await packageForm.validateFields()
      if (editingPackage) {
        setPackages((prev) =>
          prev.map((item) => (item.id === editingPackage.id ? { ...item, ...values } : item)),
        )
        message.success('套餐已更新')
      } else {
        setPackages((prev) => [...prev, { id: `pkg-${Date.now()}`, ...values }])
        message.success('套餐已添加')
      }
      setPackageModalOpen(false)
    } catch {
      /* 校验未通过，antd 已自动提示 */
    }
  }

  const handlePackageDelete = (pkg: PackageItem) => {
    modal.confirm({
      title: '删除套餐',
      content: `确认删除“${packageName(pkg.count)}”？删除后机构端将不可再售该套餐。`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        setPackages((prev) => prev.filter((item) => item.id !== pkg.id))
        message.success('已删除套餐')
      },
    })
  }

  /** 套餐表格列：对齐 DTO Package（count 服务次数 / price_with_consum 含耗材价 / price 不含耗材价） */
  const packageColumns: ColumnsType<PackageItem> = [
    {
      title: '套餐名称',
      key: 'name',
      render: (_, record) => packageName(record.count),
    },
    {
      title: '服务次数',
      dataIndex: 'count',
      key: 'count',
      render: (count: number) => `${count}次`,
    },
    {
      title: '含耗材价',
      dataIndex: 'price_with_consum',
      key: 'price_with_consum',
      render: (value: number) => formatPackagePrice(value),
    },
    {
      title: '不含耗材价',
      dataIndex: 'price',
      key: 'price',
      render: (value: number) => formatPackagePrice(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <span>
          <Button type="link" size="small" onClick={() => openPackageModal(record)}>
            编辑
          </Button>
          {!record.fixed && (
            <Button type="link" size="small" onClick={() => handlePackageDelete(record)}>
              删除
            </Button>
          )}
        </span>
      ),
    },
  ]

  return (
    <PageContainer
      title={pageTitle}
      description="集团统一定义一次，机构选择后继承基础信息与价格；编辑时复用本页面"
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/service')}>
          返回服务池
        </Button>
      }
    >
      <Form<ServiceFormValues>
        form={form}
        layout="vertical"
        initialValues={initialFormValues}
      >
        <div className="service-editor">
          <div className="service-editor__form">
            <Card variant="borderless" className="editor-card">
              <div className="editor-card__header">
                <h3>服务基础信息</h3>
                {/* <span>这些字段由集团统一维护，机构不可单独修改</span> */}
              </div>
              <div className="editor-grid">
                <div className="editor-grid__2">
                  <Form.Item
                    name="name"
                    label={<span>服务名称</span>}
                    rules={[{ required: true, message: '请输入服务名称' }]}
                  >
                    <Input placeholder="例如：上门助浴服务" />
                  </Form.Item>
                  <Form.Item
                    label={<span>服务编码 <span style={{color: '#66736f'}}>(保存后生成唯一编码)</span></span>}
                  >
                    <Input value={detail?.code ?? '系统自动生成'} disabled />
                  </Form.Item>
                </div>
                <div className="editor-grid__3">
                  <Form.Item
                    name="category_id"
                    label={<span>服务分类</span>}
                    rules={[{ required: true, message: '请选择服务分类' }]}
                  >
                    <Select placeholder="请选择服务分类" options={categories
                      .filter((item) => item.id > 0)
                      .map((item) => ({ label: item.name, value: item.id }))} />
                  </Form.Item>
                  <Form.Item
                    name="service_type"
                    label={<span>服务方式</span>}
                    rules={[{ required: true, message: '请选择服务方式' }]}
                  >
                    <Select options={Object.keys(typeText).map((key) => ({
                      label: typeText[Number(key)],
                      value: Number(key),
                    }))} />
                  </Form.Item>
                  <Form.Item
                    name="price"
                    label={<span>参考起售价</span>}
                    rules={[
                      { required: true, message: '请输入参考起售价' },
                      { pattern: /^\d+(\.\d{1,2})?$/, message: '请输入正确价格（最多两位小数）' },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                </div>
                <div className="editor-grid__3">
                  <Form.Item
                    name="unit"
                    label={<span>计价单位</span>}
                    rules={[{ required: true, message: '请选择计价单位' }]}
                  >
                    <Select options={unitOptions} />
                  </Form.Item>
                  <Form.Item name="duration" label="服务时长（分钟）">
                    <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="例如：60" />
                  </Form.Item>
                  <Form.Item
                    name="consumable"
                    label={<span>是否涉及耗材</span>}
                  >
                    <Select options={consumableOptions} />
                  </Form.Item>
                  {/* <Form.Item name="audience" label="适用人群">
                    <Input />
                  </Form.Item>
                  <Form.Item name="package" label="启用套餐">
                    <Input placeholder="单次、5次、10次" />
                  </Form.Item> */}
                </div>
                <div className="editor-grid__3">
                  
                  {/* <Form.Item name="consumableSpec" label="耗材规格（条件显示）">
                    <Input placeholder="含耗材/不含耗材" />
                  </Form.Item>
                  <Form.Item name="consumableList" label="标准耗材清单">
                    <Input placeholder="清洁用品、护理垫" />
                  </Form.Item> */}
                </div>
                {/* 下方「服务规格与套餐」卡片与上述耗材字段同名绑定，修改任一处自动同步 */}
                {/* <Form.Item
                  className="editor-grid__full"
                  name="summary"
                  label={<span>列表摘要</span>}
                  rules={[{ required: true, message: '请输入列表摘要' }]}
                >
                  <Input placeholder="专业护理人员上门提供安全、舒适的助浴服务" />
                </Form.Item> */}
              </div>
              <div className="editor-tip">提示：服务半径、日容量、接单时间与预约上下架，由机构添加服务后配置。</div>
            </Card>

            <Card variant="borderless" className="editor-card">
              <div className="editor-card__header">
                <h3>服务过程</h3>
                <Button color="primary" variant="outlined" icon={<PlusOutlined />} onClick={addStep}>
                  添加步骤
                </Button>
              </div>
              <div className="process-steps">
                {processSteps.map((step, index) => (
                  <div className="process-step" key={step.id}>
                    <span className="process-step__badge">{index + 1}</span>
                    <div className="process-step__fields">
                      <Input
                        value={step.title}
                        placeholder="步骤名称，如：上门评估"
                        onChange={(e) => updateStep(step.id, { title: e.target.value })}
                      />
                      <Input
                        value={step.description}
                        placeholder="步骤说明（可选），如：核对身份，评估环境安全"
                        onChange={(e) => updateStep(step.id, { description: e.target.value })}
                      />
                    </div>
                    <div className="process-step__actions">
                      <Button
                        type="text"
                        size="small"
                        icon={<ArrowUpOutlined />}
                        disabled={index === 0}
                        onClick={() => moveStep(step.id, -1)}
                      />
                      <Button
                        type="text"
                        size="small"
                        icon={<ArrowDownOutlined />}
                        disabled={index === processSteps.length - 1}
                        onClick={() => moveStep(step.id, 1)}
                      />
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeStep(step.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {/* <div className="editor-tip">
                步骤按顺序序列化为 JSON 存入 service_process；步骤名称为空的行保存时会被忽略。
              </div> */}
            </Card>

            <Card variant="borderless" className="editor-card">
              <div className="editor-card__header">
                <h3>服务套餐</h3>
                <Button
                  color="primary" variant="outlined"
                  icon={<PlusOutlined />}
                  disabled={!packageEnabled}
                  onClick={() => openPackageModal()}
                >
                  添加套餐
                </Button>
                {/* <span>先配置耗材规格，再决定是否销售多次套餐</span> */}
              </div>
              <div className="editor-spec">
                {/* <div className="editor-spec__strip">
                  <span className="editor-spec__label">是否涉及耗材</span>
                  <Form.Item
                    name="consumable"
                    noStyle
                    rules={[{ required: true, message: '请选择是否涉及耗材' }]}
                  >
                    <Radio.Group
                      options={[
                        { label: '是', value: '1' },
                        { label: '否', value: '2' },
                      ]}
                    />
                  </Form.Item>
                  {consumableValue === '1' && (
                    <>
                      <div className="editor-spec__field">
                        <span>耗材规格：</span>
                        <Form.Item name="consumableSpec" noStyle>
                          <Select
                            variant="borderless"
                            style={{ width: 108 }}
                            options={[
                              { label: '含耗材', value: '含耗材' },
                              { label: '不含耗材', value: '不含耗材' },
                            ]}
                          />
                        </Form.Item>
                      </div>
                      <div className="editor-spec__field">
                        <span>标准耗材：</span>
                        <Form.Item name="consumableList" noStyle>
                          <Input
                            variant="borderless"
                            style={{ width: 180 }}
                            placeholder="清洁用品、护理垫"
                          />
                        </Form.Item>
                      </div>
                    </>
                  )}
                </div> */}

                <div className="editor-spec__package-head">
                  {/* <span className="editor-spec__label">启用套餐</span>
                  <Form.Item name="packageEnabled" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                  <span className="editor-spec__package-status">
                    {packageEnabled ? '已启用' : '已关闭'}
                  </span> */}
                  {/* <span className="editor-spec__package-hint">关闭后仅保留“单次服务”</span> */}
                  
                </div>

                <Table<PackageItem>
                  className="package-table"
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={packageEnabled ? packages : packages.filter((item) => item.fixed)}
                  columns={packageColumns}
                />

                <div className="editor-tip editor-spec__tip">
                  套餐支付成功后，按“服务次数”自动生成对应数量的待预约子工单；每预约一次激活一张。
                </div>
              </div>
            </Card>

            <Card variant="borderless" className="editor-card">
              <div className="editor-card__header">
                <h3>患者端展示内容</h3>
              </div>
              <div className="editor-content">
                <div className="editor-upload editor-upload--cover">
                  <span>列表封面</span>
                  <Upload accept="image/*" showUploadList={false} beforeUpload={handleCoverUpload}>
                    <button
                      type="button"
                      className={`editor-upload__cover-box${coverUrl ? ' has-image' : ''}`}
                    >
                      {coverUrl ? (
                        <img src={coverUrl} alt="列表封面" />
                      ) : (
                        <>
                          <PlusOutlined />
                          <p>上传封面</p>
                          <em>建议 1:1</em>
                        </>
                      )}
                    </button>
                  </Upload>
                </div>
                <div className="editor-upload editor-upload--richtext">
                  <span>详情图文 {descriptionInfo.filled ? '（已填写）' : '（未填写）'}</span>
                  <div className="richtext-entry">
                    <Button icon={<EditOutlined />} color="primary" variant="outlined" onClick={openRichEditor}>
                      编辑详情图文
                    </Button>
                    <p className="richtext-entry__status">
                      {descriptionInfo.filled
                        ? `详情图文已填写（${descriptionInfo.blocks} 个内容块），可再次编辑精细排版。`
                        : '尚未填写。点击「编辑详情图文」用富文本编排详情图片与服务内容，完成后随服务保存。'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* <Card variant="borderless" className="editor-card">
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
            </Card> */}
            <div className="service-editor__footer">
              <span>启用后机构可从服务池选择添加；历史订单保留创建时快照。</span>
              <div>
                {/* <Button onClick={() => handleSave('draft')}>保存草稿</Button> */}
                <Button type="primary" icon={<CheckOutlined />} onClick={() => handleSave('on')}>
                  保存并启用
                </Button>
              </div>
            </div>
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
                  <span>{previewType ? typeText[previewType] : ''}</span>
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

        {/* <div className="service-editor__footer">
          <span>必填项完成后可保存；编辑服务时，同一页面会带入已有内容。</span>
          <div>
            <Button onClick={() => handleSave('draft')}>保存草稿</Button>
            <Button type="primary" icon={<CheckOutlined />} onClick={() => handleSave('on')}>
              保存并启用
            </Button>
          </div>
        </div> */}
      </Form>

      <Modal
        title={editingPackage ? '编辑套餐' : '添加套餐'}
        open={packageModalOpen}
        onOk={handlePackageSave}
        onCancel={() => setPackageModalOpen(false)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={packageForm} layout="vertical" requiredMark={false}>
          <Form.Item
            name="count"
            label="服务次数"
            rules={[{ required: true, message: '请输入服务次数' }]}
          >
            <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="套餐包含的服务次数" />
          </Form.Item>
          <Form.Item
            name="price_with_consum"
            label="含耗材价（元）"
            rules={[{ required: true, message: '请输入含耗材价' }]}
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="price"
            label="不含耗材价（元）"
            rules={[{ required: true, message: '请输入不含耗材价' }]}
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="编辑详情图文"
        width={860}
        open={richEditorOpen}
        onClose={() => setRichEditorOpen(false)}
        destroyOnClose
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setRichEditorOpen(false)}>取消</Button>
            <Button type="primary" onClick={confirmRichEditor}>
              保存
            </Button>
          </div>
        }
      >
        {/* <div className="richtext-drawer-hint">
          用富文本编排「详情图片与服务内容」：支持标题 / 正文 / 列表 / 图片 / 文字颜色等。
          点击「保存」先暂存到当前服务草稿，随「保存草稿 / 保存并启用」一并写入服务详情（ProseMirror JSON）。
        </div> */}
        <RichTextEditor
          value={parseRichContent(richDraft)}
          minHeight={460}
          onChange={(_, json) => setRichDraft(JSON.stringify(json))}
        />
      </Drawer>
    </PageContainer>
  )
}
