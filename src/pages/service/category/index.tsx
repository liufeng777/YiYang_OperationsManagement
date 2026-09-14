/**
 * 服务项目 - 服务分类（隐藏路由，从服务项目管理进入）
 * 数据来源：serviceApi.getServiceCategories / createServiceCategory / updateServiceCategory / updateServiceCategoryStatus
 * 说明：后端未提供服务分类删除端点，停用通过 status 接口实现
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { App, Button, Card, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import { serviceApi } from '@/api'
import type { ServiceCategory } from '@/api/modules/service'
import ServiceCategoryEditor, { type ServiceCategoryFill } from '../components/ServiceCategoryEditor'
import './index.less'

export default function ServiceCategoryPage() {
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const [data, setData] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null)

  /** 拉取分类列表 */
  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await serviceApi.getServiceCategories({ page: 1, page_size: 100 })
      setData(res.list ?? [])
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  const openCreate = () => {
    setEditingCategory(null)
    setEditorOpen(true)
  }

  const openEdit = (record: ServiceCategory) => {
    setEditingCategory(record)
    setEditorOpen(true)
  }

  /** 保存分类（新增 / 编辑；后端 PUT 为全量覆盖） */
  const handleSaved = async (values: ServiceCategoryFill) => {
    const payload = {
      name: values.name,
      name_en: values.name_en ?? '',
      code: values.code,
      brief: values.brief,
      brief_en: values.brief_en ?? '',
      sort_order: values.sort_order ?? 0,
      status: values.status,
    }
    try {
      if (editingCategory) {
        await serviceApi.updateServiceCategory(editingCategory.id, payload)
        message.success('分类已更新')
      } else {
        await serviceApi.createServiceCategory(payload)
        message.success('分类已创建')
      }
      void fetchList()
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    }
  }

  /** 启用 / 停用分类 */
  const handleToggleStatus = (record: ServiceCategory) => {
    const nextStatus = record.status === 1 ? 9 : 1
    modal.confirm({
      title: nextStatus === 9 ? '停用分类' : '启用分类',
      content:
        nextStatus === 9
          ? `确认停用分类“${record.name}”？停用后不会影响已有服务，仅新建服务时不再可选。`
          : `确认启用分类“${record.name}”？`,
      okText: `确认${nextStatus === 9 ? '停用' : '启用'}`,
      cancelText: '取消',
      okButtonProps: { danger: nextStatus === 9 },
      onOk: async () => {
        try {
          await serviceApi.updateServiceCategoryStatus(record.id, nextStatus)
          message.success(`${record.name} 已${nextStatus === 9 ? '停用' : '启用'}`)
        } catch {
          /* 错误提示由 request 拦截器统一处理 */
        }
        void fetchList()
      },
    })
  }

  const columns = useMemo<ColumnsType<ServiceCategory>>(
    () => [
      { title: '分类编码', dataIndex: 'code', key: 'code', width: 140 },
      {
        title: '分类名称',
        key: 'name',
        render: (_, record) => (
          <div>
            <strong>{record.name}</strong>
            {record.name_en ? <div style={{ color: '#8c8c8c', fontSize: 12 }}>{record.name_en}</div> : null}
          </div>
        ),
      },
      { title: '简介', dataIndex: 'brief', key: 'brief', ellipsis: true },
      { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 90 },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 110,
        render: (value: number) => (
          <span className={`category-status category-status--${value === 1 ? 'enabled' : 'disabled'}`}>
            {value === 1 ? '启用中' : '已停用'}
          </span>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 160,
        render: (_, record) => (
          <div className="category-actions">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              danger={record.status === 1}
              onClick={() => handleToggleStatus(record)}
            >
              {record.status === 1 ? '停用' : '启用'}
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchList],
  )

  return (
    <PageContainer
      title="服务分类"
      description="维护集团服务池分类，停用后新建服务不可再选择该分类"
      extra={
        <div className="category-page__extra">
          <Button color="primary" variant='outlined' icon={<ArrowLeftOutlined />} onClick={() => navigate('/service/list')}>
            返回服务项目
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
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
          loading={loading}
          pagination={false}
          size="small"
        />
      </Card>

      <ServiceCategoryEditor
        open={editorOpen}
        category={editingCategory}
        onClose={() => setEditorOpen(false)}
        onSaved={handleSaved}
      />
    </PageContainer>
  )
}
