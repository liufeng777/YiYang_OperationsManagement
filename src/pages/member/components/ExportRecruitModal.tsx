/**
 * 导出拉新明细 Modal
 * - 筛选：注册日期（默认本月，可选择起止日期）/ 邀请来源 / 邀请人（支持姓名或编号检索）
 * - 导出字段：注册会员编号、姓名、脱敏手机号、注册时间、邀请来源、邀请人编号/姓名、推广机构
 * - 导出：exportRecruitDetail —— swagger 未提供导出接口，捕获 ApiPendingError 后提示「接口未对接」
 *   （现有的 GET /admin/referral-events 仅能查询注册类推荐事件列表，缺少导出字段与文件导出能力）
 */
import { useMemo, useState } from 'react'
import { App, Button, DatePicker, Form, Modal, Select } from 'antd'
import dayjs from 'dayjs'
import { exportRecruitDetail, isApiPendingError } from '@/api/modules/memberOperation'
import './ExportRecruitModal.less'

/** 邀请来源选项（字典待后端定义，先按设计稿文案占位） */
const SOURCE_OPTIONS = [
  { value: 1, label: '员工邀请' },
  { value: 2, label: '会员邀请' },
  { value: 3, label: '无邀请归因' },
]

interface ExportRecruitModalProps {
  open: boolean
  onClose: () => void
}

interface ExportFormValues {
  range?: [dayjs.Dayjs, dayjs.Dayjs]
  sourceType?: number
  inviterId?: number
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
      await exportRecruitDetail({
        start_time: values.range?.[0]?.startOf('day').unix(),
        stop_time: values.range?.[1]?.endOf('day').unix(),
        source_type: values.sourceType,
        inviter_id: values.inviterId,
      })
      message.success('导出任务已创建')
      onClose()
    } catch (error) {
      if (isApiPendingError(error)) {
        message.warning(`${error.message}，暂无法导出`)
      }
      /* 其余错误提示由 request 拦截器统一处理 */
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
        按首次注册时间导出邀请来源明细，供线下奖励核算使用。
      </p>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ range: defaultRange }}
      >
        <Form.Item name="range" label="注册日期">
          <DatePicker.RangePicker style={{ width: '100%' }} placeholder={['本月', '可选择起止日期']} />
        </Form.Item>
        <Form.Item name="sourceType" label="邀请来源">
          <Select allowClear placeholder="全部" options={SOURCE_OPTIONS} />
        </Form.Item>
        <Form.Item
          name="inviterId"
          label="邀请人"
          extra="邀请人候选检索接口未对接，待后端补充后支持姓名 / 编号搜索"
        >
          <Select
            allowClear
            showSearch
            placeholder="全部 · 支持姓名或编号检索"
            options={[]}
            notFoundContent="暂无可选邀请人"
          />
        </Form.Item>
      </Form>
      <p className="export-recruit-modal__fields">
        导出字段：注册会员编号、姓名、脱敏手机号、注册时间、邀请来源、邀请人编号/姓名、推广机构。
      </p>
      <p className="export-recruit-modal__note">
        仅统计新增注册账号；同账号重复扫码不重复计入。推广机构不是后续服务机构。
      </p>
    </Modal>
  )
}
