/**
 * 服务项目 - 新建 / 编辑服务项目
 * 集团统一定义一次，机构选择后继承基础信息与价格
 * 当前为 mock 数据，后端就绪后替换为 serviceApi.getServiceDetail / saveService
 */
import { useEffect, useMemo, useState } from 'react'
import { App, Button, Card, Input, Radio, Select, Switch } from 'antd'
import { ArrowLeftOutlined, CheckOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import type { ServiceDetail, ServiceMode, ServiceStatus, PriceUnit } from '@/api/modules/service'
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

export default function ServiceEditorPage() {
  const navigate = useNavigate()
  const params = useParams()
  const { message } = App.useApp()
  const serviceId = params.id ?? 'new'
  const isCreate = serviceId === 'new'
  const detail = useMemo(() => detailMocks[serviceId], [serviceId])

  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>()
  const [mode, setMode] = useState<ServiceMode>('上门')
  const [price, setPrice] = useState('168.00')
  const [unit, setUnit] = useState('次')
  const [duration, setDuration] = useState('60 分钟')
  const [audience, setAudience] = useState('老年人、术后康复人群')
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')
  const [publishStatus, setPublishStatus] = useState<ServiceStatus>('draft')
  const [openAfterSave, setOpenAfterSave] = useState(true)

  useEffect(() => {
    if (!detail) return
    setName(detail.name)
    setCategory(detail.categoryName)
    setMode(detail.mode)
    setPrice(detail.price.toFixed(2))
    setDuration(detail.duration)
    setAudience(detail.applyRange)
    setSummary(detail.description ?? '')
    setPublishStatus(detail.status)
  }, [detail])

  const pageTitle = isCreate ? '新建服务项目' : '编辑服务项目'

  const handleSave = (targetStatus: ServiceStatus) => {
    if (!name.trim() || !category || !summary.trim()) {
      message.warning('请完善必填项：服务名称、服务分类、列表摘要')
      return
    }
    setPublishStatus(targetStatus)
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
      <div className="service-editor">
        <div className="service-editor__form">
          <Card variant="borderless" className="editor-card">
            <div className="editor-card__header">
              <h3>集团服务基础信息</h3>
              <span>这些字段由集团统一维护，机构不可单独修改</span>
            </div>
            <div className="editor-grid">
              <div className="editor-grid__2">
                <label>
                  <span>服务名称 <i>*</i></span>
                  <Input placeholder="例如：上门助浴服务" value={name} onChange={(event) => setName(event.target.value)} />
                </label>
                <label>
                  <span>服务编码</span>
                  <Input value={detail?.code ?? '系统自动生成'} disabled />
                  <em>保存后生成唯一编码</em>
                </label>
              </div>
              <div className="editor-grid__4">
                <label>
                  <span>服务分类 <i>*</i></span>
                  <Select placeholder="请选择服务分类" value={category} onChange={setCategory} options={categoryOptions} />
                </label>
                <label>
                  <span>服务方式 <i>*</i></span>
                  <Select value={mode} onChange={setMode} options={modeOptions} />
                </label>
                <label>
                  <span>参考起售价 <i>*</i></span>
                  <Input value={price} onChange={(event) => setPrice(event.target.value)} />
                </label>
                <label>
                  <span>计价单位 <i>*</i></span>
                  <Select
                    value={unit}
                    onChange={setUnit}
                    options={unitOptions}
                  />
                </label>
              </div>
              <div className="editor-grid__3">
                <label>
                  <span>服务时长</span>
                  <Input value={duration} onChange={(event) => setDuration(event.target.value)} />
                </label>
                <label>
                  <span>适用人群</span>
                  <Input value={audience} onChange={(event) => setAudience(event.target.value)} />
                </label>
                <label>
                  <span>启用套餐</span>
                  <Input placeholder='单次、5次、10次' />
                </label>
              </div>
              <div className="editor-grid__3">
                <label>
                  <span>是否涉及耗材 <i>*</i></span>
                  <Select value={'1'} onChange={setCategory} options={[{
                    label: '是',
                    value: '1'
                  }, {
                    label: '否',
                    value: '2'
                  }]} />
                </label>
                <label>
                  <span>耗材规格（条件显示）</span>
                  <Input placeholder='含耗材/不含耗材' />
                </label>
                <label>
                  <span>标准耗材清单</span>
                  <Input placeholder='清洁用品、护理垫' />
                </label>
              </div>
              <label className="editor-grid__full">
                <span>列表摘要 <i>*</i></span>
                <Input
                  placeholder="专业护理人员上门提供安全、舒适的助浴服务"
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                />
              </label>
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
                <div className='editor-upload--cover--box'>
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
              <label className="editor-upload editor-content__textarea">
                <span>服务内容</span>
                <Input.TextArea
                  style={{height: 100}}
                  placeholder="填写服务包含项目、准备事项、服务流程和注意事项……"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                />
              </label>
            </div>
            <p className="editor-upload__tip">患者端详情按图片顺序展示，可通过右侧手机预览确认整体阅读效果。</p>
          </Card>

          <Card variant="borderless" className="editor-card">
            <div className="editor-card__header">
              <h3>发布设置</h3>
            </div>
            <div className="editor-publish">
              <Radio.Group
                value={publishStatus === 'on' ? 'on' : 'draft'}
                onChange={(event) => setPublishStatus(event.target.value)}
                options={[
                  { label: '草稿', value: 'draft' },
                  { label: '启用', value: 'on' },
                ]}
              />
              <span>启用后机构可从服务池选择添加；历史订单保留创建时快照。</span>
            </div>
            <div className="editor-publish editor-publish--switch">
              <Switch checked={openAfterSave} onChange={setOpenAfterSave} />
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
              <h4>{name || '上门助浴服务'}</h4>
              <p>安全 · 专业 · 有温度</p>
            </div>
            <div className="service-phone__body">
              <h4>{name || '上门助浴服务'}</h4>
              <div className="service-phone__price">
                <strong>¥{Number(price || 0).toFixed(0)}</strong>
                <span>/ {unit}</span>
              </div>
              <div className="service-phone__meta">
                <span>{mode}</span>
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
    </PageContainer>
  )
}
