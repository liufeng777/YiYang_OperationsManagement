/**
 * 机构详情 - 基础资料 Tab
 * 机构信息由平台直接维护，本页可编辑基础信息
 * 数据来源：institutionApi.updateInstitution
 * 注意：后端 PUT 为全量覆盖，表单未包含的字段（brief/description/cover_url/status）需原值回传
 * 注：父级通过 key={detail.id} 重挂载本组件以切换机构时重置表单
 */
import { useState } from 'react'
import { App, Button, Card, Form } from 'antd'
import { CheckOutlined } from '@ant-design/icons'
import { institutionApi } from '@/api'
import type { InstitutionItem, InstitutionType } from '@/api/modules/institution'
import InstitutionBaseFields from './InstitutionBaseFields'

interface BaseInfoTabProps {
  detail: InstitutionItem
  /** 保存成功后的回调（父级重新拉取详情） */
  onSaved?: () => void
}

interface BaseInfoValues {
  name: string
  name_en?: string
  type: InstitutionType
  region: string[]
  address: string
  contact_phone: string
  manager_name?: string
  manager_phone?: string
  service_radius_km?: number
}

export default function BaseInfoTab({ detail, onSaved }: BaseInfoTabProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm<BaseInfoValues>()
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    let values: BaseInfoValues
    try {
      values = await form.validateFields()
    } catch {
      message.warning('请先完善必填项')
      return
    }
    const [province = '', city = '', district = ''] = values.region ?? []
    setSaving(true)
    try {
      await institutionApi.updateInstitution(detail.id, {
        name: values.name,
        name_en: values.name_en ?? '',
        type: values.type,
        province,
        city,
        district,
        address: values.address,
        contact_phone: values.contact_phone,
        manager_name: values.manager_name ?? '',
        manager_phone: values.manager_phone ?? '',
        service_radius_km: values.service_radius_km ?? null,
        // 以下字段不在本表单中，PUT 全量覆盖需原值回传，避免被清空
        brief: detail.brief,
        description: detail.description,
        cover_url: detail.cover_url,
        status: detail.status,
      })
      message.success('基础资料已保存')
      onSaved?.()
    } catch {
      /* 错误提示由 request 拦截器统一处理 */
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card variant="borderless" className="detail-card">
      <div className="detail-card__header">
        <div>
          <h3>基础资料</h3>
          <p>机构基础信息由平台直接维护，修改后实时生效</p>
        </div>
        <Button type="primary" icon={<CheckOutlined />} loading={saving} onClick={handleSave}>
          保存修改
        </Button>
      </div>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: detail.name,
          name_en: detail.name_en ?? undefined,
          type: detail.type,
          region: [detail.province, detail.city, detail.district],
          address: detail.address,
          contact_phone: detail.contact_phone,
          manager_name: detail.manager_name,
          manager_phone: detail.manager_phone,
          service_radius_km: detail.service_radius_km ?? undefined,
        }}
      >
        <InstitutionBaseFields />
      </Form>
    </Card>
  )
}
