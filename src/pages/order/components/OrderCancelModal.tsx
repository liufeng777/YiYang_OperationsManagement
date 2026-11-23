/**
 * 订单取消弹窗（订单列表用）
 * 接口：POST /admin/orders/{id}/cancel（swagger admin.ReqCancelOrder：reason 必填）
 * 可取消状态：1-待支付 / 2-待确认（见 ./constants 的 canCancelOrder）
 */
import { useEffect, useState } from 'react'
import { App, Form, Input, Modal } from 'antd'
import { orderApi } from '@/api'
import type { OrderDetail } from '@/api/modules/order'

export interface OrderCancelModalProps {
  /** 待取消订单（null 时不展示） */
  order: OrderDetail | null
  open: boolean
  onClose: () => void
  /** 取消成功回调（父级刷新列表） */
  onSuccess: () => void
}

interface CancelFormValues {
  reason: string
}

export default function OrderCancelModal({
  order,
  open,
  onClose,
  onSuccess,
}: OrderCancelModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<CancelFormValues>()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !order) return
    form.resetFields()
  }, [open, order, form])

  const handleSubmit = async () => {
    let values: CancelFormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    if (!order) return
    setSubmitting(true)
    try {
      await orderApi.cancelOrder(order.id, { reason: values.reason.trim() })
      message.success(`订单 ${order.order_no} 已取消`)
      onSuccess()
      onClose()
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (submitting) return
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      title={`取消订单 · ${order?.order_no ?? ''}`}
      open={open && !!order}
      onOk={() => void handleSubmit()}
      onCancel={handleClose}
      confirmLoading={submitting}
      okText="确认取消"
      okButtonProps={{ danger: true }}
      cancelText="返回"
      destroyOnHidden
      forceRender
      width={480}
    >
      <Form<CancelFormValues> form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="reason"
          label="取消原因"
          rules={[{ required: true, whitespace: true, message: '请输入取消原因' }]}
          extra="取消后不可恢复，请填写原因便于追溯"
        >
          <Input.TextArea rows={3} maxLength={200} showCount placeholder="请说明取消原因" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
