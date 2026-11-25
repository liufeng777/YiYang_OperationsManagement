/** 支付 / 退款渠道手动查询结果共用弹窗。 */
import { Alert, Button, Descriptions, Modal } from 'antd'
import type { DescriptionsProps } from 'antd'
import './index.less'

interface ChannelQueryResultModalProps {
  open: boolean
  title: string
  status: string
  statusLabel: string
  message: string
  items: DescriptionsProps['items']
  onClose: () => void
}

const getAlertType = (status: string): 'success' | 'warning' | 'error' | 'info' => {
  if (status === 'SUCCESS') return 'success'
  if (/NOT_EXIST|NOT_FOUND|NOTFOUND/.test(status)) return 'warning'
  if (/FAIL|CLOSED|ABNORMAL|ERROR/.test(status)) return 'error'
  return 'info'
}

export default function ChannelQueryResultModal({
  open,
  title,
  status,
  statusLabel,
  message,
  items,
  onClose,
}: ChannelQueryResultModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      width={600}
      onCancel={onClose}
      footer={<Button type="primary" onClick={onClose}>知道了</Button>}
    >
      <Alert
        showIcon
        type={getAlertType(status)}
        message={statusLabel || status || '查询完成'}
        description={message || '渠道已返回查询结果'}
      />
      <Descriptions
        className="channel-query-result__details"
        column={1}
        size="small"
        bordered
        items={items}
      />
    </Modal>
  )
}
