/**
 * 系统设置 - 系统公告
 * 视觉对齐设计稿：使用边界提示 + 筛选 + 公告表格（展示时段与状态操作）
 * 当前为 mock 数据，后端就绪后替换为 systemApi.getAnnouncementList
 */
import { useMemo, useState } from 'react'
import { App, Button, Card, Input, Select, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import type { AnnouncementItem } from '@/api/modules/system'
import './announcement.less'

const statusText: Record<AnnouncementItem['status'], string> = {
  showing: '展示中',
  scheduled: '待生效',
  draft: '草稿',
  finished: '已结束',
}

const initialData: AnnouncementItem[] = [
  {
    id: '1',
    title: '受台风影响，今日上门服务暂停',
    summary: '已预约订单将由客服逐一联系调整',
    type: '服务暂停',
    scope: '北京市全区域 · 上门服务',
    displayPeriod: '2026-08-12 00:00 至 23:59',
    status: 'showing',
    updater: '陈运营',
  },
  {
    id: '2',
    title: '系统维护通知',
    summary: '维护期间部分页面可能暂时无法访问',
    type: '系统维护',
    scope: '全部患者端用户',
    displayPeriod: '2026-08-15 00:00 至 02:00',
    status: 'scheduled',
    updater: '平台管理员',
  },
  {
    id: '3',
    title: '中秋节服务时间调整',
    summary: '节日期间部分机构服务时间有调整',
    type: '节假日调整',
    scope: '3 家机构 · 线下到院服务',
    displayPeriod: '2026-09-14 00:00 至 09-17 23:59',
    status: 'draft',
    updater: '陈运营',
  },
  {
    id: '4',
    title: '支付系统升级完成',
    summary: '支付与退款服务已恢复正常',
    type: '系统维护',
    scope: '全部患者端用户',
    displayPeriod: '2026-08-01 01:00 至 03:00',
    status: 'finished',
    updater: '平台管理员',
  },
]

export default function AnnouncementList() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [data, setData] = useState(initialData)
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState('all')
  const [scope, setScope] = useState('all')
  const [status, setStatus] = useState('all')

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const keywordHit = !keyword.trim() || item.title.includes(keyword.trim())
      const typeHit = type === 'all' || item.type === type
      const statusHit = status === 'all' || item.status === status
      return keywordHit && typeHit && statusHit
    })
  }, [data, keyword, status, type])

  const updateStatus = (record: AnnouncementItem, next: AnnouncementItem['status'], tip: string) => {
    setData((prev) =>
      prev.map((item) => (item.id === record.id ? { ...item, status: next } : item)),
    )
    message.success(tip)
  }

  const columns = useMemo<ColumnsType<AnnouncementItem>>(
    () => [
      {
        title: '公告标题',
        key: 'title',
        render: (_, record) => (
          <div className="announcement-title">
            <strong>{record.title}</strong>
            <span>{record.summary}</span>
          </div>
        ),
      },
      { title: '公告类型', dataIndex: 'type', key: 'type', width: 110 },
      { title: '影响范围', dataIndex: 'scope', key: 'scope', width: 180 },
      { title: '患者端展示时段', dataIndex: 'displayPeriod', key: 'displayPeriod', width: 220 },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (value: AnnouncementItem['status']) => (
          <span className={`announcement-status announcement-status--${value}`}>
            {statusText[value]}
          </span>
        ),
      },
      { title: '更新人', dataIndex: 'updater', key: 'updater', width: 110 },
      {
        title: '操作',
        key: 'action',
        width: 130,
        render: (_, record) => (
          <div className="announcement-actions">
            {record.status === 'showing' && (
              <>
                <Button type="link" size="small" onClick={() => message.info('公告预览开发中')}>
                  预览
                </Button>
                <Button
                  type="link"
                  size="small"
                  danger
                  onClick={() => updateStatus(record, 'finished', `「${record.title}」已结束展示`)}
                >
                  结束
                </Button>
              </>
            )}
            {record.status === 'scheduled' && (
              <>
                <Button type="link" size="small" onClick={() => message.info('编辑公告开发中')}>
                  编辑
                </Button>
                <Button type="link" size="small" onClick={() => message.info('公告预览开发中')}>
                  预览
                </Button>
              </>
            )}
            {record.status === 'draft' && (
              <>
                <Button type="link" size="small" onClick={() => message.info('编辑公告开发中')}>
                  编辑
                </Button>
                <Button
                  type="link"
                  size="small"
                  onClick={() => updateStatus(record, 'showing', `「${record.title}」已发布`)}
                >
                  发布
                </Button>
              </>
            )}
            {record.status === 'finished' && (
              <>
                <Button type="link" size="small" onClick={() => message.info('公告预览开发中')}>
                  预览
                </Button>
                <Button type="link" size="small" onClick={() => message.success('已复制为新草稿（mock）')}>
                  复制
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [message],
  )

  return (
    <PageContainer
      title="系统公告"
      description="发布服务暂停、系统维护和节假日服务调整等运营通知"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => message.info('新建系统公告开发中')}
        >
          新建系统公告
        </Button>
      }
    >
      <div className="announcement-page">
        <div className="announcement-page__subtabs">
          <button type="button" onClick={() => navigate('/system/message')}>
            业务消息模板 8
          </button>
          <button type="button" className="is-active">
            系统公告 3
          </button>
          <span>公告仅用于影响患者使用的运营异常通知</span>
        </div>

        <div className="announcement-page__banner">
          使用边界：可发布台风停服、系统维护、节假日服务调整等公告；活动推广、科普和营销内容请使用对应业务模块。
        </div>

        <Card variant="borderless" className="filter-bar">
          <Input
            allowClear
            placeholder="请输入公告标题"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <Select
            value={type}
            onChange={setType}
            options={[
              { label: '全部公告类型', value: 'all' },
              { label: '服务暂停', value: '服务暂停' },
              { label: '系统维护', value: '系统维护' },
              { label: '节假日调整', value: '节假日调整' },
            ]}
          />
          <Select
            value={scope}
            onChange={setScope}
            options={[
              { label: '全部影响范围', value: 'all' },
              { label: '全部患者端用户', value: '全部患者端用户' },
              { label: '指定机构', value: 'org' },
            ]}
          />
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '展示中', value: 'showing' },
              { label: '待生效', value: 'scheduled' },
              { label: '草稿', value: 'draft' },
              { label: '已结束', value: 'finished' },
            ]}
          />
          <Button
            onClick={() => {
              setKeyword('')
              setType('all')
              setScope('all')
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
              <span className="list-card__header__title">系统公告列表</span>
              <span className="list-card__header__tips">共 4 条 · 展示中 1 条 · 待生效 1 条</span>
            </div>
            <span className="announcement-table__note">仅展示有效时间内公告</span>
          </div>
          <Table<AnnouncementItem>
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
