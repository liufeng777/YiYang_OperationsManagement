/**
 * 服务项目 - 服务分类（隐藏路由，从服务项目管理进入）
 * 当前为 mock 数据，后端就绪后替换为 serviceApi.getServiceCategoryList
 */
import { useMemo, useState } from 'react'
import { App, Button, Card, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import type { ServiceCategory } from '@/api/modules/service'
import './index.less'

const mockCategories: ServiceCategory[] = [
  { id: 'c1', code: 'FL001', name: '生活照护', serviceCount: 18, sort: 1, status: 'enabled' },
  { id: 'c2', code: 'FL002', name: '康复护理', serviceCount: 12, sort: 2, status: 'enabled' },
  { id: 'c3', code: 'FL003', name: '健康管理', serviceCount: 16, sort: 3, status: 'enabled' },
  { id: 'c4', code: 'FL004', name: '陪诊出行', serviceCount: 12, sort: 4, status: 'disabled' },
]

export default function ServiceCategoryPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [data, setData] = useState(mockCategories)

  const columns = useMemo<ColumnsType<ServiceCategory>>(
    () => [
      { title: '分类编码', dataIndex: 'code', key: 'code', width: 120 },
      { title: '分类名称', dataIndex: 'name', key: 'name' },
      {
        title: '服务数量',
        dataIndex: 'serviceCount',
        key: 'serviceCount',
        width: 120,
        render: (value: number) => `${value} 项`,
      },
      { title: '排序', dataIndex: 'sort', key: 'sort', width: 90 },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 110,
        render: (value: ServiceCategory['status']) => (
          <span className={`category-status category-status--${value}`}>
            {value === 'enabled' ? '启用中' : '已停用'}
          </span>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 160,
        render: (_, record) => (
          <div className="category-actions">
            <Button type="link" size="small" onClick={() => message.info('编辑分类开发中')}>
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              danger={record.status === 'enabled'}
              onClick={() => {
                const nextStatus = record.status === 'enabled' ? 'disabled' : 'enabled'
                setData((prev) => prev.map((item) => (item.id === record.id ? { ...item, status: nextStatus } : item)))
                message.success(`${record.name} 已${nextStatus === 'enabled' ? '启用' : '停用'}`)
              }}
            >
              {record.status === 'enabled' ? '停用' : '启用'}
            </Button>
          </div>
        ),
      },
    ],
    [message],
  )

  return (
    <PageContainer
      title="服务分类"
      description="维护集团服务池分类，停用后新建服务不可再选择该分类"
      extra={
        <div className="category-page__extra">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/service')}>
            返回服务项目
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => message.info('新建分类开发中')}>
            新建分类
          </Button>
        </div>
      }
    >
      <Card variant="borderless" className="list-card">
        <div className="list-card__header">
          <span className="list-card__header__title">分类列表</span>
          <span className="list-card__header__tips">共 {data.length} 个分类</span>
        </div>
        <Table<ServiceCategory>
          rowKey="id"
          columns={columns}
          dataSource={data}
          pagination={false}
          size="small"
        />
      </Card>
    </PageContainer>
  )
}
