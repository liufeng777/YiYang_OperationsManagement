/**
 * 导出拉新明细 Modal（推荐与奖励页）
 * 接口：rewardApi.exportReferralEvents（GET /admin/referral-events/export，text/csv）
 * - 筛选：注册日期（默认本月）/ 邀请来源（inviter_type：staff-员工 / user-用户 / admin-客服）
 *        / 邀请人关键字（姓名或手机号模糊）/ 事件状态（0-全部 1-待生效 2-已生效 9-无效）
 * - 导出：仅 event_type=100 注册类型事件，返回 CSV 文件直接下载
 */
import { useMemo, useState } from 'react'
import { App, Button, DatePicker, Form, Input, Modal, Select } from 'antd'
import dayjs from 'dayjs'
import { rewardApi } from '@/api'
import { downloadBlob } from '@/utils'
import './ExportRecruitModal.less'

/** 邀请来源选项（swagger inviter_type：按推广码首字母 S-员工 / U-用户 / A-客服 判定） */
const INVITER_TYPE_OPTIONS = [
  { value: 'staff' as const, label: '员工邀请' },
  { value: 'user' as const, label: '会员邀请' },
  { value: 'admin' as const, label: '客服邀请' },
]

/** 事件状态选项（swagger：1-pending / 2-valid / 9-invalid，0 返回全部） */
const STATUS_OPTIONS = [
  { value: 0, label: '全部状态' },
  { value: 1, label: '待生效' },
  { value: 2, label: '已生效' },
  { value: 9, label: '无效' },
]

interface ExportRecruitModalProps {
  open: boolean
  onClose: () => void
}

interface ExportFormValues {
  range?: [dayjs.Dayjs, dayjs.Dayjs]
  inviterType?: 'staff' | 'user' | 'admin'
  inviterKeyword?: string
  status?: number
}

export default function ExportRecruitModal(props: ExportRecruitModalProps) {
  const { open, onClose } = props
  const { message } = App.useApp()
  const [form] = Form.useForm<ExportFormValues>()
  const [submitting, setSubmitting] = useState(false)

  /** 默认注册日期：本月 */
  const defaultRange = useMemo<[dayjs.Dayjs, dayjs.Dayjs]>(
    () => [dayjs().startOf('month'), dayjs().endOf('month')],
    [],
  )

  const handleExport = async () => {
    const values = await form.validateFields()
    setSubmitting(true)
    try {
      const res = await rewardApi.exportReferralEvents({
        start_time: values.range?.[0]?.startOf('day').unix(),
        stop_time: values.range?.[1]?.endOf('day').unix(),
        inviter_type: values.inviterType,
        inviter_keyword: values.inviterKeyword?.trim() || undefined,
        status: values.status || undefined,
      })
      downloadBlob(res.data, `拉新明细_${dayjs().format('YYYYMMDDHHmmss')}.csv`)
      message.success('导出成功，文件已开始下载')
      onClose()
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="导出拉新明细"
      open={open}
      onCancel={onClose}
      width={560}
      destroyOnHidden
      footer={
        <div className="export-recruit-modal__footer">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={submitting} onClick={() => void handleExport()}>
            导出明细
          </Button>
        </div>
      }
    >
      <p className="export-recruit-modal__desc">
        按首次注册时间导出邀请来源明细（CSV），供线下奖励核算使用。
      </p>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ range: defaultRange, status: 0 }}
      >
        <Form.Item name="range" label="注册日期">
          <DatePicker.RangePicker style={{ width: '100%' }} placeholder={['开始日期', '结束日期']} />
        </Form.Item>
        <Form.Item name="inviterType" label="邀请来源">
          <Select allowClear placeholder="全部" options={INVITER_TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item name="inviterKeyword" label="邀请人">
          <Input allowClear placeholder="邀请人姓名或手机号，空为不限" />
        </Form.Item>
        <Form.Item name="status" label="事件状态">
          <Select options={STATUS_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
