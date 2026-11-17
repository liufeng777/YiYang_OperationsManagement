/**
 * 服务分类编辑 Drawer（新增 / 编辑共用）
 * - 受控组件：open / category / onClose / onSaved
 * - 对齐 ServiceCategory 数据结构：name / name_en / code / brief / brief_en / sort_order / status
 * - 提交通过 onSaved(col) 上抛，由调用方调用后端接口
 */
import { useEffect } from 'react'
import { Button, Drawer, Form, Input, Radio } from 'antd'
import type { ServiceCategory } from '@/api/modules/service'

export interface ServiceCategoryFill {
  name: string
  name_en?: string
  code?: string
  brief: string
  brief_en?: string
  status: number
}

interface ServiceCategoryEditorProps {
  open: boolean
  /** 编辑态：传入原分类；为空为新增 */
  category?: ServiceCategory | null
  onClose: () => void
  onSaved: (values: ServiceCategoryFill) => void
}

export default function ServiceCategoryEditor({
  open,
  category = null,
  onClose,
  onSaved,
}: ServiceCategoryEditorProps) {
  const isEdit = !!category
  const [form] = Form.useForm<ServiceCategoryFill>()

  useEffect(() => {
    if (!open) return
    if (category) {
      form.setFieldsValue({
        name: category.name,
        brief: category.brief || '',
        status: category.status,
        code: category.code || ''
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ status: 1 })
    }
  }, [open, category, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      onSaved({ ...values, name: values.name.trim()})
      form.resetFields()
      onClose()
    } catch {
      /* 校验失败由 Form.Item 就地提示 */
    }
  }

  return (
    <Drawer
      open={open}
      width={480}
      title={isEdit ? '编辑服务分类' : '新增服务分类'}
      onClose={onClose}
      destroyOnClose
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSubmit}>
            保存
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="名称"
          rules={[{ required: true, message: '请输入分类名称' }]}
        >
          <Input placeholder="例如：生活照护" />
        </Form.Item>
        <Form.Item name="brief" label="简介">
          <Input.TextArea rows={3} maxLength={120} showCount placeholder="一句话介绍该分类下服务" />
        </Form.Item>
        <Form.Item name="status" label="状态">
          <Radio.Group
            options={[
              { label: '启用', value: 1 },
              { label: '停用', value: 9 },
            ]}
          />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
