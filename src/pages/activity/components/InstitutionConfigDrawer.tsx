/**
 * 活动 - 参与机构配置抽屉
 * 由活动列表「配置机构」与新建 / 编辑活动共用，机构数据来自 institutionApi.getInstitutions（不再使用 mock 机构池）
 * 交互：搜索机构（支持一次多选）→ 选择即添加，并自动带出该机构的联系人与联系电话 → 表格内配置场次时间与承接人数
 * 说明：抽屉内为本地编辑，点击「完成配置」才回传调用方（点取消丢弃本次改动）；
 *       点击遮罩 / ESC 均不关闭抽屉，只有右上角关闭按钮与「取消」按钮会关闭，避免误触丢失已填内容
 */
import { useEffect, useMemo, useState } from 'react'
import { App, Button, DatePicker, Drawer, Input, InputNumber, Select, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import { institutionApi } from '@/api'
import type { ActivityInstitutionConfig } from '@/api/modules/activity'
import type { InstitutionItem } from '@/api/modules/institution'
import './InstitutionConfigDrawer.less'

/** 单家参与机构的本地行模型（抽屉内编辑用） */
export interface ActivityInstitutionRow {
  /** 机构 id：后端要求 int，提交时由 toInstitutionConfigs 转换 */
  id: string
  name: string
  /** 机构区域展示，如 杭州市 · 滨江区 */
  area: string
  /** 承接人数（提交映射 max_participants） */
  capacity: number
  contactName: string
  contactPhone: string
  /** 场次开始 / 结束（提交转 UTC 秒） */
  startTime: Dayjs | null
  endTime: Dayjs | null
}

/** 新添加机构的默认承接人数 */
const DEFAULT_CAPACITY = 20

/** 多选 Select 恒为空值：选择即添加，选中项立即从框中清掉 */
const EMPTY_SELECTION: number[] = []

/** 机构区域展示：市 · 区 */
const formatArea = (inst?: InstitutionItem) =>
  inst ? [inst.city, inst.district].filter(Boolean).join(' · ') : ''

/** 机构配置（institutions[]）→ 本地行（机构名 / 区域由抽屉用机构池补全） */
export function toInstitutionRows(configs: ActivityInstitutionConfig[] = []): ActivityInstitutionRow[] {
  return configs.map((item) => ({
    id: String(item.institution_id),
    name: '',
    area: '',
    capacity: item.max_participants ?? 0,
    contactName: item.contact_name ?? '',
    contactPhone: item.contact_phone ?? '',
    startTime: item.start_time ? dayjs(item.start_time * 1000) : null,
    endTime: item.end_time ? dayjs(item.end_time * 1000) : null,
  }))
}

/**
 * 本地行 → 契约 institutions[]
 * 注意：契约里 institution_id 声明为 string，但后端要求 int（实测传字符串报
 * "cannot unmarshal string into Go struct field ... of type int"），故提交数字；
 * 另：编辑为全量覆盖，表格里的名额 / 场次 / 联系人被清空时回退 origin 原值，避免写空机构数据。
 */
export function toInstitutionConfigs(
  rows: ActivityInstitutionRow[],
  origin: ActivityInstitutionConfig[] = [],
): ActivityInstitutionConfig[] {
  const toSeconds = (value: Dayjs | null, fallback: number) =>
    value ? Math.floor(value.valueOf() / 1000) : fallback

  return rows
    .filter((row) => row.id)
    .map((row) => {
      const prev = origin.find((item) => Number(item.institution_id) === Number(row.id))
      return {
        institution_id: Number(row.id) as unknown as string,
        max_participants: row.capacity > 0 ? row.capacity : (prev?.max_participants ?? 0),
        start_time: toSeconds(row.startTime, prev?.start_time ?? 0),
        end_time: toSeconds(row.endTime, prev?.end_time ?? 0),
        contact_name: row.contactName?.trim() ? row.contactName : (prev?.contact_name ?? ''),
        contact_phone: row.contactPhone?.trim()
          ? row.contactPhone
          : (prev?.contact_phone ?? ''),
      }
    })
}

interface InstitutionConfigDrawerProps {
  open: boolean
  /** 打开时的初始配置（抽屉内改动不会直接写回该值） */
  value: ActivityInstitutionRow[]
  /** 取消 / 关闭：丢弃本次改动 */
  onClose: () => void
  /** 完成配置：校验通过后回传本地行，由调用方决定是否落库 */
  onSubmit: (rows: ActivityInstitutionRow[]) => void | Promise<void>
  /** 活动报名开始时间：限制场次日期，并作为新添加机构场次开始时间的默认值 */
  activityStart?: Dayjs | null
  /** 活动报名结束时间：限制场次日期，新添加机构的场次结束时间默认取该日 24:00 */
  activityEnd?: Dayjs | null
  /** 调用方落库中 */
  submitting?: boolean
  /** 抽屉标题 */
  title?: string
}

export default function InstitutionConfigDrawer({
  open,
  value,
  onClose,
  onSubmit,
  activityStart,
  activityEnd,
  submitting = false,
  title = '配置参与机构',
}: InstitutionConfigDrawerProps) {
  const { message, modal } = App.useApp()
  const [rows, setRows] = useState<ActivityInstitutionRow[]>([])
  const [pool, setPool] = useState<InstitutionItem[]>([])
  const [poolLoading, setPoolLoading] = useState(false)

  // 打开时以调用方数据初始化本地行
  useEffect(() => {
    if (!open) return
    setRows(value.map((row) => ({ ...row })))
  }, [open, value])

  // 机构池：打开时拉取，用于搜索选择、补全机构名 / 区域、带出联系人
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setPoolLoading(true)
    institutionApi
      .getInstitutions({ page: 1, page_size: 1000 })
      .then((res) => {
        if (!cancelled) setPool(res.list ?? [])
      })
      .catch(() => {
        /* 错误提示由 request 拦截器统一处理 */
        if (!cancelled) setPool([])
      })
      .finally(() => {
        if (!cancelled) setPoolLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const instMap = useMemo(() => new Map(pool.map((item) => [item.id, item])), [pool])

  /** 展示行：机构名 / 区域缺失时用机构池补全（调用方传入的只有 institution_id 等字段） */
  const displayRows = useMemo(
    () =>
      rows.map((row) => {
        const inst = instMap.get(Number(row.id))
        return {
          ...row,
          name: row.name || inst?.name || `机构 ${row.id}`,
          area: row.area || formatArea(inst),
        }
      }),
    [rows, instMap],
  )

  const totalCapacity = displayRows.reduce((sum, item) => sum + (item.capacity || 0), 0)
  const addedIds = useMemo(() => new Set(rows.map((row) => row.id)), [rows])

  /** 选择即添加：支持一次多选，自动带出该机构联系人与联系电话，场次默认取活动报名时间 */
  const handleAddInstitutions = (ids: number[]) => {
    const targets = ids.filter((id) => !addedIds.has(String(id)))
    if (!targets.length) return
    setRows((prev) => [
      ...prev,
      ...targets.map((id) => {
        const inst = instMap.get(id)
        return {
          id: String(id),
          name: inst?.name ?? `机构 ${id}`,
          area: formatArea(inst),
          capacity: DEFAULT_CAPACITY,
          contactName: inst?.manager_name ?? '',
          contactPhone: inst?.manager_phone ?? '',
          startTime: activityStart ?? null,
          // 场次结束默认取活动结束日期当日 24:00
          endTime: activityEnd ? activityEnd.endOf('day') : null,
        }
      }),
    ])
    message.success(`已添加 ${targets.length} 家机构`)
  }

  const patchRow = (id: string, patch: Partial<ActivityInstitutionRow>) => {
    setRows((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const handleStartTimeChange = (id: string, value: Dayjs | null) => {
    setRows((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const startTime = value ?? null
        // 结束时间早于新的开始时间时自动同步，避免出现负时长场次
        const endTime =
          item.endTime && startTime && item.endTime.isBefore(startTime) ? startTime : item.endTime
        return { ...item, startTime, endTime }
      }),
    )
  }

  const handleRemove = (row: ActivityInstitutionRow) => {
    modal.confirm({
      title: `确认移除机构「${row.name}」？`,
      content: '移除后该机构将不参与本活动，已配置的场次时间与承接人数将被清空。',
      okText: '确认移除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        setRows((prev) => prev.filter((item) => item.id !== row.id))
        message.success(`已移除「${row.name}」`)
      },
    })
  }

  /** 场次日期限制在活动报名起止时间范围内 */
  const disableDate = (current: Dayjs) => {
    if (activityStart && current.isBefore(activityStart.startOf('day'))) return true
    if (activityEnd && current.isAfter(activityEnd.endOf('day'))) return true
    return false
  }

  const handleSubmit = async () => {
    if (!displayRows.length) {
      message.warning('请至少添加一家参与机构')
      return
    }
    const noCapacity = displayRows.find((item) => !item.capacity || item.capacity <= 0)
    if (noCapacity) {
      message.warning(`请填写「${noCapacity.name}」的承接人数`)
      return
    }
    const noSchedule = displayRows.find((item) => !item.startTime || !item.endTime)
    if (noSchedule) {
      message.warning(`请配置「${noSchedule.name}」的场次开始与结束时间`)
      return
    }
    // 回传补全过机构名 / 区域的行，调用方无需再查机构池
    await onSubmit(displayRows)
  }

  const columns: ColumnsType<ActivityInstitutionRow> = [
    {
      title: '参与机构',
      key: 'name',
      render: (_, record) => (
        <div className="institution-cell">
          <strong>{record.name}</strong>
          <span>{record.area || '—'}</span>
        </div>
      ),
    },
    {
      title: '联系人',
      key: 'contactName',
      width: 100,
      render: (_, record) => (
        <Input
          value={record.contactName}
          placeholder="自动带出，可修改"
          onChange={(event) => patchRow(record.id, { contactName: event.target.value })}
        />
      ),
    },
    {
      title: '联系电话',
      key: 'contactPhone',
      width: 140,
      render: (_, record) => (
        <Input
          value={record.contactPhone}
          placeholder="自动带出，可修改"
          onChange={(event) => patchRow(record.id, { contactPhone: event.target.value })}
        />
      ),
    },
    {
      title: '场次开始',
      key: 'startTime',
      width: 160,
      render: (_, record) => (
        <DatePicker
          showTime
          format="MM-DD HH:mm"
          disabledDate={disableDate}
          value={record.startTime}
          onChange={(value) => handleStartTimeChange(record.id, value)}
        />
      ),
    },
    {
      title: '场次结束',
      key: 'endTime',
      width: 160,
      render: (_, record) => (
        <DatePicker
          showTime
          format="MM-DD HH:mm"
          disabledDate={disableDate}
          value={record.endTime}
          onChange={(value) => patchRow(record.id, { endTime: value ?? null })}
        />
      ),
    },
    {
      title: '承接人数',
      key: 'capacity',
      render: (_, record) => (
        <InputNumber
          min={1}
          value={record.capacity}
          addonAfter="人"
          onChange={(value) => patchRow(record.id, { capacity: value ?? 0 })}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 70,
      render: (_, record) => (
        <Button type="link" size="small" danger onClick={() => handleRemove(record)}>
          移除
        </Button>
      ),
    },
  ]

  return (
    <Drawer
      open={open}
      width={1000}
      title={title}
      onClose={onClose}
      // 点遮罩 / 按 ESC 都不关闭，避免误触丢弃已填配置
      maskClosable={false}
      keyboard={false}
      footer={
        <div className="institution-drawer__footer">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit}>
            完成配置
          </Button>
        </div>
      }
    >
      <div className="institution-drawer">
        <p className="institution-drawer__desc">
          每家机构独立配置活动时间（时间范围在活动时间范围内）与承接人数；取消不会保存本次改动。
        </p>
        <div className="institution-drawer__add">
          <Select
            mode="multiple"
            showSearch
            allowClear
            loading={poolLoading}
            placeholder="搜索机构名称 / 地区，可一次选择多家"
            value={EMPTY_SELECTION}
            onChange={handleAddInstitutions}
            // label 是自定义节点，搜索改用 keyword 字段
            optionFilterProp="keyword"
            options={pool.map((item) => {
              const added = addedIds.has(String(item.id))
              const area = formatArea(item)
              return {
                value: item.id,
                label: (
                  <span className="institution-option">
                    {item.name}
                    {area && <em className="institution-option__area">（{area}）</em>}
                  </span>
                ),
                keyword: `${item.name} ${area}`.trim(),
                disabled: added,
              }
            })}
          />
        </div>
        <div className="institution-drawer__summary">
          已选择 {displayRows.length} 家参与机构 / 总承接 {totalCapacity} 人
        </div>
        <Table<ActivityInstitutionRow>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={displayRows}
          pagination={false}
        />
      </div>
    </Drawer>
  )
}
