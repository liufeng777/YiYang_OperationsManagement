/**
 * 消息通知管理 - 短信记录（§9.3 / system:sms-log，仅查看）
 * 数据来源：messageApi.getSmsLogs（服务端分页）
 * 说明：后端当前无数据返回，字段按接口文档契约（phone / content / status / fail_reason / created_at）；
 *       手机号与状态筛选全部下推后端（前端不做本地过滤）
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Input, Select, Tag } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import { messageApi } from '@/api'
import type { SmsLogDTO } from '@/api/modules/message'
import { formatDateTime } from '@/utils'

/** 短信状态：1-成功 2-失败 9-未送达 */
const smsStatusMap: Record<number, { text: string; color: string }> = {
  1: { text: '成功', color: 'success' },
  2: { text: '失败', color: 'error' },
  9: { text: '未送达', color: 'warning' },
}

interface SmsFilters {
  phone: string
  status: 'all' | string
}

const emptyFilters: SmsFilters = { phone: '', status: 'all' }

const PAGE_SIZE = 10

export default function SmsLogsTab() {
  const [rows, setRows] = useState<SmsLogDTO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [applied, setApplied] = useState<SmsFilters>(emptyFilters)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)

  /** 组装查询参数：筛选条件全部下推后端 */
  const buildParams = useCallback(
    (targetPage: number, filters: SmsFilters, size: number = PAGE_SIZE) => ({
      page: targetPage,
      page_size: size,
      phone: filters.phone || undefined,
      status: filters.status === 'all' ? undefined : Number(filters.status),
    }),
    [],
  )

  const fetchList = useCallback(
    async (targetPage: number, filters: SmsFilters, size: number = PAGE_SIZE) => {
      setLoading(true)
      try {
        const res = await messageApi.getSmsLogs(buildParams(targetPage, filters, size))
        setRows(res.list ?? [])
        setTotal(res.total ?? 0)
      } catch {
        /* 错误提示由 request 拦截器统一处理 */
        setRows([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    [buildParams],
  )

  useEffect(() => {
    void fetchList(1, emptyFilters, pageSize)
  }, [fetchList])

  const applyFilters = () => {
    const nextFilters: SmsFilters = { phone: phone.trim(), status }
    setApplied(nextFilters)
    setPage(1)
    void fetchList(1, nextFilters, pageSize)
  }

  const handleReset = () => {
    setPhone('')
    setStatus('all')
    setApplied(emptyFilters)
    setPage(1)
    void fetchList(1, emptyFilters, pageSize)
  }

  const columns = useMemo<ColumnsType<SmsLogDTO>>(
    () => [
      {
        title: '手机号',
        dataIndex: 'phone',
        key: 'phone',
        width: 140,
        render: (v?: string) => v || '—',
      },
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
        render: (value: number) => (value ? formatDateTime(value * 1000) : '—'),
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
          onPressEnter={applyFilters}
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
        <Button onClick={handleReset}>重置</Button>
        <Button type="primary" onClick={applyFilters}>
          查询
        </Button>
      </Card>

      <Card variant="borderless" className="list-card list-card--fill">
        <div className="list-card__header">
          <div>
            <span className="list-card__header__title">短信发送记录</span>
            <span className="list-card__header__tips">共 {total} 条记录</span>
          </div>
        </div>
        <FillTable<SmsLogDTO>
          rowKey="id"
          size="small"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage)
              setPageSize(nextPageSize)
              void fetchList(nextPage, applied, nextPageSize)
            },
            showTotal: (count) => `共 ${count} 条`,
          }}
        />
      </Card>
    </>
  )
}
