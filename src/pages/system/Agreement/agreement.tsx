/**
 * 系统设置 - 协议与授权内容
 * 视觉对齐设计稿：版本规则提示 + 筛选 + 协议版本表格
 * 后端接口未对接：页面以 Alert 提示、不展示业务数据；接口就绪后接入 systemApi.getAgreementList
 */
import { useMemo, useState } from 'react'
import { App, Button, Card, Input, Modal, Select } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import ApiPendingAlert from '@/components/ApiPendingAlert'
import type { AgreementItem } from '@/api/modules/system'
import AgreementPhone from './AgreementPhone'
import { useNavigate } from 'react-router-dom'
import './agreement.less'

export default function AgreementList() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  /** 接口未对接：无列表数据，操作统一提示 */
  const [data] = useState<AgreementItem[]>([])
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [terminal, setTerminal] = useState('patient')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const previewItem = data.find((item) => item.id === previewId) ?? null

  /** 接口未对接：操作统一提示 */
  const notReady = () => {
    message.warning('接口未对接，功能暂未开放')
  }

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const keywordHit =
        !keyword.trim() ||
        item.name.includes(keyword.trim()) ||
        item.version.toLowerCase().includes(keyword.trim().toLowerCase())
      const typeHit = type === 'all' || item.type === type
      const statusHit = status === 'all' || item.status === status
      return keywordHit && typeHit && statusHit
    })
  }, [data, keyword, status, type])

  const handlePublish = () => {
    notReady()
  }

  const columns = useMemo<ColumnsType<AgreementItem>>(
    () => [
      {
        title: '协议名称',
        dataIndex: 'name',
        key: 'name',
        render: (value: string) => <strong className="agreement-name">{value}</strong>,
      },
      { title: '协议类型', dataIndex: 'type', key: 'type', width: 130 },
      { title: '当前版本', dataIndex: 'version', key: 'version', width: 100 },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (value: AgreementItem['status']) => (
          <span className={`agreement-status agreement-status--${value}`}>
            {value === 'effective' ? '已生效' : '草稿'}
          </span>
        ),
      },
      { title: '生效时间', dataIndex: 'effectiveTime', key: 'effectiveTime', width: 160 },
      { title: '最近更新', dataIndex: 'updatedAt', key: 'updatedAt', width: 160 },
      { title: '更新人', dataIndex: 'updater', key: 'updater', width: 110 },
      {
        title: '操作',
        key: 'action',
        width: 150,
        render: (_, record) => (
          <div className="agreement-actions">
            {record.status === 'effective' ? (
              <>
                <Button type="link" size="small" onClick={() => setPreviewId(record.id)}>
                  预览
                </Button>
                <Button type="link" size="small" onClick={notReady}>
                  新建版本
                </Button>
              </>
            ) : (
              <>
                <Button type="link" size="small" onClick={notReady}>
                  编辑
                </Button>
                <Button type="link" size="small" onClick={handlePublish}>
                  发布
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
      fixed
      title="协议与授权内容"
      description="维护患者端协议文本与版本，已生效版本保留历史记录"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={notReady}
        >
          新建协议版本
        </Button>
      }
    >
      <div className="agreement-page">
        <div className="agreement-page__banner">
          版本规则：编辑已生效协议时自动创建新草稿；发布新版本后，旧版本进入历史记录，患者端按生效时间展示最新版本。
        </div>
        <ApiPendingAlert feature="协议与授权内容" />

        <Card variant="borderless" className="filter-bar">
          <Input
            allowClear
            placeholder="请输入协议名称或版本号"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <Select
            value={type}
            onChange={setType}
            options={[{ label: '全部协议类型', value: 'all' }]}
          />
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '已生效', value: 'effective' },
              { label: '草稿', value: 'draft' },
            ]}
          />
          <Select
            value={terminal}
            onChange={setTerminal}
            options={[
              { label: '患者端', value: 'patient' },
              { label: '机构端', value: 'institution' },
            ]}
          />
          <Button
            onClick={() => {
              setKeyword('')
              setType('all')
              setStatus('all')
              setTerminal('patient')
            }}
          >
            重置
          </Button>
          <Button type="primary">查询</Button>
        </Card>

        <Card variant="borderless" className="list-card list-card--fill">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">协议版本列表</span>
              <span className="list-card__header__tips">共 {filteredData.length} 个版本</span>
            </div>
            <Button type="link" className="list-card__header__link" size="small" onClick={() => message.info('历史版本列表开发中')}>
              查看全部历史版本
            </Button>
          </div>
          <FillTable<AgreementItem>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={filteredData}
            pagination={false}
          />
        </Card>
      </div>

      <Modal
        open={!!previewItem}
        title="协议预览"
        width={350}
        footer={null}
        onCancel={() => setPreviewId(null)}
      >
        {previewItem && (
          <AgreementPhone
            name={previewItem.name}
            type={previewItem.type}
            version={previewItem.version}
            effectiveDate={previewItem.effectiveTime === '—' ? undefined : previewItem.effectiveTime}
          />
        )}
      </Modal>
    </PageContainer>
  )
}
