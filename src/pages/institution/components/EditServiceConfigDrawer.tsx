/**
 * 机构详情 - 编辑机构服务配置 Drawer
 * 仅调整当前机构的履约配置（服务范围 / 预约规则），集团基础信息保持只读
 * 线上服务范围仅「上门」服务展示；选择「继承机构默认配置」时表单项整体禁用
 * 当前为 mock 数据，后端就绪后由 onSave 对接保存接口
 */
import { useEffect } from 'react'
import { Alert, Button, Drawer, Form, Input, Radio } from 'antd'
import { CheckOutlined } from '@ant-design/icons'
import type { InstitutionService } from '@/api/modules/institution'
import './EditServiceConfigDrawer.less'

export interface EditServiceConfigValues {
  /** 配置方式：custom 单项调整 / inherit 继承机构默认配置 */
  configMode: 'custom' | 'inherit'
  /** 线上服务范围类型（仅上门服务） */
  rangeType: 'street' | 'fence'
  /** 已选街道 */
  streets?: string
  /** 电子围栏说明 */
  fence?: string
  /** 日容量 */
  dailyCapacity?: string
  /** 提前预约 */
  advanceBooking?: string
  /** 接单时段 */
  acceptHours?: string
  /** 取消规则 */
  cancelRule?: string
}

interface EditServiceConfigDrawerProps {
  open: boolean
  service: InstitutionService | null
  onClose: () => void
  onSave: (serviceId: string, values: EditServiceConfigValues) => void
}

export default function EditServiceConfigDrawer({
  open,
  service,
  onClose,
  onSave,
}: EditServiceConfigDrawerProps) {
  const [form] = Form.useForm<EditServiceConfigValues>()
  const configMode = Form.useWatch('configMode', form) ?? 'custom'
  const rangeType = Form.useWatch('rangeType', form) ?? 'street'
  const disabled = configMode === 'inherit'
  const isHomeService = service?.mode === '上门'

  // 打开时按服务当前配置来源回填
  useEffect(() => {
    if (!open || !service) return
    form.setFieldsValue({
      configMode: service.configSource === '单项调整' ? 'custom' : 'inherit',
      rangeType: 'street',
      streets: '申花街道、祥符街道',
      fence: '以机构地址为圆心 5 公里',
      dailyCapacity: '8 单 / 日',
      advanceBooking: '至少提前 2 小时',
      acceptHours: '08:00—18:00',
      cancelRule: '服务前 2 小时',
    })
  }, [open, service, form])

  const handleSave = async () => {
    if (!service) return
    const values = await form.validateFields()
    onSave(service.id, values)
  }

  return (
    <Drawer
      width={720}
      open={open}
      onClose={onClose}
      title={
        <div className="edit-config__title">
          <h3>编辑机构服务配置</h3>
          <p>仅调整当前机构的履约配置，集团服务基础信息不可修改</p>
        </div>
      }
      footer={
        service && (
          <div className="edit-config__footer">
            <span>当前服务：{service.name}</span>
            <div>
              <Button onClick={onClose}>取消</Button>
              <Button type="primary" icon={<CheckOutlined />} onClick={handleSave}>
                保存配置
              </Button>
            </div>
          </div>
        )
      }
    >
      {service && (
        <Form form={form} layout="vertical" requiredMark={false} className="edit-config">
          <div className="edit-config__service">
            <div>
              <strong>{service.name}</strong>
              <p>
                {service.code} · {service.category} · {service.mode}服务 · 集团定价 ¥{service.price}/次
              </p>
            </div>
            <span>集团统一维护，不可编辑</span>
          </div>

          <div className="edit-config__section">
            <Form.Item
              name="configMode"
              label="配置方式"
              rules={[{ required: true }]}
            >
              <Radio.Group
                options={[
                  { label: '单项调整', value: 'custom' },
                  { label: '继承机构默认配置', value: 'inherit' },
                ]}
              />
            </Form.Item>
            <p className="edit-config__hint">
              选择继承后，以下配置随机构默认值更新；单项调整仅影响当前服务。
            </p>
          </div>

          {isHomeService && (
            <div className="edit-config__section">
              <div className="edit-config__section-title">
                线上服务范围
                <span>仅上门服务显示</span>
              </div>
              <Form.Item name="rangeType" className="edit-config__range-type">
                <Radio.Group
                  disabled={disabled}
                  optionType="button"
                  buttonStyle="solid"
                  options={[
                    { label: '按街道', value: 'street' },
                    { label: '电子围栏', value: 'fence' },
                  ]}
                />
              </Form.Item>
              <div className="edit-config__grid">
                <Form.Item name="streets" label="已选街道">
                  <Input disabled={disabled || rangeType === 'fence'} placeholder="选择街道" />
                </Form.Item>
                <Form.Item name="fence" label="电子围栏（未选择）">
                  <Input disabled={disabled || rangeType === 'street'} />
                </Form.Item>
              </div>
            </div>
          )}

          <div className="edit-config__section">
            <div className="edit-config__section-title">
              预约与履约规则
              <span>当前服务单项调整；保存后不影响其他服务</span>
            </div>
            <div className="edit-config__grid edit-config__grid--four">
              <Form.Item name="dailyCapacity" label="日容量">
                <Input disabled={disabled} />
              </Form.Item>
              <Form.Item name="advanceBooking" label="提前预约">
                <Input disabled={disabled} />
              </Form.Item>
              <Form.Item name="acceptHours" label="接单时段">
                <Input disabled={disabled} />
              </Form.Item>
              <Form.Item name="cancelRule" label="取消规则">
                <Input disabled={disabled} />
              </Form.Item>
            </div>
          </div>

          <Alert
            type="info"
            showIcon
            className="edit-config__alert"
            message="集团字段保持只读"
            description="服务名称、方式、价格、耗材和套餐由集团统一维护；上架/下架请前往“机构服务上架管理”。"
          />
        </Form>
      )}
    </Drawer>
  )
}
