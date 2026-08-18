/**
 * 系统设置 - 消息模板
 * 视觉对齐设计稿：系统内 Tab + 业务消息模板表格（预置触发事件 + 启用渠道）
 * 当前为 mock 数据，后端就绪后替换为 systemApi.getMessageTemplateList
 */
import { useMemo, useState } from 'react'
import { App, Button, Card, Input, Select, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import SystemTabs from '@/pages/system/components/SystemTabs'
import type { MessageTemplateItem } from '@/api/modules/system'
import './message.less'

const mockTemplates: MessageTemplateItem[] = [
  {
    id: '1',
    name: '预约提交成功',
    triggerEvent: '用户提交服务订单后',
    channels: ['站内', '微信'],
    enabled: true,
    updatedAt: '08-10 14:20',
    updater: '陈运营',
  },
  {
    id: '2',
    name: '预约确认通知',
    triggerEvent: '协作平台工单已确认',
    channels: ['站内', '微信', '短信'],
    enabled: true,
    updatedAt: '08-10 11:35',
    updater: '陈运营',
  },
  {
    id: '3',
    name: '服务开始前提醒',
    triggerEvent: '预约时间前 2 小时',
    channels: ['微信', '短信'],
    enabled: true,
    updatedAt: '08-09 16:42',
    updater: '平台管理员',
  },
  {
    id: '4',
    name: '订单取消通知',
    triggerEvent: '运营订单及关联工单取消成功',
    channels: ['站内', '微信'],
    enabled: true,
    updatedAt: '08-09 10:18',
    updater: '陈运营',
  },
  {
    id: '5',
    name: '整单退款结果',
    triggerEvent: '原支付渠道退款成功或失败',
    channels: ['站内', '微信', '短信'],
    enabled: true,
    updatedAt: '08-08 15:06',
    updater: '财务人员',
  },
]

export default function MessageTemplate() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState('all')
  const [channel, setChannel] = useState('all')
  const [status, setStatus] = useState('all')

  const filteredData = useMemo(() => {
    return mockTemplates.filter((item) => {
      const keywordHit =
        !keyword.trim() ||
        item.name.includes(keyword.trim()) ||
        item.triggerEvent.includes(keyword.trim())
      const channelHit = channel === 'all' || item.channels.includes(channel)
      return keywordHit && channelHit
    })
  }, [channel, keyword])

  const columns = useMemo<ColumnsType<MessageTemplateItem>>(
    () => [
      {
        title: '模板名称',
        dataIndex: 'name',
        key: 'name',
        render: (value: string) => <strong className="template-name">{value}</strong>,
      },
      { title: '固定触发事件', dataIndex: 'triggerEvent', key: 'triggerEvent' },
      {
        title: '启用渠道',
        dataIndex: 'channels',
        key: 'channels',
        width: 200,
        render: (value: string[]) => (
          <div className="template-channels">
            {value.map((item) => (
              <span key={item} className={`channel-tag channel-tag--${item}`}>
                {item}
              </span>
            ))}
          </div>
        ),
      },
      {
        title: '状态',
        dataIndex: 'enabled',
        key: 'enabled',
        width: 100,
        render: (value: boolean) => (
          <span className={`template-status${value ? ' is-on' : ''}`}>
            {value ? '已启用' : '已停用'}
          </span>
        ),
      },
      { title: '最近更新', dataIndex: 'updatedAt', key: 'updatedAt', width: 110 },
      { title: '更新人', dataIndex: 'updater', key: 'updater', width: 110 },
      {
        title: '操作',
        key: 'action',
        width: 120,
        render: (_, record) => (
          <div className="template-actions">
            <Button type="link" size="small" onClick={() => message.info(`编辑「${record.name}」文案开发中`)}>
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => message.info(`预览「${record.name}」：${record.triggerEvent}时通过${record.channels.join('、')}发送`)}
            >
              预览
            </Button>
          </div>
        ),
      },
    ],
    [message],
  )

  return (
    <PageContainer
      title="消息模板与系统公告"
      description="维护预置业务消息文案和患者端运营异常公告"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/system/announcement')}
        >
          新建系统公告
        </Button>
      }
    >
      <div className="message-page">
        <SystemTabs />
        <div className="message-page__subtabs">
          <button type="button" className="is-active">
            业务消息模板 8
          </button>
          <button type="button" onClick={() => navigate('/system/announcement')}>
            系统公告 3
          </button>
          <span>业务触发事件由系统预置，不支持新增或删除</span>
        </div>

        <div className="message-page__banner">
          消息规则：站内消息用于承接详情；微信服务消息和短信仅作为外部提醒。运营人员可编辑文案与启停渠道，不能修改触发事件。
        </div>

        <Card variant="borderless" className="filter-bar">
          <Input
            allowClear
            placeholder="请输入模板名称或触发事件"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <Select
            value={type}
            onChange={setType}
            options={[
              { label: '全部业务类型', value: 'all' },
              { label: '预约订单', value: 'order' },
              { label: '退款', value: 'refund' },
            ]}
          />
          <Select
            value={channel}
            onChange={setChannel}
            options={[
              { label: '全部渠道', value: 'all' },
              { label: '站内', value: '站内' },
              { label: '微信', value: '微信' },
              { label: '短信', value: '短信' },
            ]}
          />
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '已启用', value: 'on' },
              { label: '已停用', value: 'off' },
            ]}
          />
          <Button
            onClick={() => {
              setKeyword('')
              setType('all')
              setChannel('all')
              setStatus('all')
            }}
          >
            重置
          </Button>
          <Button type="primary">查询</Button>
        </Card>

        <Card variant="borderless" className="list-card">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">业务消息模板</span>
              <span className="list-card__header__tips">预置 8 个 · 已启用 7 个</span>
            </div>
            <Button type="link" size="small" onClick={() => message.info('支持变量：用户姓名、服务名称、机构名称、预约时间、退款金额')}>
              变量说明
            </Button>
          </div>
          <Table<MessageTemplateItem>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={filteredData}
            pagination={false}
          />
        </Card>
      </div>
    </PageContainer>
  )
}
