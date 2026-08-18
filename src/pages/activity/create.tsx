/**
 * 活动管理 - 新建 / 编辑活动
 * 视觉对齐设计稿：左侧表单（基础信息 + 报名设置 + 患者端详情图 + 报名须知）
 * 右侧患者端实时预览；参与机构配置 Drawer；手机预览弹窗
 * 当前为 mock 数据，后端就绪后替换为 activityApi.saveActivity
 */
import { useState } from 'react'
import {
  App,
  Button,
  Card,
  Checkbox,
  Drawer,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Table,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  DragOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import type { ActivityInstitutionConfig } from '@/api/modules/activity'
import './create.less'

const initialInstitutions: ActivityInstitutionConfig[] = [
  { id: '1', name: '幸福里健康驿站', area: '拱墅区·申花街道', activityTime: '09-20 09:00', capacity: 40 },
  { id: '2', name: '康乐护理院', area: '西湖区·古荡街道', activityTime: '09-20 09:00', capacity: 50 },
  { id: '3', name: '长青健康驿站', area: '滨江区·长河街道', activityTime: '09-20 14:00', capacity: 30 },
]

const detailImages = [
  { id: '1', title: '活动亮点', size: '750×980px' },
  { id: '2', title: '活动流程', size: '750×1200px' },
  { id: '3', title: '环境与须知', size: '750×960px' },
]

export default function ActivityCreate() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const params = useParams<{ id: string }>()
  const isEdit = !!params.id && params.id !== 'new'

  const [name, setName] = useState(isEdit ? '秋日康养游园会' : '')
  const [summary, setSummary] = useState(
    isEdit ? '健康相伴 · 乐享秋日好时光，五大康养活动亮点等你来体验' : '',
  )
  const [notice, setNotice] = useState(
    isEdit ? '活动免费，报名成功后如需取消请提前 24 小时操作；名额有限，先到先得。' : '',
  )
  const [institutions, setInstitutions] = useState<ActivityInstitutionConfig[]>(initialInstitutions)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewStatus, setPreviewStatus] = useState('normal')
  const [drawerKeyword, setDrawerKeyword] = useState('')

  const totalCapacity = institutions.reduce((sum, item) => sum + (item.capacity || 0), 0)

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

  const phonePreview = (
    <div className="phone-preview">
      <div className="phone-preview__screen">
        <div className="phone-preview__header">活动详情</div>
        <div className="phone-preview__hero">
          <strong>{name || '秋日康养游园会'}</strong>
          <span>健康相伴 · 乐享秋日好时光</span>
        </div>
        <div className="phone-preview__tags">
          <em>社区活动</em>
          <em>{institutions.length} 家机构可选</em>
        </div>
        <p className="phone-preview__desc">
          {summary || '活动当天提供健康检测、康养体验与互动游园，机构工作人员全程陪同。'}
        </p>
        <div className="phone-preview__block">五大康养活动亮点</div>
        <div className="phone-preview__block">活动流程与注意事项</div>
        <div className="phone-preview__footer">
          <div>
            <span>活动费用</span>
            <strong>免费</strong>
          </div>
          <button type="button">立即报名</button>
        </div>
      </div>
    </div>
  )

  return (
    <PageContainer
      title={isEdit ? '编辑活动' : '新建活动'}
      description="单页面配置活动信息、参与机构和患者端详情图片"
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/activity')}>
          返回活动列表
        </Button>
      }
    >
      <div className="activity-create">
        <div className="activity-create__form">
          <Card variant="borderless" className="create-card">
            <h3>活动基础信息</h3>
            <div className="create-field">
              <label>
                活动名称 <i>*</i>
              </label>
              <Input
                placeholder="请输入活动名称"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="create-field">
              <label>
                活动类型 <i>*</i>
              </label>
              <Select
                defaultValue="社区活动"
                options={[
                  { label: '社区活动', value: '社区活动' },
                  { label: '康养旅游', value: '康养旅游' },
                  { label: '健康课堂', value: '健康课堂' },
                  { label: '健康活动', value: '健康活动' },
                ]}
              />
            </div>
            <div className="create-field">
              <label>活动摘要</label>
              <Input.TextArea
                rows={3}
                placeholder="一句话介绍活动亮点，将展示在患者端列表"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
              />
            </div>
            <div className="create-field">
              <label>活动封面</label>
              <button type="button" className="create-upload" onClick={() => message.info('封面上传开发中')}>
                <PlusOutlined />
                <span>上传 750 × 560px</span>
              </button>
            </div>
          </Card>

          <Card variant="borderless" className="create-card">
            <h3>报名与参与设置</h3>
            <div className="create-field">
              <label>
                报名时间 <i>*</i>
              </label>
              <Input defaultValue="2026-08-15 至 09-18" />
            </div>
            <div className="create-field">
              <label>适用人群</label>
              <Input defaultValue="60 岁以上长者" />
            </div>
            <div className="create-field">
              <label>
                收费方式 <i>*</i>
              </label>
              <Select
                defaultValue="free"
                options={[
                  { label: '免费', value: 'free' },
                  { label: '付费', value: 'paid' },
                ]}
              />
            </div>
            <div className="create-config">
              <div className="create-config__bar">
                已配置 {institutions.length} 家参与机构 · 总承接 {totalCapacity} 人
              </div>
              <Button onClick={() => setDrawerOpen(true)}>配置参与机构</Button>
            </div>
          </Card>

          <Card variant="borderless" className="create-card">
            <h3>患者端活动详情</h3>
            <button type="button" className="create-upload create-upload--large" onClick={() => message.info('详情图上传开发中')}>
              <PlusOutlined />
              <span>上传详情图片</span>
              <em>统一宽度 750px，建议上传 3-8 张</em>
            </button>
            <div className="create-images">
              {detailImages.map((image) => (
                <div className="create-image" key={image.id}>
                  <div className="create-image__thumb">
                    <span>{image.title}</span>
                    <em>{image.size}</em>
                  </div>
                  <div className="create-image__actions">
                    <Button type="text" size="small" icon={<DragOutlined />}>
                      拖动
                    </Button>
                    <Button type="text" size="small" icon={<ReloadOutlined />}>
                      替换
                    </Button>
                    <Button type="text" size="small" danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="borderless" className="create-card create-card--footer">
            <div className="create-field">
              <label>报名须知与退款规则</label>
              <Input.TextArea
                rows={3}
                placeholder="将展示在患者端报名确认页"
                value={notice}
                onChange={(event) => setNotice(event.target.value)}
              />
            </div>
            <div className="create-footer">
              <Button onClick={() => message.success('草稿已保存')}>保存草稿</Button>
              <Button onClick={() => setPreviewOpen(true)}>手机预览</Button>
              <Button
                type="primary"
                onClick={() => {
                  message.success(isEdit ? '活动已更新并发布' : '活动已发布')
                  navigate('/activity')
                }}
              >
                发布活动
              </Button>
            </div>
          </Card>
        </div>

        <div className="activity-create__preview">
          <Card variant="borderless" className="create-preview">
            <h3>患者端实时预览</h3>
            {phonePreview}
          </Card>
        </div>
      </div>

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
        width={860}
        title="手机预览"
        onCancel={() => setPreviewOpen(false)}
        footer={
          <Button type="primary" onClick={() => setPreviewOpen(false)}>
            关闭预览
          </Button>
        }
      >
        <div className="preview-modal">
          <div className="preview-modal__phone">{phonePreview}</div>
          <div className="preview-modal__panel">
            <h4>预览状态</h4>
            <Radio.Group
              value={previewStatus}
              onChange={(event) => setPreviewStatus(event.target.value)}
              options={[
                { label: '正常报名', value: 'normal' },
                { label: '报名成功', value: 'success' },
                { label: '名额已满', value: 'full' },
              ]}
            />
            <h4>预览范围</h4>
            <Checkbox.Group
              defaultValue={['detail', 'signup', 'notice']}
              options={[
                { label: '活动详情页', value: 'detail' },
                { label: '报名确认页', value: 'signup' },
                { label: '报名须知', value: 'notice' },
              ]}
            />
            <div className="preview-modal__tip">
              预览仅用于检查患者端展示效果，不会产生真实报名数据。
            </div>
          </div>
        </div>
      </Modal>
    </PageContainer>
  )
}
