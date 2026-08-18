/**
 * 内容配置 - 专业人员展示
 * 视觉对齐设计稿：资料来源提示条 + 筛选 + 状态统计 + 人员表格 + 人员展示设置 Drawer
 * 当前为 mock 数据，后端就绪后替换为 contentApi.getStaffList / saveStaffDisplay
 */
import { useMemo, useState } from 'react'
import type { Key } from 'react'
import { App, Button, Card, Drawer, Input, InputNumber, Select, Switch, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SyncOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import type { StaffItem } from '@/api/modules/content'
import './staff.less'

const initialStaff: StaffItem[] = [
  {
    id: '1',
    name: '李慧',
    institutionName: '幸福颐养护理院',
    title: '主任医师',
    specialty: '心脑血管、慢病管理',
    syncedAt: '08-10 15:30',
    qualified: true,
    visible: true,
    recommended: true,
    recommendSort: 1,
    intro: '从事老年心脑血管疾病诊疗与慢病管理20余年，擅长为长者制定个性化健康管理方案。',
  },
  {
    id: '2',
    name: '王静',
    institutionName: '东城健康驿站',
    title: '主管护师',
    specialty: '居家护理、压疮照护',
    syncedAt: '08-10 15:30',
    qualified: true,
    visible: true,
    recommended: true,
    recommendSort: 2,
    intro: '专注居家护理与压疮照护，为失能长者家庭提供上门护理指导。',
  },
  {
    id: '3',
    name: '赵明',
    institutionName: '幸福颐养护理院',
    title: '康复治疗师',
    specialty: '术后康复、运动指导',
    syncedAt: '08-10 15:29',
    qualified: true,
    visible: true,
    recommended: false,
    intro: '擅长术后康复训练与长者运动能力评估指导。',
  },
  {
    id: '4',
    name: '周玲',
    institutionName: '西城健康驿站',
    title: '营养师',
    specialty: '长者营养、糖尿病饮食',
    syncedAt: '08-10 15:28',
    qualified: true,
    visible: true,
    recommended: false,
    intro: '专注长者营养配餐与糖尿病饮食管理。',
  },
  {
    id: '5',
    name: '陈岚',
    institutionName: '北苑健康驿站',
    title: '护士',
    specialty: '基础护理、健康随访',
    syncedAt: '08-09 17:42',
    qualified: false,
    visible: false,
    recommended: false,
    intro: '',
  },
]

interface StaffFilters {
  keyword: string
  institution: string
  title: string
  status: 'all' | 'visible' | 'hidden'
}

export default function StaffList() {
  const { message } = App.useApp()
  const [data, setData] = useState(initialStaff)
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

  const handleSaveSetting = () => {
    if (!settingTarget) return
    setData((prev) =>
      prev.map((item) =>
        item.id === settingTarget.id
          ? {
              ...item,
              visible: settingVisible,
              recommended: settingRecommended,
              recommendSort: settingSort ?? undefined,
              intro: settingIntro,
            }
          : item,
      ),
    )
    message.success(`已保存 ${settingTarget.name} 的展示设置（mock）`)
    setSettingTarget(null)
  }

  const setBatchVisible = (visible: boolean) => {
    if (!selectedRowKeys.length) {
      message.warning('请先选择人员')
      return
    }
    setData((prev) =>
      prev.map((item) => (selectedRowKeys.includes(item.id) ? { ...item, visible } : item)),
    )
    message.success(`已批量${visible ? '展示' : '隐藏'} ${selectedRowKeys.length} 人（mock）`)
    setSelectedRowKeys([])
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
      title="专业人员展示"
      description="同步医养服务工作台人员资料，控制患者端展示与推荐"
      extra={
        <Button
          type="primary"
          icon={<SyncOutlined />}
          onClick={() => message.success('人员资料同步任务已发起（mock）')}
        >
          同步人员资料
        </Button>
      }
    >
      <div className="staff-list">
        <div className="staff-list__banner">
          资料来源：医养服务工作台。运营平台不可新增人员或修改执业资质，仅设置患者端展示、推荐顺序和展示简介。
        </div>

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
              options={[
                { label: '全部机构', value: 'all' },
                { label: '幸福颐养护理院', value: '幸福颐养护理院' },
                { label: '东城健康驿站', value: '东城健康驿站' },
                { label: '西城健康驿站', value: '西城健康驿站' },
                { label: '北苑健康驿站', value: '北苑健康驿站' },
              ]}
            />
            <Select
              value={title}
              onChange={setTitle}
              options={[
                { label: '全部职业', value: 'all' },
                { label: '主任医师', value: '主任医师' },
                { label: '主管护师', value: '主管护师' },
                { label: '康复治疗师', value: '康复治疗师' },
                { label: '营养师', value: '营养师' },
                { label: '护士', value: '护士' },
              ]}
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
          <div className="filter-stats">
            <span>全部人员 46</span>
            <span>患者端展示 32</span>
            <span>首页推荐 8</span>
            <span>已隐藏 14</span>
          </div>
        </Card>

        <Card variant="borderless" className="list-card">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">专业人员列表</span>
              <span className="list-card__header__tips">共 46 人 · 最近同步 2026-08-10 15:30</span>
            </div>
            <div className="staff-table__batch">
              <Button type="link" size="small" onClick={() => setBatchVisible(true)}>
                批量展示
              </Button>
              <Button type="link" size="small" onClick={() => setBatchVisible(false)}>
                批量隐藏
              </Button>
              <Button
                type="link"
                size="small"
                onClick={() => {
                  if (!selectedRowKeys.length) {
                    message.warning('请先选择人员')
                    return
                  }
                  message.success(`已设置 ${selectedRowKeys.length} 人为首页推荐（mock）`)
                  setSelectedRowKeys([])
                }}
              >
                设置首页推荐
              </Button>
            </div>
          </div>
          <Table<StaffItem>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={filteredData}
            rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
            pagination={{ total: 46, pageSize: 5, current: 1, showSizeChanger: false }}
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
