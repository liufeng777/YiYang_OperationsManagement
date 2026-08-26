/**
 * 消息通知管理 - 消息模板（§9.2 / system:message-template）
 * 对齐设计稿：表格列表 + 右侧 Drawer 编辑/新建
 */
import { useMemo, useState } from 'react'
import { App, Button, Card, Drawer, Form, Input, Select, Space, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import type { CommonStatus } from '@/types/api'
import type { MessageTemplateDTO } from '@/api/modules/message'
import './TemplatesTab.less'

/** mock 消息模板（对齐设计稿） */
const mockTemplates: MessageTemplateDTO[] = [
  {
    id: 1,
    template_name: '预约提交成功',
    template_code: 'booking_submit',
    template_type: 1,
    business_type: '订单与支付（系统预置）',
    trigger_node: '用户提交服务订单后',
    receiver_targets: ['下单人'],
    wx_template_id: 'WX_BOOKING_SUBMIT_01',
    content: '尊敬的用户，您的服务预约已提交，请留意确认通知。',
    channels: ['站内', '微信'],
    status: 1,
    updated_at: 1787875200,
  },
  {
    id: 2,
    template_name: '预约确认通知',
    template_code: 'booking_confirm',
    template_type: 1,
    business_type: '订单与支付（系统预置）',
    trigger_node: '协作平台工单已确认',
    receiver_targets: ['下单人', '服务对象'],
    wx_template_id: 'WX_BOOKING_CONFIRM_01',
    content: '您预约的服务已确认，请按时到达。',
    channels: ['站内', '微信'],
    status: 1,
    updated_at: 1787864400,
  },
  {
    id: 3,
    template_name: '服务开始前提醒',
    template_code: 'service_remind',
    template_type: 2,
    business_type: '服务提醒（系统预置）',
    trigger_node: '预约时间前 2 小时',
    receiver_targets: ['服务对象'],
    wx_template_id: 'WX_SERVICE_REMIND_01',
    content: '您预约的服务将于 2 小时后开始，请做好准备。',
    channels: ['微信', '短信'],
    status: 1,
    updated_at: 1787792400,
  },
  {
    id: 4,
    template_name: '订单取消通知',
    template_code: 'order_cancel',
    template_type: 1,
    business_type: '订单与支付（系统预置）',
    trigger_node: '运营订单及关联工单取消成功',
    receiver_targets: ['下单人'],
    wx_template_id: 'WX_ORDER_CANCEL_01',
    content: '您的订单已取消，如有疑问请联系客服。',
    channels: ['站内', '微信'],
    status: 1,
    updated_at: 1787781600,
  },
  {
    id: 5,
    template_name: '整单退款结果',
    template_code: 'refund_result',
    template_type: 3,
    business_type: '退款结果（系统预置）',
    trigger_node: '原支付渠道退款成功或失败',
    receiver_targets: ['下单人'],
    wx_template_id: 'WX_REFUND_RESULT_01',
    content: '您的退款 {amount} 元已{result}。',
    channels: ['站内', '微信'],
    status: 1,
    updated_at: 1787706000,
  },
]

/** 接收对象选项 */
const receiverOptions = [
  { label: '下单人', value: '下单人' },
  { label: '服务对象', value: '服务对象' },
  { label: '报名人', value: '报名人' },
  { label: '会员本人', value: '会员本人' },
  { label: '已授权家属', value: '已授权家属' },
  { label: '当前/原服务人员', value: '当前/原服务人员' },
  { label: '健康管理师', value: '健康管理师' },
  { label: '审核/财务/运营负责人', value: '审核/财务/运营负责人' },
]

interface TemplateFormValues {
  template_name: string
  business_type?: string
  trigger_node?: string
  receiver_targets?: string[]
  wx_template_id?: string
  content: string
  channels?: string[]
  status?: number
}

export default function TemplatesTab() {
  const { message, modal } = App.useApp()
  const [data, setData] = useState(mockTemplates)
  const [keyword, setKeyword] = useState('')
  const [templateType, setTemplateType] = useState('all')
  const [channelFilter, setChannelFilter] = useState('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<MessageTemplateDTO | null>(null)
  const [form] = Form.useForm<TemplateFormValues>()

  const filtered = useMemo(
    () =>
      data.filter((item) => {
        const keywordHit =
          !keyword.trim() ||
          item.template_name.includes(keyword.trim()) ||
          item.template_code.includes(keyword.trim()) ||
          (item.trigger_node && item.trigger_node.includes(keyword.trim()))
        const typeHit = templateType === 'all' || item.template_type === Number(templateType)
        const channelHit = channelFilter === 'all' || item.channels.includes(channelFilter)
        return keywordHit && typeHit && channelHit
      }),
    [data, keyword, templateType, channelFilter],
  )

  const drawerTitle = useMemo(() => {
    if (!editingRecord) return '新建消息模板'
    return '编辑消息模板'
  }, [editingRecord])

  const drawerSubTitle = useMemo(() => {
    if (!editingRecord) return ''
    return `${editingRecord.template_name} · 业务触发消息`
  }, [editingRecord])

  const openCreate = () => {
    setEditingRecord(null)
    form.resetFields()
    setDrawerOpen(true)
  }

  const openEdit = (record: MessageTemplateDTO) => {
    setEditingRecord(record)
    form.setFieldsValue({
      template_name: record.template_name,
      business_type: record.business_type,
      trigger_node: record.trigger_node,
      receiver_targets: record.receiver_targets,
      wx_template_id: record.wx_template_id,
      content: record.content,
      channels: record.channels,
      status: record.status,
    })
    setDrawerOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editingRecord) {
        setData((prev) =>
          prev.map((item) =>
            item.id === editingRecord.id
              ? { ...item, ...values, status: 1, updated_at: Math.floor(Date.now() / 1000) }
              : item,
          ),
        )
        message.success(`模板「${values.template_name.trim()}」已保存并启用（mock）`)
      } else {
        const newItem: MessageTemplateDTO = {
          id: Date.now(),
          template_name: values.template_name,
          template_code: `template_${Date.now()}`,
          template_type: 1,
          business_type: values.business_type,
          trigger_node: values.trigger_node,
          receiver_targets: values.receiver_targets,
          wx_template_id: values.wx_template_id,
          content: values.content,
          channels: values.channels ?? ['站内'],
          status: 1,
          updated_at: Math.floor(Date.now() / 1000),
        }
        setData((prev) => [newItem, ...prev])
        message.success(`模板「${values.template_name.trim()}」已创建并启用（mock）`)
      }
      setDrawerOpen(false)
      form.resetFields()
      setEditingRecord(null)
    } catch {
      // 校验失败就地提示
    }
  }

  const toggleStatus = (record: MessageTemplateDTO) => {
    const next: CommonStatus = record.status === 1 ? 9 : 1
    setData((prev) => prev.map((item) => (item.id === record.id ? { ...item, status: next } : item)))
    message.success(`「${record.template_name}」已${next === 1 ? '启用' : '停用'}（mock）`)
  }

  const confirmDelete = (record: MessageTemplateDTO) => {
    modal.confirm({
      title: `确认删除模板「${record.template_name}」？`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        setData((prev) => prev.filter((item) => item.id !== record.id))
        message.success('模板已删除（mock）')
      },
    })
  }

  const columns = useMemo<ColumnsType<MessageTemplateDTO>>(
    () => [
      {
        title: '模板名称',
        dataIndex: 'template_name',
        key: 'template_name',
        render: (value: string) => <strong>{value}</strong>,
      },
      {
        title: '固定触发事件',
        dataIndex: 'trigger_node',
        key: 'trigger_node',
        render: (value: string) => value || '-',
      },
      {
        title: '启用渠道',
        dataIndex: 'channels',
        key: 'channels',
        width: 160,
        render: (value: string[]) => (
          <Space wrap>
            {value.map((item) => (
              <Tag color="blue" key={item}>
                {item}
              </Tag>
            ))}
          </Space>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 160,
        render: (_, record) => (
          <Space size={0}>
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
            <Button type="link" size="small" onClick={() => toggleStatus(record)}>
              {record.status === 1 ? '停用' : '启用'}
            </Button>
            <Button type="link" size="small" danger onClick={() => confirmDelete(record)}>
              删除
            </Button>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modal, message],
  )

  return (
    <>
      <div className='message-add-btn'>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增模板
        </Button>
      </div>
      <Card
        variant="borderless"
        className="filter-bar"
      >
        <Input
          allowClear
          placeholder="请输入模板名称或触发事件"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select
          value={templateType}
          onChange={setTemplateType}
          options={[
            { label: '全部业务类型', value: 'all' },
            { label: '预约通知', value: '1' },
            { label: '服务提醒', value: '2' },
            { label: '退款结果', value: '3' },
            { label: '账户安全', value: '4' },
          ]}
        />
        <Select
          value={channelFilter}
          onChange={setChannelFilter}
          options={[
            { label: '全部渠道', value: 'all' },
            { label: '站内', value: '站内' },
            { label: '微信', value: '微信' },
            { label: '短信', value: '短信' },
          ]}
        />
        <Button>重置</Button>
        <Button type="primary">查询</Button>
      </Card>

      <Card variant="borderless" className="list-card">
        <div className="list-card__header">
          <div>
            <span className="list-card__header__title">消息模板</span>
            <span className="list-card__header__tips">
              预置 {data.length} 个 · 已启用 {data.filter((d) => d.status === 1).length} 个
            </span>
          </div>
        </div>
        <Table<MessageTemplateDTO>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={filtered}
          pagination={false}
        />
      </Card>

      {/* 编辑/新建 Drawer */}
      <Drawer
        open={drawerOpen}
        width={560}
        title={
          <div className="template-drawer__title">
            <h3>{drawerTitle}</h3>
            {drawerSubTitle && <span className="template-drawer__subtitle">{drawerSubTitle}</span>}
          </div>
        }
        onClose={() => {
          setDrawerOpen(false)
          setEditingRecord(null)
          form.resetFields()
        }}
        footer={
          <div className="template-drawer__footer">
            <Button
              onClick={() => {
                setDrawerOpen(false)
                setEditingRecord(null)
                form.resetFields()
              }}
            >
              取消
            </Button>
            <Button type="primary" onClick={handleSave}>
              保存并启用
            </Button>
          </div>
        }
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          className="template-drawer__form"
        >
          <Form.Item
            name="template_name"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="请输入模板名称" />
          </Form.Item>

          <div className="template-drawer__two-col">
            <Form.Item name="business_type" label="业务类型">
              <Input placeholder="订单与支付（系统预置）" disabled />
            </Form.Item>
            <Form.Item name="trigger_node" label="触发节点">
              <Input placeholder="支付成功（不可修改）" disabled />
            </Form.Item>
          </div>

          <Form.Item name="receiver_targets" label="接收对象（可多选）">
            <Select
              mode="multiple"
              placeholder="请选择接收对象"
              options={receiverOptions}
            />
          </Form.Item>
          <p className="template-drawer__hint">
            按业务关系自动识别，不选择具体人员
          </p>

          <Form.Item
            name="wx_template_id"
            label="微信服务消息模板 ID"
            rules={[{ required: true, message: '请输入微信服务消息模板 ID' }]}
          >
            <Input placeholder="如 WX_ORDER_PAY_SUCCESS_01" />
          </Form.Item>

          {/* 消息内容预览 */}
          <div className="template-drawer__preview-label">消息内容预览</div>
          <div className="template-drawer__preview">
            <strong>支付成功</strong>
            <p>{'您已支付成功。订单号：{{订单号}}'}</p>
            <p>{'服务项目：{{服务项目}}'}</p>
            <p>{'预约时间：{{预约时间}}'}</p>
          </div>

          {/* 注解区域 */}
          <div className="template-drawer__annotation">
            <div className="template-drawer__annotation__header">
              <Tag color="blue">注解</Tag>
              <strong>一期触发节点</strong>
            </div>
            <div className="template-drawer__annotation__body">
              <p>订单/预约：支付成功、预约成功/变更/取消、服务前提醒、服务完成</p>
              <p>退款：提交申请、审核结果、退款结果</p>
              <p>活动：报名成功、活动时间或机构变更、取消</p>
              <p>健康/协作：方案发布、档案可查看；新工单、改派、取消</p>
            </div>
          </div>

          <div className="template-drawer__annotation">
            <div className="template-drawer__annotation__header">
              <Tag color="blue">注解</Tag>
              <strong>接收对象与发送规则</strong>
            </div>
            <div className="template-drawer__annotation__body">
              <p>接收对象按业务角色选择：下单人、服务对象、报名人、会员本人、已授权家属、当前/原服务人员、健康管理师、审核/财务/运营负责人。</p>
              <p>同人去重；服务对象无独立联系方式时只发下单人；健康信息仅发授权范围内家属；普通模板不支持全部用户或机构群发。</p>
            </div>
          </div>
        </Form>
      </Drawer>
    </>
  )
}
