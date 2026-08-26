/**
 * 消息通知管理 - 短信记录（§9.3 / system:sms-log，仅查看）
 * 接口已封装 messageApi.getSmsLogs，后端就绪后替换本地 mock
 */
import { useMemo, useState } from 'react'
import { Button, Card, Input, Select, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { SmsLogDTO } from '@/api/modules/message'
import { formatDateTime } from '@/utils'

const smsStatusMap: Record<number, { text: string; color: string }> = {
  1: { text: '成功', color: 'success' },
  2: { text: '失败', color: 'error' },
  9: { text: '未送达', color: 'warning' },
}

/** mock 短信记录（对齐 SmsLogDTO） */
const mockSmsLogs: SmsLogDTO[] = [
  { id: 1, phone: '138****1026', content: '【幸福颐养】预约已确认，请提前准备。', status: 1, created_at: 1787875200 },
  { id: 2, phone: '136****5381', content: '【幸福颐养】您的验证码为 246810，5 分钟内有效。', status: 1, created_at: 1787792400 },
  { id: 3, phone: '159****2218', content: '【幸福颐养】您预约的服务将于 2 小时后开始。', status: 2, fail_reason: '运营商网关拒绝', created_at: 1787706000 },
  { id: 4, phone: '137****6632', content: '【幸福颐养】订单退款 300 元已原路退回。', status: 1, created_at: 1787619600 },
]

export default function SmsLogsTab() {
  const [data] = useState(mockSmsLogs)
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState('all')

  const filtered = useMemo(
    () =>
      data.filter((item) => {
        const phoneHit = !phone.trim() || item.phone.includes(phone.trim())
        const statusHit = status === 'all' || item.status === Number(status)
        return phoneHit && statusHit
      }),
    [data, phone, status],
  )

  const columns = useMemo<ColumnsType<SmsLogDTO>>(
    () => [
      { title: '手机号', dataIndex: 'phone', key: 'phone', width: 140 },
      { title: '短信内容', dataIndex: 'content', key: 'content', ellipsis: true },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (value: number) => (
          <Tag color={smsStatusMap[value]?.color}>{smsStatusMap[value]?.text ?? value}</Tag>
        ),
      },
      {
        title: '失败原因',
        dataIndex: 'fail_reason',
        key: 'fail_reason',
        width: 160,
        render: (value?: string) => value || '—',
      },
      {
        title: '发送时间',
        dataIndex: 'created_at',
        key: 'created_at',
        width: 170,
        render: (value: number) => formatDateTime(value * 1000),
      },
    ],
    [],
  )

  return (
    <>
      <Card variant="borderless" className="filter-bar">
        <Input
          allowClear
          placeholder="搜索手机号"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Select
          value={status}
          onChange={setStatus}
          options={[
            { label: '全部状态', value: 'all' },
            { label: '成功', value: '1' },
            { label: '失败', value: '2' },
            { label: '未送达', value: '9' },
          ]}
        />
        <Button>重置</Button>
        <Button type="primary">查询</Button>
      </Card>

      <Card variant="borderless" className="list-card">
        <div className="list-card__header">
          <div>
            <span className="list-card__header__title">短信发送记录</span>
            <span className="list-card__header__tips">共 {filtered.length} 条</span>
          </div>
        </div>
        <Table<SmsLogDTO>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={filtered}
          pagination={{ pageSize: 10, showSizeChanger: false }}
        />
      </Card>
    </>
  )
}
