/**
 * 机构详情 - 基础资料 Tab
 * 机构信息由平台直接维护，本页可编辑基础信息
 * 当前为 mock 数据，后端就绪后替换为 institutionApi.updateInstitution
 * 注：父级通过 key={detail.id} 重挂载本组件以切换机构时重置表单
 */
import { App, Button, Card, Form } from 'antd'
import { CheckOutlined } from '@ant-design/icons'
import type { InstitutionItem } from '@/api/modules/institution'
import InstitutionBaseFields from './InstitutionBaseFields'

interface BaseInfoTabProps {
  detail: InstitutionItem
}

export default function BaseInfoTab({ detail }: BaseInfoTabProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm()

  const handleSave = async () => {
    const values = await form.validateFields()
    // TODO 接后端：const [province, city, district] = values.region，拆分后调用 updateInstitution
    void values
    message.success('基础资料已保存')
  }

  return (
    <Card variant="borderless" className="detail-card">
      <div className="detail-card__header">
        <div>
          <h3>基础资料</h3>
          <p>机构基础信息由平台直接维护，修改后实时生效</p>
        </div>
        <Button type="primary" icon={<CheckOutlined />} onClick={handleSave}>
          保存修改
        </Button>
      </div>
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
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
