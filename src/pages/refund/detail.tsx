/**
 * 退款管理 - 退款审核详情
 * 视觉对齐设计稿：状态摘要条 + 整单退款申请 + 协作平台联动
 * 右侧整单退款审核 / 审核时效 / 联动规则，底部审核记录
 * 当前为 mock 数据，后端就绪后替换为 refundApi.getRefundDetail
 */
import { useState } from 'react'
import { App, Button, Card, Input, Modal, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { CheckOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import type { CancelStatus, RefundLog, RefundStatus } from '@/api/modules/refund'
import './detail.less'

const statusText: Record<RefundStatus, string> = {
  pending: '待整单审核',
  cancelling: '取消中',
  refunding: '退款中',
  refunded: '已退款',
  rejected: '已驳回',
  abnormal: '异常',
}

interface RefundBase {
  refundNo: string
  orderNo: string
  orderId: string
  userName: string
  institutionName: string
  amount: number
  status: RefundStatus
  cancelStatus: CancelStatus
}

const refundBaseMap: Record<string, RefundBase> = {
  '1': {
    refundNo: 'TK202608070001',
    orderNo: 'DD202608070001',
    orderId: '1',
    userName: '王阿姨',
    institutionName: '幸福里健康驿站',
    amount: 168,
    status: 'pending',
    cancelStatus: 'pending',
  },
  '2': {
    refundNo: 'TK202608070002',
    orderNo: 'DD202608070002',
    orderId: '2',
    userName: '李伯伯',
    institutionName: '康乐护理院',
    amount: 198,
    status: 'cancelling',
    cancelStatus: 'cancelling',
  },
  '3': {
    refundNo: 'TK202608070003',
    orderNo: 'DD202608070003',
    orderId: '3',
    userName: '张叔叔',
    institutionName: '幸福里健康驿站',
    amount: 69,
    status: 'refunding',
    cancelStatus: 'done',
  },
  '4': {
    refundNo: 'TK202608060018',
    orderNo: 'DD202608060018',
    orderId: '4',
    userName: '周阿姨',
    institutionName: '怡康护理院',
    amount: 128,
    status: 'refunded',
    cancelStatus: 'done',
  },
  '5': {
    refundNo: 'TK202608060011',
    orderNo: 'DD202608060011',
    orderId: '5',
    userName: '陈伯伯',
    institutionName: '长青健康驿站',
    amount: 199,
    status: 'rejected',
    cancelStatus: 'none',
  },
  '6': {
    refundNo: 'TK202608050096',
    orderNo: 'DD202608050096',
    orderId: '6',
    userName: '赵阿姨',
    institutionName: '和悦护理院',
    amount: 268,
    status: 'abnormal',
    cancelStatus: 'failed',
  },
}

const linkSteps = [
  { key: 'paid', title: '订单已支付', time: '08:46:12' },
  { key: 'created', title: '工单已创建', time: '08:46:15' },
  { key: 'submitted', title: '提交退款', time: '08:52:03' },
  { key: 'review', title: '待整单审核', time: '—' },
  { key: 'cancel', title: '取消工单并退款', time: '—' },
]

const refundLogs: RefundLog[] = [
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
    time: '2026-08-07 08:52:03',
    source: '用户端',
    action: '提交退款申请',
    description: '服务尚未开始，申请全额退款',
    operator: '王阿姨',
  },
]

const logColumns: ColumnsType<RefundLog> = [
  { title: '时间', dataIndex: 'time', key: 'time', width: 180 },
  { title: '操作来源', dataIndex: 'source', key: 'source', width: 120 },
  { title: '操作内容', dataIndex: 'action', key: 'action', width: 160 },
  { title: '状态说明', dataIndex: 'description', key: 'description' },
  { title: '操作人', dataIndex: 'operator', key: 'operator', width: 120 },
]

export default function RefundDetail() {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const params = useParams<{ id: string }>()
  const base = refundBaseMap[params.id ?? '1'] ?? refundBaseMap['1']
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const isPending = base.status === 'pending'
  const isAbnormal = base.status === 'abnormal'

  const handleApprove = () => {
    modal.confirm({
      title: '同意整单退款',
      content: `确认同意 ¥${base.amount}.00 整单退款吗？系统将先取消全部关联工单，全部取消成功后原路退款。`,
      okText: '确认同意',
      cancelText: '再想想',
      onOk: () => message.success('已同意整单退款，联动取消工单中（mock）'),
    })
  }

  const handleReject = () => {
    if (rejectReason.trim().length < 5) {
      message.warning('请填写驳回原因，至少 5 个字')
      return
    }
    message.success('已驳回退款申请（mock）')
    setRejectOpen(false)
    setRejectReason('')
  }

  return (
    <PageContainer
      title="退款审核详情"
      description={`${base.refundNo} · 关联订单 ${base.orderNo} · ${base.userName}`}
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/refund')}>
          返回退款列表
        </Button>
      }
    >
      <div className="refund-detail">
        <Card variant="borderless" className="refund-detail__summary">
          <div className="summary-item">
            <span>退款状态</span>
            <em className={`refund-status refund-status--${base.status}`}>
              {statusText[base.status]}
            </em>
          </div>
          <div className="summary-item">
            <span>履约工单状态</span>
            <em className="work-status work-status--pending">待机构接单</em>
          </div>
          <div className="summary-item">
            <span>服务机构</span>
            <strong>{base.institutionName}</strong>
          </div>
          <div className="summary-item">
            <span>申请时间</span>
            <strong>2026-08-07 08:52</strong>
          </div>
          <div className="summary-item">
            <span>整单退款</span>
            <strong>¥{base.amount}.00</strong>
          </div>
        </Card>

        <div className="refund-detail__main">
          <div className="refund-detail__left">
            <Card variant="borderless" className="detail-card">
              <div className="detail-card__header">
                <h3>整单退款申请</h3>
                <span>关联订单 {base.orderNo}</span>
              </div>
              <div className="detail-grid">
                <div className="detail-grid__item">
                  <span>申请人</span>
                  <strong>{base.userName} · 138****1026</strong>
                </div>
                <div className="detail-grid__item">
                  <span>退款原因</span>
                  <strong>临时身体不适，无法按预约时间接受服务</strong>
                </div>
                <div className="detail-grid__item">
                  <span>退款方式</span>
                  <strong>原支付渠道退回</strong>
                </div>
                <div className="detail-grid__item">
                  <span>申请说明</span>
                  <strong>服务尚未开始，希望全额退款</strong>
                </div>
                <div className="detail-grid__item">
                  <span>整单退款金额</span>
                  <strong>¥{base.amount}.00（一期不支持部分退款）</strong>
                </div>
              </div>
            </Card>

            <Card variant="borderless" className="detail-card">
              <div className="detail-card__header">
                <h3>协作平台联动</h3>
                <span>关联工单 1 个 · 同步正常</span>
              </div>
              <div className="link-steps">
                {linkSteps.map((step, index) => {
                  const done = index < 3
                  const current = index === 3 && isPending
                  return (
                    <div
                      key={step.key}
                      className={`link-step${done ? ' is-done' : ''}${current ? ' is-current' : ''}`}
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
                  <span>联动处理</span>
                  <strong>审核通过后取消全部关联工单</strong>
                </div>
                <div className="detail-grid__item">
                  <span>最近同步</span>
                  <strong>2026-08-07 08:52:06</strong>
                </div>
              </div>
            </Card>
          </div>

          <div className="refund-detail__right">
            <Card variant="borderless" className="detail-card">
              <h3>整单退款审核</h3>
              {isPending ? (
                <>
                  <div className="action-tip">
                    <strong>一期仅支持整单退款</strong>
                    <p>审核通过后先取消全部关联工单，全部取消成功后再退款。</p>
                  </div>
                  <Button type="primary" block onClick={handleApprove}>
                    同意整单退款
                  </Button>
                  <div className="action-row">
                    <Button block onClick={() => setRejectOpen(true)}>
                      驳回申请
                    </Button>
                    <Button block danger onClick={() => navigate(`/order/detail/${base.orderId}`)}>
                      查看原订单
                    </Button>
                  </div>
                </>
              ) : isAbnormal ? (
                <>
                  <div className="action-tip action-tip--danger">
                    <strong>工单取消失败</strong>
                    <p>协作平台未确认取消结果，需人工介入后再发起退款。</p>
                  </div>
                  <Button
                    type="primary"
                    block
                    onClick={() => message.success('已重新发送工单取消指令（mock）')}
                  >
                    重试取消工单
                  </Button>
                  <div className="action-row">
                    <Button block onClick={() => navigate(`/order/detail/${base.orderId}`)}>
                      查看原订单
                    </Button>
                    <Button block danger onClick={() => message.info('已转人工处理（mock）')}>
                      转人工处理
                    </Button>
                  </div>
                </>
              ) : (
                <div className="action-tip action-tip--plain">
                  <p>当前退款状态为「{statusText[base.status]}」，暂无审核操作，可在审核记录中查看处理进展。</p>
                </div>
              )}
            </Card>

            <Card variant="borderless" className="detail-card">
              <h3>审核时效</h3>
              <div className="countdown">01 : 42 : 36</div>
              <p className="countdown-note">建议在 2 小时内完成审核，超时将触发预警</p>
            </Card>

            <Card variant="borderless" className="detail-card">
              <h3>联动规则</h3>
              <p className="link-rule">
                向协作平台发送全部工单取消指令；任一工单不可取消时进入异常处理，不自动退款。
              </p>
            </Card>
          </div>
        </div>

        <Card variant="borderless" className="detail-card refund-detail__logs">
          <div className="detail-card__header">
            <h3>整单退款审核记录</h3>
            <span>记录整单退款审核、全部工单取消及原路退款结果</span>
          </div>
          <Table<RefundLog>
            rowKey="id"
            size="small"
            columns={logColumns}
            dataSource={refundLogs}
            pagination={false}
          />
        </Card>
      </div>

      <Modal
        open={rejectOpen}
        title="驳回退款申请"
        onCancel={() => setRejectOpen(false)}
        footer={
          <div className="reject-modal__footer">
            <Button onClick={() => setRejectOpen(false)}>取消</Button>
            <Button danger type="primary" onClick={handleReject}>
              确认驳回
            </Button>
          </div>
        }
      >
        <div className="reject-modal">
          <p className="reject-modal__desc">
            驳回后退款申请关闭，工单保持原履约状态；驳回原因将同步给用户。
          </p>
          <label>
            驳回原因 <i>*</i>
          </label>
          <Input.TextArea
            rows={4}
            placeholder="请填写驳回原因，至少 5 个字"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
          />
        </div>
      </Modal>
    </PageContainer>
  )
}
