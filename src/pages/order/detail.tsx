/**
 * 订单中心 - 订单详情
 * 视觉对齐设计稿：状态摘要条 + 交易订单信息 + 协作工单履约进度
 * 右侧当前操作 / 接单时效 / 服务备注，底部订单操作记录
 * 当前为 mock 数据，后端就绪后替换为 orderApi.getOrderDetail
 */
import { App, Button, Card, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { CheckOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import type { OrderLog, OrderStatus, WorkOrderStatus } from '@/api/modules/order'
import './detail.less'

const statusText: Record<OrderStatus, string> = {
  paid: '已支付',
  fulfilling: '履约中',
  finished: '已完成',
  refunding: '退款审核',
  cancelled: '已取消',
}

const workOrderText: Record<WorkOrderStatus, string> = {
  pending: '待机构接单',
  assigned: '已派工',
  serving: '服务中',
  done: '已完成',
  cancelled: '工单已取消',
  none: '未生成工单',
}

interface OrderBase {
  orderNo: string
  serviceName: string
  institutionName: string
  status: OrderStatus
  workOrderStatus: WorkOrderStatus
}

const orderBaseMap: Record<string, OrderBase> = {
  '1': {
    orderNo: 'DD202608070001',
    serviceName: '上门助浴服务',
    institutionName: '幸福里健康驿站',
    status: 'paid',
    workOrderStatus: 'pending',
  },
  '2': {
    orderNo: 'DD202608070002',
    serviceName: '居家护理服务',
    institutionName: '康乐护理院',
    status: 'fulfilling',
    workOrderStatus: 'assigned',
  },
  '3': {
    orderNo: 'DD202608070003',
    serviceName: '慢病健康随访',
    institutionName: '幸福里健康驿站',
    status: 'fulfilling',
    workOrderStatus: 'serving',
  },
  '4': {
    orderNo: 'DD202608060018',
    serviceName: '术后康复训练',
    institutionName: '怡康护理院',
    status: 'finished',
    workOrderStatus: 'done',
  },
  '5': {
    orderNo: 'DD202608060011',
    serviceName: '老年能力评估',
    institutionName: '长青健康驿站',
    status: 'refunding',
    workOrderStatus: 'cancelled',
  },
  '6': {
    orderNo: 'DD202608050096',
    serviceName: '全程陪诊服务',
    institutionName: '和悦护理院',
    status: 'cancelled',
    workOrderStatus: 'none',
  },
}

const workSteps = [
  { key: 'paid', title: '订单已支付', time: '08:46:12' },
  { key: 'created', title: '工单已创建', time: '08:46:15' },
  { key: 'pending', title: '待机构接单', time: '剩余 18 分钟' },
  { key: 'assigned', title: '待派工', time: '—' },
  { key: 'serving', title: '服务中', time: '—' },
]

const orderLogs: OrderLog[] = [
  {
    id: '1',
    time: '2026-08-07 08:46:05',
    source: '用户端',
    action: '提交订单',
    description: '预约上门助浴服务，等待支付',
    operator: '王阿姨',
  },
  {
    id: '2',
    time: '2026-08-07 08:46:12',
    source: '支付系统',
    action: '支付成功',
    description: '微信支付 ¥168.00，订单状态变更为已支付',
    operator: '系统',
  },
  {
    id: '3',
    time: '2026-08-07 08:46:15',
    source: '协作平台',
    action: '生成履约工单',
    description: '已推送幸福里健康驿站，等待机构接单',
    operator: '系统',
  },
]

const logColumns: ColumnsType<OrderLog> = [
  { title: '时间', dataIndex: 'time', key: 'time', width: 180 },
  { title: '操作来源', dataIndex: 'source', key: 'source', width: 120 },
  { title: '操作内容', dataIndex: 'action', key: 'action', width: 160 },
  { title: '状态说明', dataIndex: 'description', key: 'description' },
  { title: '操作人', dataIndex: 'operator', key: 'operator', width: 120 },
]

export default function OrderDetail() {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const params = useParams<{ id: string }>()
  const base = orderBaseMap[params.id ?? '1'] ?? orderBaseMap['1']
  const isPending = base.workOrderStatus === 'pending'

  const handleCancel = () => {
    modal.confirm({
      title: '取消订单',
      content: '确认取消该订单吗？取消后将按退款规则原路退回款项。',
      okText: '确认取消',
      cancelText: '再想想',
      okButtonProps: { danger: true },
      onOk: () => message.success('订单已取消（mock）'),
    })
  }

  return (
    <PageContainer
      title="订单详情"
      description={`${base.orderNo} · ${base.serviceName} · ${base.institutionName}`}
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/order')}>
          返回订单列表
        </Button>
      }
    >
      <div className="order-detail">
        <Card variant="borderless" className="order-detail__summary">
          <div className="summary-item">
            <span>订单状态</span>
            <em className={`order-status order-status--${base.status}`}>{statusText[base.status]}</em>
          </div>
          <div className="summary-item">
            <span>协作工单状态</span>
            <em className={`work-status work-status--${base.workOrderStatus}`}>
              {workOrderText[base.workOrderStatus]}
            </em>
          </div>
          <div className="summary-item">
            <span>服务机构</span>
            <strong>{base.institutionName}</strong>
          </div>
          <div className="summary-item">
            <span>预约服务时间</span>
            <strong>2026-08-08 09:00</strong>
          </div>
          <div className="summary-item">
            <span>实付金额</span>
            <strong>¥168.00</strong>
          </div>
        </Card>

        <div className="order-detail__main">
          <div className="order-detail__left">
            <Card variant="borderless" className="detail-card">
              <div className="detail-card__header">
                <h3>交易订单信息</h3>
                <span>支付时间 2026-08-07 08:46:12</span>
              </div>
              <div className="detail-grid">
                <div className="detail-grid__item">
                  <span>服务对象</span>
                  <strong>王阿姨 · 138****1026</strong>
                </div>
                <div className="detail-grid__item">
                  <span>服务项目</span>
                  <strong>{base.serviceName} · 90 分钟</strong>
                </div>
                <div className="detail-grid__item">
                  <span>支付方式</span>
                  <strong>微信支付</strong>
                </div>
                <div className="detail-grid__item">
                  <span>服务地址</span>
                  <strong>杭州市拱墅区申花街道莫干山路 987 号</strong>
                </div>
                <div className="detail-grid__item">
                  <span>订单金额</span>
                  <strong>原价 ¥168 · 实付 ¥168</strong>
                </div>
              </div>
            </Card>

            <Card variant="borderless" className="detail-card">
              <div className="detail-card__header">
                <h3>协作工单与履约进度</h3>
                <span>工单号 GD202608070001 · 同步成功</span>
              </div>
              <div className="work-steps">
                {workSteps.map((step, index) => {
                  const done = index < 2
                  const current = index === 2 && isPending
                  return (
                    <div
                      key={step.key}
                      className={`work-step${done ? ' is-done' : ''}${current ? ' is-current' : ''}`}
                    >
                      <i>{done ? <CheckOutlined /> : index + 1}</i>
                      <strong>{step.title}</strong>
                      <span>{step.time}</span>
                    </div>
                  )
                })}
              </div>
              <div className="detail-grid detail-grid--meta">
                <div className="detail-grid__item">
                  <span>承接机构</span>
                  <strong>{base.institutionName}</strong>
                </div>
                <div className="detail-grid__item">
                  <span>工单来源</span>
                  <strong>运营平台订单自动生成</strong>
                </div>
                <div className="detail-grid__item">
                  <span>最近同步</span>
                  <strong>2026-08-07 08:46:15</strong>
                </div>
              </div>
            </Card>
          </div>

          <div className="order-detail__right">
            <Card variant="borderless" className="detail-card">
              <h3>当前可操作</h3>
              {isPending ? (
                <>
                  <div className="action-tip">
                    <strong>机构尚未接单</strong>
                    <p>可先催办；超时后再更换承接机构。</p>
                  </div>
                  <Button
                    type="primary"
                    block
                    onClick={() => message.success(`已催促 ${base.institutionName} 接单`)}
                  >
                    催促机构接单
                  </Button>
                  <div className="action-row">
                    <Button block onClick={() => message.info('更换机构开发中')}>
                      更换机构
                    </Button>
                    <Button block danger onClick={handleCancel}>
                      取消订单
                    </Button>
                  </div>
                </>
              ) : (
                <div className="action-tip action-tip--plain">
                  <p>当前订单状态暂无可操作项，可在操作记录中查看履约进展。</p>
                </div>
              )}
            </Card>

            <Card variant="borderless" className="detail-card">
              <h3>接单时效</h3>
              <div className="countdown">00 : 18 : 24</div>
              <p className="countdown-note">超过 30 分钟未接单将触发运营预警</p>
            </Card>

            <Card variant="borderless" className="detail-card">
              <h3>服务备注</h3>
              <p className="service-remark">
                老人行动不便，需两名护理人员上门；到达前请提前 15 分钟电话联系。
              </p>
            </Card>
          </div>
        </div>

        <Card variant="borderless" className="detail-card order-detail__logs">
          <div className="detail-card__header">
            <h3>订单操作记录</h3>
            <span>记录订单与协作工单的关键变更</span>
          </div>
          <Table<OrderLog>
            rowKey="id"
            size="small"
            columns={logColumns}
            dataSource={orderLogs}
            pagination={false}
          />
        </Card>
      </div>
    </PageContainer>
  )
}
