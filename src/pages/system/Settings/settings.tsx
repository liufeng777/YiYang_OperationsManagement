/**
 * 系统设置 - 运营参数配置
 * 数据来源：settingsApi.getSettings（GET /api/v1/admin/settings，支持 key 模糊筛选）
 * 保存 / 新增：settingsApi.updateSetting（PUT /api/v1/admin/settings）
 * - 更新：必传 settings_id + key / type / value（description 选填）
 * - 新增：不传 settings_id，key / type / value 必填（通过「新增参数」弹窗）
 * 交互：列表默认只读渲染，操作栏「编辑」进入行内编辑态（输入框 + 保存 / 取消）
 * 权限：参数 key 与参数说明仅超级管理员可编辑；参数值所有管理员可改
 * 值编辑控件按 type 区分：bool → Switch，number → InputNumber，其余 → Input
 * 接口返回容错：data 可能为数组，也可能为 { key: value } 映射，统一归一化为 SettingItem[]
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { App, Button, Card, Form, Input, InputNumber, Modal, Switch, Tag } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import { settingsApi } from '@/api'
import type { SettingItem } from '@/api/modules/settings'
import { useUserStore } from '@/store'
import './settings.less'

/** 超级管理员角色编码（后端角色编码，如 roles: ["finance","operator"]；如有出入在此调整） */
const SUPER_ROLE_CODES = ['super_admin', 'super', 'admin', '超级管理员']

/** 行标识：优先 settings_id，兜底 key */
function rowIdOf(item: SettingItem): string {
  return item.settings_id != null ? `id:${item.settings_id}` : `key:${item.key}`
}

/** 接口返回容错：数组原样返回（兼容 settings_id / id）；{ key: value } 映射则按值推断类型后展开 */
function normalizeSettings(data: unknown): SettingItem[] {
  if (Array.isArray(data)) {
    return (data as Array<SettingItem & { id?: number }>).map((item) => ({
      ...item,
      settings_id: item.settings_id ?? item.id,
    }))
  }
  if (data && typeof data === 'object') {
    return Object.entries(data as Record<string, unknown>).map(([key, value]) => {
      let type = 'string'
      if (typeof value === 'number') type = 'number'
      else if (typeof value === 'boolean') type = 'bool'
      return { key, type, value: String(value) }
    })
  }
  return []
}

/** 判断是否为开关类型 */
function isBool(type: string) {
  return type === 'bool' || type === 'boolean'
}

/** 类型切换时的值兜底：bool 仅允许 'true' / 'false'（默认 'false'）；number 仅允许数值（否则清空）；string 保留原值 */
function coerceValue(type: string, value: string): string {
  if (isBool(type)) return value === 'true' || value === 'false' ? value : 'false'
  if (type === 'number') return value !== '' && !Number.isNaN(Number(value)) ? value : ''
  return value
}

/** 只读态的参数值展示 */
function displayValue(record: SettingItem): string {
  if (isBool(record.type)) return record.value === 'true' ? '开启' : '关闭'
  return record.value || '—'
}

/** 新增参数表单值（type 固定为 string，无需表单项） */
interface CreateFormValues {
  key: string
  value: string
  description?: string
}

export default function OperationSettings() {
  const { message } = App.useApp()
  const userInfo = useUserStore((state) => state.userInfo)
  /** 是否超级管理员：决定 key / 参数说明是否可编辑、是否可新增参数 */
  const isSuperAdmin = useMemo(
    () => (userInfo?.roles ?? []).some((role) => SUPER_ROLE_CODES.includes(role)),
    [userInfo],
  )

  const [rows, setRows] = useState<SettingItem[]>([])
  const [loading, setLoading] = useState(false)
  /** 行内编辑态：同一时刻仅一行可编辑 */
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [draft, setDraft] = useState<SettingItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createForm] = Form.useForm<CreateFormValues>()

  /** 拉取全局参数列表（key 筛选下推后端） */
  const fetchList = useCallback(async (key?: string) => {
    setLoading(true)
    try {
      const res = await settingsApi.getSettings(key ? { key } : undefined)
      setRows(normalizeSettings(res.list))
      setEditingRowId(null)
      setDraft(null)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  const applySearch = () => {
    void fetchList(keyword.trim() || undefined)
  }

  const handleReset = () => {
    setKeyword('')
    void fetchList('')
  }

  /** 进入行内编辑态：以当前行数据初始化草稿 */
  const handleEdit = (record: SettingItem) => {
    setEditingRowId(rowIdOf(record))
    setDraft(record)
  }

  /** 取消编辑：退出编辑态并丢弃草稿 */
  const handleCancelEdit = () => {
    setEditingRowId(null)
    setDraft(null)
  }

  /** 保存行内编辑（必传 settings_id） */
  const handleSave = async (record: SettingItem) => {
    if (!draft) return
    if (record.settings_id == null) {
      message.warning(`参数 ${record.key} 缺少 settings_id，无法保存`)
      return
    }
    const payload: SettingItem = {
      settings_id: record.settings_id,
      key: draft.key.trim(),
      type: draft.type || record.type,
      value: coerceValue(draft.type || record.type, draft.value),
      description: draft.description?.trim() || undefined,
    }
    if (!payload.key) {
      message.warning('参数键不能为空')
      return
    }
    setSaving(true)
    try {
      await settingsApi.updateSetting(payload)
      message.success(`参数 ${payload.key} 已保存`)
      setRows((prev) =>
        prev.map((item) =>
          rowIdOf(item) === rowIdOf(record)
            ? { ...item, ...payload, description: payload.description ?? '' }
            : item,
        ),
      )
      setEditingRowId(null)
      setDraft(null)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setSaving(false)
    }
  }

  /** 新增参数：PUT 不传 settings_id，保存成功后刷新列表 */
  const handleCreate = async () => {
    const values = await createForm.validateFields()
    setCreating(true)
    try {
      await settingsApi.updateSetting({
        key: values.key.trim(),
        type: 'string',
        value: values.value,
        description: values.description?.trim() || undefined,
      })
      message.success(`参数 ${values.key.trim()} 已创建`)
      setCreateOpen(false)
      createForm.resetFields()
      void fetchList(keyword.trim() || undefined)
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setCreating(false)
    }
  }

  const columns = useMemo<ColumnsType<SettingItem>>(
    () => [
      {
        title: '参数键',
        dataIndex: 'key',
        key: 'key',
        width: 260,
        render: (_, record) => {
          const editing = editingRowId === rowIdOf(record) && draft
          if (editing && isSuperAdmin) {
            return (
              <Input.TextArea
                className="setting-key-input"
                value={draft.key}
                onChange={(event) => setDraft({ ...draft, key: event.target.value })}
              />
            )
          }
          return <code className="setting-key">{record.key}</code>
        },
      },
      {
        title: '参数说明',
        dataIndex: 'description',
        key: 'description',
        render: (_, record) => {
          const editing = editingRowId === rowIdOf(record) && draft
          if (editing && isSuperAdmin) {
            return (
              <Input.TextArea
                value={draft.description}
                placeholder="选填"
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            )
          }
          return record.description || '—'
        },
      },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 150,
        render: () => (
          <Tag variant="outlined" color="default">
            字符串 (String)
          </Tag>
        ),
      },
      {
        title: '参数值',
        dataIndex: 'value',
        key: 'value',
        width: 200,
        render: (_, record) => {
          const editing = editingRowId === rowIdOf(record) && draft
          if (!editing) return displayValue(record)
          // 编辑态以草稿类型为准（超管可改类型）：bool → Switch（存 'true'/'false'），number → InputNumber，string → Input
          const draftType = draft.type || record.type
          if (isBool(draftType)) {
            return (
              <Switch
                checked={draft.value === 'true'}
                checkedChildren="开启"
                unCheckedChildren="关闭"
                onChange={(checked) => setDraft({ ...draft, value: String(checked) })}
              />
            )
          }
          if (draftType === 'number') {
            return (
              <InputNumber
                className="setting-value-input"
                value={draft.value === '' ? null : Number(draft.value)}
                onChange={(val) =>
                  setDraft({ ...draft, value: val === null ? '' : String(val) })
                }
              />
            )
          }
          return (
            <Input
              className="setting-value-input"
              value={draft.value}
              onChange={(event) => setDraft({ ...draft, value: event.target.value })}
            />
          )
        },
      },
      {
        title: '操作',
        key: 'action',
        width: 120,
        render: (_, record) => {
          const editing = editingRowId === rowIdOf(record) && draft
          if (editing) {
            return (
              <>
                <Button
                  type="link"
                  size="small"
                  loading={saving}
                  onClick={() => void handleSave(record)}
                >
                  保存
                </Button>
                <Button type="link" size="small" disabled={saving} onClick={handleCancelEdit}>
                  取消
                </Button>
              </>
            )
          }
          return (
            <Button
              type="link"
              size="small"
              disabled={editingRowId !== null}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          )
        },
      },
    ],
    [draft, editingRowId, saving, isSuperAdmin],
  )

  return (
    <PageContainer
      fixed
      title="运营参数配置"
      description={
        isSuperAdmin
          ? '查看并维护全局运营参数，点击「编辑」修改后保存即时生效'
          : '查看并维护全局运营参数（参数键与说明仅超级管理员可修改）'
      }
    >
      <div className="settings-page">
        <Card variant="borderless" className="filter-bar settings-page__filter">
          <Input
            allowClear
            placeholder="按参数键筛选，如 service.radius"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onPressEnter={applySearch}
          />
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={applySearch}>
            查询
          </Button>
        </Card>

        <Card variant="borderless" className="list-card list-card--fill">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">全局参数</span>
              <span className="list-card__header__tips">共 {rows.length} 条</span>
            </div>
            <div>
              {isSuperAdmin && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateOpen(true)}
                >
                  新增参数
                </Button>
              )}
            </div>
          </div>
          <FillTable<SettingItem>
            rowKey={(record) => rowIdOf(record)}
            size="small"
            loading={loading}
            columns={columns}
            dataSource={rows}
            pagination={false}
          />
        </Card>
      </div>

      <Modal
        title="新增参数"
        open={createOpen}
        confirmLoading={creating}
        onOk={() => void handleCreate()}
        onCancel={() => {
          setCreateOpen(false)
          createForm.resetFields()
        }}
        destroyOnHidden
      >
        <Form<CreateFormValues>
          form={createForm}
          layout="vertical"
          initialValues={{ value: '' }}
          preserve={false}
        >
          <Form.Item
            name="key"
            label="参数键"
            rules={[{ required: true, whitespace: true, message: '请输入参数键' }]}
            extra="如 service.radius.default，创建后仅超级管理员可修改"
          >
            <Input placeholder="请输入参数键" allowClear />
          </Form.Item>
          <Form.Item
            name="value"
            label="参数值"
            rules={[{ required: true, message: '请输入参数值' }]}
            extra="参数类型固定为字符串 (String)"
          >
            <Input placeholder="请输入参数值" allowClear />
          </Form.Item>
          <Form.Item name="description" label="参数说明">
            <Input.TextArea rows={2} placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
