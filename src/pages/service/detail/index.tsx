/**
 * 服务项目 - 新建 / 编辑服务项目
 * 集团统一定义一次，机构选择后继承基础信息与价格
 * 表单使用 antd Form 管理（便于字段校验），排布样式仍由 detail.less 的 editor-grid 提供
 * 数据来源：serviceApi.getService / createService / updateService / getServiceCategories
 * 说明：服务过程（service_process）后端以 JSON 字符串存储与返回，保存时序列化、回填时反序列化
 */
import { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, Empty, Form, Input, InputNumber, Modal, Select, Skeleton, Table, Upload } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined, ArrowDownOutlined, ArrowUpOutlined, CheckOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import RichDetailEditor from '@/components/RichDetailEditor'
import { serviceApi } from '@/api'
import { useImageUpload } from '@/hooks'
import type { Package, PriceUnit, ServiceCategory, ServiceItem, ServiceProcessStep, ServiceSaveBody } from '@/api/modules/service'
import { serviceTypeText } from '../list'
import './index.less'

const consumableOptions = [
  { label: '是', value: '1' },
  { label: '否', value: '2' },
]

/** 服务套餐项：对齐 DTO Package（count/price/price_with_consum），fixed 为内置「单次服务」，不可删除 */
interface PackageItem extends Package {
  id: string
  fixed?: boolean
}

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
  /** 是否上架多次套餐（关闭后仅保留「单次服务」） */
  packageEnabled: boolean
  summary: string
  /** draft → status 9；on → status 1 */
  publishStatus: 'draft' | 'on'
  openAfterSave: boolean
}

/** 服务过程步骤：序列化为 JSON 字符串存入 ServiceItem.service_process，患者端按顺序展示 */
interface ProcessStep {
  id: string
  title: string
  description?: string
}

/**
 * 反序列化 service_process（后端返回 JSON 字符串）为页面步骤列表；
 * 兼容历史数组 / 非法 JSON，步骤名称为空的项被忽略
 */
function parseProcessSteps(raw?: string): ProcessStep[] {
  if (!raw) return []
  try {
    const list: unknown = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    return list
      .filter(
        (s): s is ServiceProcessStep =>
          !!s && typeof (s as ServiceProcessStep).title === 'string',
      )
      .map((s, index) => ({
        id: `step-load-${index}`,
        title: s.title ?? '',
        description: s.description,
      }))
  } catch {
    return []
  }
}

/** 序列化服务过程步骤为 JSON 字符串（提交给后端），步骤名称为空的行被忽略 */
function stringifyProcessSteps(steps: ProcessStep[]): string {
  return JSON.stringify(
    steps
      .filter((s) => s.title.trim())
      .map(({ title, description }) => ({ title, description })),
  )
}

export default function ServiceEditorPage() {
  const navigate = useNavigate()
  const params = useParams()
  const { message, modal } = App.useApp()
  const { uploading, upload } = useImageUpload()
  const serviceId = params.id ?? 'new'
  const isCreate = serviceId === 'new'
  const [detail, setDetail] = useState<ServiceItem | null>(null)
  const [loading, setLoading] = useState(!isCreate)

  const [form] = Form.useForm<ServiceFormValues>()
  /** 封面预览地址（本地 objectURL 或服务器地址） */
  const [coverUrl, setCoverUrl] = useState<string>()
  /** 封面服务器地址（上传成功后写入 cover_url） */
  const [coverServerUrl, setCoverServerUrl] = useState('')
  /** 患者端详情（富文本 JSON 字符串）：存储到 ServiceItem.description */
  const [description, setDescription] = useState('')
  /** 服务过程步骤（页面态）：保存时序列化为 JSON 字符串提交 service_process */
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([])
  const [packages, setPackages] = useState<PackageItem[]>([])
  const [packageModalOpen, setPackageModalOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<PackageItem | null>(null)
  const [packageForm] = Form.useForm<Package>()
  const [submitting, setSubmitting] = useState(false)
  /** 服务分类（来自后端 service-categories） */
  const [catList, setCatList] = useState<ServiceCategory[]>([])

  /** 拉取服务分类（表单下拉） */
  useEffect(() => {
    void (async () => {
      try {
        const res = await serviceApi.getServiceCategories({ page: 1, page_size: 100 })
        setCatList(res.list ?? [])
      } catch {
        setCatList([])
      }
    })()
  }, [])

  /** 拉取服务详情（编辑场景） */
  const fetchDetail = useCallback(async () => {
    if (isCreate || !serviceId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await serviceApi.getService(Number(serviceId))
      setDetail(data)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [isCreate, serviceId])

  useEffect(() => {
    void fetchDetail()
  }, [fetchDetail])

  /** 封面上传：本地预览 + 后台上传，成功后保存服务器地址 */
  const handleCoverUpload = async (file: File) => {
    await upload(file, {
      onLocalPreview: (localUrl) => setCoverUrl(localUrl),
      onUploaded: (url) => {
        setCoverServerUrl(url)
        setCoverUrl(url)
        message.success('封面已上传')
      },
      onError: () => setCoverServerUrl(detail?.cover_url ?? ''),
    })
    return false
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
  /** 耗材与套餐联动：是否上架套餐 */
  const packageEnabled = Form.useWatch('packageEnabled', form) ?? true

  /** 编辑场景：回填表单、封面、富文本详情、服务过程与套餐 */
  useEffect(() => {
    if (!detail) return
    form.setFieldsValue({
      ...detail,
      consumable: detail.support_consum === 1 ? '1' : '2',
      publishStatus: detail.status === 1 ? 'on' : 'draft'
    })
    setCoverUrl(detail.cover_url || undefined)
    setCoverServerUrl(detail.cover_url ?? '')
    setDescription(detail.description ?? '')
    setPackages((prev) => [
      ...prev.filter((item) => item.fixed),
      ...(detail.packages ?? [])
        .filter((item) => item.count !== 1)
        .map((item, index) => ({ id: `pkg-${item.count}-${index}`, ...item })),
    ])
    // 服务过程：后端返回 JSON 字符串，反序列化后回填
    setProcessSteps(parseProcessSteps(detail.service_process))
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
    // 服务过程（processSteps）序列化为 JSON 字符串提交，与后端 service_process 字段对齐
    const payload: ServiceSaveBody = {
      category_id: values.category_id,
      name: values.name,
      name_en: detail?.name_en ?? '',
      description, // 富文本 JSON 字符串
      duration: values.duration,
      // 后端字段名为 support_consum（1-涉及耗材 0-不涉及）
      support_consum: values.consumable === '1' ? 1 : 0,
      price: Number(values.price),
      unit: values.unit,
      status: targetStatus === 'on' ? 1 : 9,
      service_type: values.service_type,
      service_process: stringifyProcessSteps(processSteps),
      packages: (packageEnabled ? packages : packages.filter((item) => item.fixed)).map(
        ({ count, price, price_with_consum }) => ({ count, price, price_with_consum }),
      ),
      // 封面使用上传接口返回的服务器地址（无新上传时沿用原值）
      cover_url: coverServerUrl || (detail?.cover_url ?? ''),
    }
    setSubmitting(true)
    try {
      if (isCreate) {
        await serviceApi.createService(payload)
        message.success(targetStatus === 'on' ? '服务已创建并上架' : '草稿已创建')
      } else {
        await serviceApi.updateService(Number(serviceId), payload)
        message.success(targetStatus === 'on' ? '服务已保存并上架' : '草稿已保存')
      }
      navigate('/service/list')
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setSubmitting(false)
    }
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

  if (loading) {
    return (
      <PageContainer title={pageTitle}>
        <Card variant="borderless">
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      </PageContainer>
    )
  }

  if (!isCreate && !detail) {
    return (
      <PageContainer title={pageTitle}>
        <Card variant="borderless">
          <Empty description="未找到该服务项目，可能已被删除" />
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title={pageTitle}
      extra={
        <Button color="primary" variant="outlined" icon={<ArrowLeftOutlined />} onClick={() => navigate('/service/list')}>
          返回服务池
        </Button>
      }
    >
      <Form<ServiceFormValues>
        form={form}
        layout="vertical"
      >
        <div className="service-editor">
          <div className="service-editor__form">
            <Card variant="borderless" className="editor-card">
              <div className="editor-card__header">
                <h3>服务基础信息</h3>
                {/* <span>这些字段由集团统一维护，机构不可单独修改</span> */}
              </div>
              <div className="editor-grid">
                <div className="editor-grid__3">
                  <Form.Item
                    name="name"
                    label={<span>服务名称</span>}
                    rules={[{ required: true, message: '请输入服务名称' }]}
                  >
                    <Input placeholder="例如：上门助浴服务" />
                  </Form.Item>
                  <Form.Item
                    name="category_id"
                    label={<span>服务分类</span>}
                    rules={[{ required: true, message: '请选择服务分类' }]}
                  >
                    <Select
                      placeholder="请选择服务分类"
                      /* 已停用的分类同样展示，但不可选择并注明停用状态 */
                      options={catList.map((item) => ({
                        label: item.status === 1 ? item.name : `${item.name}（已停用）`,
                        value: item.id,
                        disabled: item.status !== 1,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    name="service_type"
                    label={<span>服务方式</span>}
                    rules={[{ required: true, message: '请选择服务方式' }]}
                  >
                    <Select placeholder="请选择服务方式" options={Object.keys(serviceTypeText).map((key) => ({
                      label: serviceTypeText[Number(key)]?.label,
                      value: Number(key),
                    }))} />
                  </Form.Item>
                </div>
                <div className="editor-grid__3">
                  <Form.Item
                    name="unit"
                    label={<span>计价单位</span>}
                    rules={[{ required: true, message: '请选择计价单位' }]}
                  >
                    <Input placeholder='如：次、小时、天' />
                  </Form.Item>
                  <Form.Item
                    name="price"
                    label={<span>参考起售价</span>}
                    rules={[
                      { required: true, message: '请输入参考起售价' },
                      { pattern: /^\d+(\.\d{1,2})?$/, message: '请输入正确价格（最多两位小数）' },
                    ]}
                  >
                    <Input placeholder='请输入参考起售价' />
                  </Form.Item>
                  <Form.Item
                    name="target_crowd"
                    label={<span>适用人群</span>}
                  >
                    <Input placeholder="如：老年人、术后康复人群" />
                  </Form.Item>
                </div>
                <div className="editor-grid__3">
                  <Form.Item name="duration" label="服务时长（分钟）">
                    <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="例如：60" />
                  </Form.Item>
                  <Form.Item
                    name="consumable"
                    label={<span>是否涉及耗材</span>}
                  >
                    <Select options={consumableOptions} placeholder="请选择是否涉及耗材" />
                  </Form.Item>
                  <Form.Item name="vital_sign" label="生命体征监测项">
                    <Select mode="multiple" placeholder="请选择一项或多项" />
                  </Form.Item>
                  {/* <Form.Item name="audience" label="适用人群">
                    <Input />
                  </Form.Item>
                  <Form.Item name="package" label="上架套餐">
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
              {/* <div className="editor-tip">提示：服务半径、日容量、接单时间与预约上下架，由机构添加服务后配置。</div> */}
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
                  {/* <span className="editor-spec__label">上架套餐</span>
                  <Form.Item name="packageEnabled" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                  <span className="editor-spec__package-status">
                    {packageEnabled ? '已上架' : '已关闭'}
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
                <h3>患者端展示详情</h3>
              </div>
              <div className="patient-detail">
                <div className="patient-detail__field patient-detail__cover">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="patient-detail__label">服务封面</span>
                    <p className="patient-detail__tip">建议尺寸 1:1，展示于服务列表与患者端服务详情顶部。</p>
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
                        alt="列表封面"
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
                <RichDetailEditor label="图文详情" value={description} onChange={setDescription} />
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
                      { label: '上架', value: 'on' },
                    ]}
                  />
                </Form.Item>
                <span>上架后机构可从服务池选择添加；历史订单保留创建时快照。</span>
              </div>
              <div className="editor-publish editor-publish--switch">
                <Form.Item name="openAfterSave" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
                <span>保存后立即向机构开放</span>
              </div>
            </Card> */}
            <div className="service-editor__footer">
              <span>上架后机构可从服务池选择添加；历史订单保留创建时快照。</span>
              <div>
                {/* <Button onClick={() => handleSave('draft')}>保存草稿</Button> */}
                <Button type="primary" icon={<CheckOutlined />} loading={submitting} onClick={() => handleSave('on')}>
                  保存并上架
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
                  <span>{previewType ? serviceTypeText[previewType]?.label : ''}</span>
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
            <Button type="primary" icon={<CheckOutlined />} loading={submitting} onClick={() => handleSave('on')}>
              保存并上架
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
    </PageContainer>
  )
}
