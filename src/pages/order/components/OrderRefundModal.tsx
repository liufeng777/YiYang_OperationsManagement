/**
 * 订单退款发起弹窗（订单列表用）
 * 接口：POST /admin/orders/{id}/refund（swagger admin.ReqRefundOrder：amount / reason / type 必填）
 * 金额单位：元（《共通-API设计》§5：金额统一 DECIMAL(10,2)，单位元），输入即提交，不做分换算
 * 可退款状态：3-生效中 / 4-已完成（见 ./constants 的 canRefundOrder）
 */
import { useEffect, useMemo, useState } from 'react'
import { App, Form, Input, InputNumber, Modal, Radio } from 'antd'
import { orderApi } from '@/api'
import type { OrderDetail, OrderRefundType } from '@/api/modules/order'
import { formatAmount } from '@/utils'

export interface OrderRefundModalProps {
  /** 待退款订单（null 时不展示） */
  order: OrderDetail | null
  open: boolean
  onClose: () => void
  /** 退款发起成功回调（父级刷新列表） */
  onSuccess: () => void
}

interface RefundFormValues {
  type: OrderRefundType
  /** 部分退款的退款金额（元） */
  amount?: number
  reason: string
}

/** 已占用金额的退款状态：2-审批通过 3-退款中 4-已退款（避免重复退款超额） */
const OCCUPIED_REFUND_STATUS = [2, 3, 4]

export default function OrderRefundModal({
  order,
  open,
  onClose,
  onSuccess,
}: OrderRefundModalProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<RefundFormValues>()
  const [submitting, setSubmitting] = useState(false)
  const type = Form.useWatch('type', form) ?? 1

  /** 可退金额 = 实付金额 - 已发起/已完成的退款金额 */
  const maxRefundable = useMemo(() => {
    if (!order) return 0
    const occupied = (order.refund_list ?? [])
      .filter((item) => OCCUPIED_REFUND_STATUS.includes(item.refund_status))
      .reduce((sum, item) => sum + (item.refund_amount ?? 0), 0)
    return Math.max((order.paid_amount ?? 0) - occupied, 0)
  }, [order])

  useEffect(() => {
    if (!open || !order) return
    form.resetFields()
    form.setFieldsValue({ type: 1, amount: maxRefundable })
  }, [open, order, maxRefundable, form])

  const handleSubmit = async () => {
    let values: RefundFormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    if (!order) return
    const amount = values.type === 1 ? maxRefundable : Number(values.amount ?? 0)
    if (amount <= 0) {
      message.warning('可退金额为 0，无法发起退款')
      return
    }
    setSubmitting(true)
    try {
      await orderApi.createOrderRefund(order.id, {
        amount,
        type: values.type,
        reason: values.reason.trim(),
      })
      message.success(`订单 ${order.order_no} 的退款申请已提交`)
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
      title={`订单退款 · ${order?.order_no ?? ''}`}
      open={open && !!order}
      onOk={() => void handleSubmit()}
      onCancel={handleClose}
      confirmLoading={submitting}
      okText="提交退款"
      cancelText="取消"
      destroyOnHidden
      forceRender
      width={520}
    >
      <Form<RefundFormValues> form={form} layout="vertical" preserve={false}>
        <Form.Item label="订单金额">
          <span>
            实付 {formatAmount(order?.paid_amount)} · 可退 {formatAmount(maxRefundable)}
          </span>
        </Form.Item>
        <Form.Item
          name="type"
          label="退款类型"
          rules={[{ required: true, message: '请选择退款类型' }]}
        >
          <Radio.Group
            options={[
              { label: '全额退款', value: 1 },
              { label: '部分退款', value: 2 },
            ]}
            optionType="button"
            buttonStyle="solid"
          />
        </Form.Item>
        {type === 2 ? (
          <Form.Item
            name="amount"
            label="退款金额（元）"
            rules={[
              { required: true, message: '请输入退款金额' },
              {
                validator: (_, value?: number) => {
                  if (value == null) return Promise.resolve()
                  if (value <= 0) return Promise.reject(new Error('退款金额需大于 0'))
                  if (value > maxRefundable) {
                    return Promise.reject(new Error(`最多可退 ${maxRefundable} 元`))
                  }
                  return Promise.resolve()
                },
              },
            ]}
            extra={`最多可退 ${maxRefundable} 元`}
          >
            <InputNumber
              min={0}
              max={maxRefundable}
              precision={2}
              style={{ width: '100%' }}
              placeholder="请输入退款金额"
            />
          </Form.Item>
        ) : null}
        <Form.Item
          name="reason"
          label="退款原因"
          rules={[{ required: true, whitespace: true, message: '请输入退款原因' }]}
        >
          <Input.TextArea rows={3} maxLength={200} showCount placeholder="请说明退款原因" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
