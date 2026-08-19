/**
 * 机构详情 - 服务项目 Tab
 * 机构默认服务配置 + 已添加服务 + 添加服务项目 Drawer + 删除确认
 * 服务列表数据由 detail.tsx 持有（切 Tab 不丢失），本组件管理 UI 状态
 * 当前为 mock 数据，后端就绪后替换为 institutionApi 对应接口
 */
import { useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import {
  App,
  Alert,
  Button,
  Card,
  Checkbox,
  Drawer,
  Input,
  Modal,
  Radio,
  Select,
  Table,
  Tag,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  CheckOutlined,
  InfoCircleFilled,
  SearchOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type {
  InstitutionDetail,
  InstitutionService,
  ServicePoolItem,
} from '@/api/modules/institution'

const servicePoolMocks: ServicePoolItem[] = [
  { id: 'p1', code: 'FW0001', name: '上门助浴服务', category: '生活照护', mode: '上门', price: 168 },
  { id: 'p2', code: 'FW0004', name: '慢病健康随访', category: '健康管理', mode: '上门', price: 69 },
  { id: 'p3', code: 'FW0002', name: '居家护理服务', category: '生活照护', mode: '上门', price: 198 },
  { id: 'p4', code: 'FW0003', name: '术后康复训练', category: '康复护理', mode: '到店', price: 128 },
  { id: 'p5', code: 'FW0008', name: '老年能力评估', category: '健康管理', mode: '到店', price: 199 },
]

const serviceCategories = ['全部', '生活照护', '康复护理', '健康管理', '陪诊出行']

interface ServicesTabProps {
  detail: InstitutionDetail
  services: InstitutionService[]
  onServicesChange: Dispatch<SetStateAction<InstitutionService[]>>
  drawerOpen: boolean
  onDrawerOpenChange: (open: boolean) => void
}

export default function ServicesTab({
  detail,
  services,
  onServicesChange,
  drawerOpen,
  onDrawerOpenChange,
}: ServicesTabProps) {
  const navigate = useNavigate()
  const { message } = App.useApp()

  const [deleting, setDeleting] = useState<InstitutionService | null>(null)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(['p1', 'p2'])
  const [poolKeyword, setPoolKeyword] = useState('')
  const [poolCategory, setPoolCategory] = useState('全部')
  const [rangeType, setRangeType] = useState<'street' | 'fence'>('street')

  const filteredPool = useMemo(() => {
    return servicePoolMocks.filter((item) => {
      const keywordHit =
        !poolKeyword.trim() ||
        item.name.includes(poolKeyword.trim()) ||
        item.code.toLowerCase().includes(poolKeyword.trim().toLowerCase())
      const categoryHit = poolCategory === '全部' || item.category === poolCategory
      return keywordHit && categoryHit
    })
  }, [poolCategory, poolKeyword])

  const togglePoolService = (id: string, checked: boolean) => {
    setSelectedServiceIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((item) => item !== id)))
  }

  const handleAddServices = () => {
    const exists = new Set(services.map((item) => item.code))
    const adding = servicePoolMocks
      .filter((item) => selectedServiceIds.includes(item.id) && !exists.has(item.code))
      .map<InstitutionService>((item) => ({
        id: `s-${item.id}`,
        code: item.code,
        name: item.name,
        category: item.category,
        mode: item.mode,
        price: item.price,
        configSource: '机构默认',
        range: '按机构默认配置',
        status: '可预约',
      }))
    onServicesChange((prev) => [...prev, ...adding])
    onDrawerOpenChange(false)
    message.success(`已添加 ${adding.length} 项服务`)
  }

  const handleDeleteService = () => {
    if (!deleting) return
    onServicesChange((prev) => prev.filter((item) => item.id !== deleting.id))
    message.success(`已删除 ${deleting.name}`)
    setDeleting(null)
  }

  const serviceColumns = useMemo<ColumnsType<InstitutionService>>(
    () => [
      {
        title: '服务项目',
        key: 'name',
        render: (_, record) => (
          <div className="service-cell">
            <strong>{record.name}</strong>
            <span>{record.code}</span>
          </div>
        ),
      },
      { title: '服务方式', dataIndex: 'mode', key: 'mode', width: 90 },
      {
        title: '集团定价',
        dataIndex: 'price',
        key: 'price',
        width: 110,
        render: (value: number) => `¥${value} / 次`,
      },
      { title: '配置来源', dataIndex: 'configSource', key: 'configSource', width: 110 },
      { title: '线上履约范围', dataIndex: 'range', key: 'range' },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: InstitutionService['status']) => (
          <span className={`service-status service-status--${status === '可预约' ? 'on' : 'off'}`}>{status}</span>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 150,
        render: (_, record) => (
          <div className="service-actions">
            <Button type="link" size="small" onClick={() => message.info('编辑配置开发中')}>
              编辑配置
            </Button>
            {record.status === '已下架' && (
              <Button type="link" size="small" danger onClick={() => setDeleting(record)}>
                删除
              </Button>
            )}
          </div>
        ),
      },
    ],
    [message],
  )

  const poolColumns = useMemo<ColumnsType<ServicePoolItem>>(
    () => [
      {
        title: '',
        key: 'checked',
        width: 44,
        render: (_, record) => (
          <Checkbox
            checked={selectedServiceIds.includes(record.id)}
            onChange={(event) => togglePoolService(record.id, event.target.checked)}
          />
        ),
      },
      {
        title: '服务项目',
        key: 'name',
        render: (_, record) => (
          <div className="service-cell">
            <strong>{record.name}</strong>
            <span>{record.category} · {record.code}</span>
          </div>
        ),
      },
      { title: '服务方式', dataIndex: 'mode', key: 'mode', width: 100 },
      {
        title: '集团定价',
        dataIndex: 'price',
        key: 'price',
        width: 120,
        render: (value: number) => `¥${value} / 次`,
      },
      {
        title: '选择状态',
        key: 'selected',
        width: 100,
        render: (_, record) => (selectedServiceIds.includes(record.id) ? '已选择' : '未选择'),
      },
    ],
    [selectedServiceIds],
  )

  return (
    <>
      <Card variant="borderless" className="detail-card">
        <div className="detail-card__header">
          <div>
            <h3>机构默认服务配置</h3>
            <p>新添加的服务自动继承；仅有差异的服务再单独调整</p>
          </div>
          <Button type="primary" onClick={() => message.success('默认配置已保存')}>
            保存默认配置
          </Button>
        </div>
        <Alert
          className="detail-card__alert"
          type="info"
          showIcon
          icon={<InfoCircleFilled />}
          message="服务范围仅作用于线上/上门服务；到店服务无需配置，医养服务工作台不维护此项。"
        />
        <div className="service-config">
          <div className="service-config__panel">
            <div className="service-config__title">
              线上服务覆盖范围
              <Radio.Group
                value={rangeType}
                onChange={(event) => setRangeType(event.target.value)}
                options={[
                  { label: '按街道', value: 'street' },
                  { label: '电子围栏', value: 'fence' },
                ]}
                optionType="button"
                buttonStyle="solid"
              />
            </div>
            <div className="service-config__grid">
              <label>
                <span>已选街道</span>
                <Input value="申花街道、祥符街道" readOnly />
              </label>
              <label>
                <span>电子围栏</span>
                <Input value="以机构地址为圆心 5 公里" readOnly={rangeType === 'street'} />
              </label>
            </div>
          </div>
          <div className="service-config__panel">
            <div className="service-config__title">预约默认规则</div>
            <div className="service-config__grid service-config__grid--four">
              <label>
                <span>日容量</span>
                <Input value="8 单 / 日" readOnly />
              </label>
              <label>
                <span>提前预约</span>
                <Input value="至少提前 2 小时" readOnly />
              </label>
              <label>
                <span>接单时段</span>
                <Input value="08:00—18:00" readOnly />
              </label>
              <label>
                <span>取消规则</span>
                <Input value="服务前 2 小时" readOnly />
              </label>
            </div>
          </div>
        </div>
      </Card>

      <Card variant="borderless" className="detail-card">
        <div className="detail-card__header">
          <div>
            <h3>机构已添加服务</h3>
            <p>
              共 {services.length} 项 · 上架 {services.filter((item) => item.status === '可预约').length} 项 · 已下架 {services.filter((item) => item.status === '已下架').length} 项 ·
              <Button type="link" size="small" className="inline-link" onClick={() => navigate('/service')}>
                上下架请前往服务项目管理
              </Button>
            </p>
          </div>
          <Button type="primary" onClick={() => onDrawerOpenChange(true)}>
            添加服务项目
          </Button>
        </div>
        <Table<InstitutionService>
          rowKey="id"
          size="small"
          columns={serviceColumns}
          dataSource={services}
          pagination={false}
        />
      </Card>

      <Drawer
        width={720}
        open={drawerOpen}
        onClose={() => onDrawerOpenChange(false)}
        title={
          <div className="service-drawer__title">
            <h3>添加服务项目</h3>
            <p>从集团服务池选择，可勾选一项或多项</p>
          </div>
        }
        footer={
          <div className="service-drawer__footer">
            <span>已选择 {selectedServiceIds.length} 项服务</span>
            <div>
              <Button onClick={() => onDrawerOpenChange(false)}>取消</Button>
              <Button type="primary" icon={<CheckOutlined />} onClick={handleAddServices}>
                确认添加 {selectedServiceIds.length} 项
              </Button>
            </div>
          </div>
        }
      >
        <Alert
          className="service-drawer__alert"
          type="info"
          showIcon
          message={
            <span>
              <strong>{detail.name}</strong> 所选服务将自动继承机构默认预约配置与线上履约范围
            </span>
          }
        />
        <div className="service-drawer__search">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索服务名称、项目编码（共 58 项）"
            value={poolKeyword}
            onChange={(event) => setPoolKeyword(event.target.value)}
          />
          <Select
            value={poolCategory}
            onChange={setPoolCategory}
            options={serviceCategories.map((item) => ({ label: item === '全部' ? '全部分类' : item, value: item }))}
          />
        </div>
        <div className="service-drawer__categories">
          {serviceCategories.map((item) => (
            <button
              type="button"
              key={item}
              className={poolCategory === item ? 'is-active' : ''}
              onClick={() => setPoolCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <Table<ServicePoolItem>
          rowKey="id"
          size="small"
          columns={poolColumns}
          dataSource={filteredPool}
          pagination={false}
        />
      </Drawer>

      <Modal
        open={!!deleting}
        title="删除服务项目"
        onCancel={() => setDeleting(null)}
        footer={
          <div className="delete-modal__footer">
            <Button onClick={() => setDeleting(null)}>取消</Button>
            <Button danger type="primary" onClick={handleDeleteService}>
              确认删除
            </Button>
          </div>
        }
      >
        {deleting && (
          <div className="delete-modal">
            <div className="delete-modal__warning">
              <strong>确认从该机构删除此服务项目？</strong>
              <p>删除仅解除机构关联，不删除集团服务定义；历史订单仍可查询。</p>
            </div>
            <div className="delete-modal__service">
              <span>{detail.name} · {deleting.name}</span>
              <span>{deleting.code}</span>
            </div>
            <div className="delete-modal__conditions">
              <p>删除条件 <Tag color="green">已满足</Tag></p>
              <div>
                <span><CheckOutlined /> 服务状态为已下架</span>
                <span><CheckOutlined /> 当前机构无待履约订单</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
