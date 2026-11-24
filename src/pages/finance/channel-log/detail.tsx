/**
 * 财务对账 - 渠道流水详情
 * 数据来源：financeApi.getPaymentChannelLog(log_id)
 * 金额单位为元，时间字段为 UTC 秒级时间戳
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Descriptions, Space, Spin } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import { financeApi } from '@/api'
import type { PaymentChannelLog } from '@/api/modules/finance'
import { formatAmount, formatDateTime } from '@/utils'
import {
  CHANNEL_LOG_STATUS_TEXT,
  CHANNEL_LOG_STATUS_TONE,
  CHANNEL_TYPE_TEXT,
  ORDER_TYPE_TEXT,
} from './constants'
import './detail.less'

const fmtTime = (seconds?: number | null) =>
  seconds ? formatDateTime(seconds * 1000, 'YYYY-MM-DD HH:mm:ss') : '—'

export default function ChannelLogDetail() {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const logId = Number(params.id)
  const [detail, setDetail] = useState<PaymentChannelLog | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchDetail = useCallback(async () => {
    if (!logId) return
    setLoading(true)
    try {
      setDetail(await financeApi.getPaymentChannelLog(logId))
    } catch {
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [logId])

  useEffect(() => {
    void fetchDetail()
  }, [fetchDetail])

  const items = useMemo(
    () => [
      { key: 'transaction_id', label: '渠道流水号', children: detail?.transaction_id || '—' },
      { key: 'log_id', label: '流水 ID', children: detail?.log_id ?? '—' },
      {
        key: 'channel_type',
        label: '支付渠道',
        children: detail ? (CHANNEL_TYPE_TEXT[detail.channel_type] ?? `渠道 ${detail.channel_type}`) : '—',
      },
      { key: 'order_no', label: '关联订单号', children: detail?.order_no || '—' },
      { key: 'order_id', label: '订单 ID', children: detail?.order_id ?? '—' },
      {
        key: 'order_type',
        label: '订单类型',
        children: detail ? (ORDER_TYPE_TEXT[detail.order_type] ?? `类型 ${detail.order_type}`) : '—',
      },
      { key: 'amount', label: '交易金额', children: <strong>{formatAmount(detail?.amount)}</strong> },
      { key: 'transaction_fee', label: '渠道手续费', children: formatAmount(detail?.transaction_fee) },
      {
        key: 'net_amount',
        label: '实际结算金额',
        children: detail
          ? formatAmount(Number(detail.amount ?? 0) - Number(detail.transaction_fee ?? 0))
          : '—',
      },
      { key: 'paid_at', label: '支付时间', children: fmtTime(detail?.paid_at) },
      { key: 'matched_at', label: '对账匹配时间', children: fmtTime(detail?.matched_at) },
      { key: 'create_at', label: '流水创建时间', children: fmtTime(detail?.create_at) },
    ],
    [detail],
  )

  return (
    <PageContainer
      title="渠道流水详情"
      description={detail?.transaction_id || '查看渠道交易与订单匹配信息'}
      extra={
        <Space>
          {detail?.order_id ? (
            <Button onClick={() => navigate(`/order/detail/${detail.order_id}`)}>查看关联订单</Button>
          ) : null}
          <Button
            color="primary"
            variant="outlined"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/finance/channel-log')}
          >
            返回渠道流水
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        <div className="channel-log-detail">
          <Card variant="borderless" className="channel-log-detail__summary">
            <div className="summary-item">
              <span>交易状态</span>
              <em className={`status-btn status--${CHANNEL_LOG_STATUS_TONE[detail?.status ?? 0] ?? 'cancel'}`}>
                {CHANNEL_LOG_STATUS_TEXT[detail?.status ?? 0] ?? '—'}
              </em>
            </div>
            <div className="summary-item">
              <span>支付渠道</span>
              <strong>{detail ? (CHANNEL_TYPE_TEXT[detail.channel_type] ?? '—') : '—'}</strong>
            </div>
            <div className="summary-item">
              <span>交易金额</span>
              <strong>{formatAmount(detail?.amount)}</strong>
            </div>
            <div className="summary-item">
              <span>渠道手续费</span>
              <strong>{formatAmount(detail?.transaction_fee)}</strong>
            </div>
            <div className="summary-item">
              <span>支付时间</span>
              <strong>{fmtTime(detail?.paid_at)}</strong>
            </div>
          </Card>

          <Card variant="borderless" className="detail-card">
            <div className="detail-card__header">
              <h3>流水信息</h3>
              <span>{detail?.transaction_id || '—'}</span>
            </div>
            <Descriptions
              column={{ xs: 1, sm: 2, lg: 3 }}
              size="small"
              colon={false}
              bordered
              items={items}
            />
          </Card>
        </div>
      </Spin>
    </PageContainer>
  )
}
