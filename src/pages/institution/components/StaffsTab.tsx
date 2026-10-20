/**
 * 机构详情 - 医护人员 Tab（只读）
 * 展示当前机构下的工作人员列表，仅查看，不提供增删改
 * 数据来源：staffApi.getStaffs（按 institution_id 过滤，服务端分页）
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { staffApi } from '@/api'
import type { StaffDTO } from '@/api/modules/staff'
import type { InstitutionItem } from '@/api/modules/institution'

interface StaffsTabProps {
  detail: InstitutionItem
  /** 医护人员数量回传给父级（Tab 角标） */
  onCountChange?: (count: number) => void
}

const PAGE_SIZE = 10

export default function StaffsTab({ detail, onCountChange }: StaffsTabProps) {
  const [rows, setRows] = useState<StaffDTO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [loading, setLoading] = useState(false)

  /** 医护人员列表：服务端分页（角标取 total） */
  const fetchRows = useCallback(
    async (targetPage = 1, size: number = PAGE_SIZE) => {
      if (!detail?.id) return
      setLoading(true)
      try {
        const res = await staffApi.getStaffs({
          institution_name: detail.name,
          page: targetPage,
          page_size: size,
        })
        setRows(res.list ?? [])
        setTotal(res.total ?? 0)
        onCountChange?.(res.total ?? 0)
      } catch {
        /* 错误提示由 request 拦截器统一处理 */
        setRows([])
        setTotal(0)
        onCountChange?.(0)
      } finally {
        setLoading(false)
      }
    },
    [detail?.id, onCountChange],
  )

  useEffect(() => {
    setPage(1)
    void fetchRows(1, pageSize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchRows])

  const columns = useMemo<ColumnsType<StaffDTO>>(
    () => [
      {
        title: '姓名',
        key: 'name',
        render: (_, record) => (
          <div className="table-cell">
            <strong>{record.name}</strong>
            <span>{record.referral_code || '—'}</span>
          </div>
        ),
      },
      {
        title: '人员类型',
        key: 'position_name',
        dataIndex: 'position_name',
      },
      {
        title: '手机号',
        key: 'phone',
        dataIndex: 'phone',
        render: (value: string) => value || '—',
      },
      {
        title: '状态',
        key: 'status',
        dataIndex: 'status',
        width: 120,
        render: (value: number) => (
          <span className={`status-btn status--${value === 1 ? 'success' : 'cancel'}`}>
            {value === 1 ? '在职' : '离职'}
          </span>
        ),
      },
    ],
    [],
  )

  return (
    <Card variant="borderless" className="detail-card">
      <div className="detail-card__header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h3>医护人员</h3>
        </div>
      </div>
      <Table<StaffDTO>
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        /* 列表内部滚动：固定表头，避免整页随名单滚动 */
        scroll={{ y: 'calc(100vh - 420px)' }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          showTotal: (count) => `共 ${count} 条`,
          onChange: (nextPage, nextPageSize) => {
            setPage(nextPage)
            setPageSize(nextPageSize)
            void fetchRows(nextPage, nextPageSize)
          },
        }}
      />
    </Card>
  )
}
