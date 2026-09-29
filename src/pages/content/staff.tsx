/**
 * 内容配置 - 专业人员展示
 * 视觉对齐设计稿：资料来源提示条 + 筛选 + 人员表格 + 人员展示设置 Drawer
 * 后端接口未对接：页面以 Alert 提示、不展示业务数据；接口就绪后接入 contentApi.getStaffList / saveStaffDisplay
 */
import { useMemo, useState } from 'react'
import type { Key } from 'react'
import { App, Button, Card, Drawer, Input, InputNumber, Select, Switch } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import { SyncOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import ApiPendingAlert from '@/components/ApiPendingAlert'
import type { StaffItem } from '@/api/modules/content'
import './staff.less'

interface StaffFilters {
  keyword: string
  institution: string
  title: string
  status: 'all' | 'visible' | 'hidden'
}

export default function StaffList() {
  const { message } = App.useApp()
  /** 接口未对接：无列表数据，操作统一提示 */
  const [data] = useState<StaffItem[]>([])
  const [keyword, setKeyword] = useState('')
  const [institution, setInstitution] = useState('all')
  const [title, setTitle] = useState('all')
  const [status, setStatus] = useState<StaffFilters['status']>('all')
  const [applied, setApplied] = useState<StaffFilters>({
    keyword: '',
    institution: 'all',
    title: 'all',
    status: 'all',
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [settingTarget, setSettingTarget] = useState<StaffItem | null>(null)
  const [settingVisible, setSettingVisible] = useState(true)
  const [settingRecommended, setSettingRecommended] = useState(false)
  const [settingSort, setSettingSort] = useState<number | null>(1)
  const [settingIntro, setSettingIntro] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const keywordHit =
        !applied.keyword ||
        item.name.includes(applied.keyword) ||
        item.specialty.includes(applied.keyword)
      const institutionHit =
        applied.institution === 'all' || item.institutionName === applied.institution
      const titleHit = applied.title === 'all' || item.title === applied.title
      const statusHit =
        applied.status === 'all' ||
        (applied.status === 'visible' ? item.visible : !item.visible)
      return keywordHit && institutionHit && titleHit && statusHit
    })
  }, [applied, data])

  const applyFilters = () => {
    setApplied({ keyword: keyword.trim(), institution, title, status })
  }

  const handleReset = () => {
    setKeyword('')
    setInstitution('all')
    setTitle('all')
    setStatus('all')
    setApplied({ keyword: '', institution: 'all', title: 'all', status: 'all' })
  }

  const openSetting = (record: StaffItem) => {
    setSettingTarget(record)
    setSettingVisible(record.visible)
    setSettingRecommended(record.recommended)
    setSettingSort(record.recommendSort ?? 1)
    setSettingIntro(record.intro ?? '')
  }

  /** 接口未对接：操作统一提示 */
  const notReady = () => {
    message.warning('接口未对接，功能暂未开放')
  }

  const handleSaveSetting = () => {
    if (!settingTarget) return
    notReady()
    setSettingTarget(null)
  }

  const setBatchVisible = () => {
    notReady()
  }

  const columns = useMemo<ColumnsType<StaffItem>>(
    () => [
      {
        title: '人员信息',
        key: 'name',
        render: (_, record) => (
          <div className="staff-info">
            <i className={record.qualified ? '' : 'is-pending'}>{record.name.slice(-1)}</i>
            <div>
              <strong>{record.name}</strong>
              <span>{record.qualified ? '已同步执业资质' : '资料待工作台完善'}</span>
            </div>
          </div>
        ),
      },
      { title: '所属机构', dataIndex: 'institutionName', key: 'institutionName', width: 150 },
      { title: '职业 / 职称', dataIndex: 'title', key: 'title', width: 110 },
      { title: '擅长领域', dataIndex: 'specialty', key: 'specialty' },
      { title: '同步时间', dataIndex: 'syncedAt', key: 'syncedAt', width: 110 },
      {
        title: '患者端展示',
        dataIndex: 'visible',
        key: 'visible',
        width: 110,
        render: (value: boolean) => (
          <span className={`staff-visible${value ? ' is-on' : ''}`}>
            {value ? '展示中' : '已隐藏'}
          </span>
        ),
      },
      {
        title: '首页推荐',
        dataIndex: 'recommended',
        key: 'recommended',
        width: 100,
        render: (value: boolean) => (
          <span className={`recommend-pill${value ? ' is-yes' : ''}`}>{value ? '是' : '否'}</span>
        ),
      },
      {
        title: '操作',
        key: 'action',
        width: 140,
        render: (_, record) => (
          <div className="staff-actions">
            <Button type="link" size="small" onClick={() => message.info(`${record.name} 资料为工作台只读同步`)}>
              查看
            </Button>
            <Button type="link" size="small" onClick={() => openSetting(record)}>
              展示设置
            </Button>
          </div>
        ),
      },
    ],
    [message],
  )

  return (
    <PageContainer
      fixed
      title="专业人员展示"
      description="同步医养服务工作台人员资料，控制患者端展示与推荐"
      extra={
        <Button
          type="primary"
          icon={<SyncOutlined />}
          onClick={notReady}
        >
          同步人员资料
        </Button>
      }
    >
      <div className="staff-list">
        <div className="staff-list__banner">
          资料来源：医养服务工作台。运营平台不可新增人员或修改执业资质，仅设置患者端展示、推荐顺序和展示简介。
        </div>
        <ApiPendingAlert feature="专业人员展示" />

        <Card variant="borderless" className="staff-list__filter">
          <div className="filter-row">
            <Input
              allowClear
              placeholder="请输入姓名或擅长领域"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onPressEnter={applyFilters}
            />
            <Select
              value={institution}
              onChange={setInstitution}
              options={[{ label: '全部机构', value: 'all' }]}
            />
            <Select
              value={title}
              onChange={setTitle}
              options={[{ label: '全部职业', value: 'all' }]}
            />
            <Select
              value={status}
              onChange={setStatus}
              options={[
                { label: '全部状态', value: 'all' },
                { label: '展示中', value: 'visible' },
                { label: '已隐藏', value: 'hidden' },
              ]}
            />
            <Button onClick={handleReset}>重置</Button>
            <Button type="primary" onClick={applyFilters}>
              查询
            </Button>
          </div>
        </Card>

        <Card variant="borderless" className="list-card list-card--fill">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">专业人员列表</span>
              <span className="list-card__header__tips">共 {filteredData.length} 人</span>
            </div>
            <div className="staff-table__batch">
              <Button type="link" size="small" onClick={setBatchVisible}>
                批量展示
              </Button>
              <Button type="link" size="small" onClick={setBatchVisible}>
                批量隐藏
              </Button>
              <Button
                type="link"
                size="small"
                onClick={notReady}
              >
                设置首页推荐
              </Button>
            </div>
          </div>
          <FillTable<StaffItem>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={filteredData}
            rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
            pagination={{
              current: page,
              pageSize,
              total: filteredData.length,
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPage)
                setPageSize(nextPageSize)
              },
              showTotal: (total) => `共 ${total} 条`
            }}
          />
        </Card>
      </div>

      <Drawer
        open={!!settingTarget}
        width={520}
        title="人员展示设置"
        onClose={() => setSettingTarget(null)}
        footer={
          <div className="staff-drawer__footer">
            <Button onClick={() => setSettingTarget(null)}>取消</Button>
            <Button type="primary" onClick={handleSaveSetting}>
              保存设置
            </Button>
          </div>
        }
      >
        {settingTarget && (
          <div className="staff-drawer">
            <p className="staff-drawer__desc">仅调整患者端展示，不修改工作台人员档案</p>

            <div className="staff-drawer__section">
              <div className="staff-drawer__section-head">
                <h4>工作台同步资料</h4>
                <em>只读</em>
              </div>
              <div className="staff-drawer__profile">
                <i>{settingTarget.name.slice(-1)}</i>
                <div>
                  <strong>{settingTarget.name}</strong>
                  <span>
                    {settingTarget.title} · {settingTarget.institutionName}
                  </span>
                </div>
              </div>
              <div className="staff-drawer__meta">
                <div>
                  <span>执业资质</span>
                  <strong>{settingTarget.title}资格 · 已核验</strong>
                </div>
                <div>
                  <span>擅长领域</span>
                  <strong>{settingTarget.specialty}、长者健康咨询</strong>
                </div>
                <div>
                  <span>最近同步</span>
                  <strong>2026-08-10 15:30</strong>
                </div>
              </div>
            </div>

            <div className="staff-drawer__section">
              <div className="staff-drawer__section-head">
                <h4>患者端展示配置</h4>
              </div>
              <div className="staff-drawer__row">
                <span>在患者端展示</span>
                <Switch checked={settingVisible} onChange={setSettingVisible} />
              </div>
              <div className="staff-drawer__row">
                <span>推荐到首页“专业团队”</span>
                <Switch checked={settingRecommended} onChange={setSettingRecommended} />
              </div>
              <div className="staff-drawer__row">
                <span>推荐顺序</span>
                <InputNumber
                  min={1}
                  value={settingSort}
                  onChange={(value) => setSettingSort(value)}
                />
              </div>
              <div className="staff-drawer__intro">
                <span>患者端展示简介</span>
                <Input.TextArea
                  rows={3}
                  maxLength={100}
                  showCount
                  placeholder="向患者展示的专业简介，100 字以内"
                  value={settingIntro}
                  onChange={(event) => setSettingIntro(event.target.value)}
                />
              </div>
              <div className="staff-drawer__preview">
                <span>患者端卡片预览</span>
                <div className="staff-card">
                  <i>{settingTarget.name.slice(-1)}</i>
                  <div>
                    <strong>
                      {settingTarget.name} {settingTarget.title}
                    </strong>
                    <span>{settingTarget.institutionName}</span>
                    <p>{settingIntro || '擅长' + settingTarget.specialty + '，为长者提供个性化健康指导。'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </PageContainer>
  )
}
