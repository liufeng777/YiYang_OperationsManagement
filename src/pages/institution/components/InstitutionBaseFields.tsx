/**
 * 机构基础信息表单字段（新增机构 / 机构详情-基础资料 共用）
 * 仅提供 Form.Item 字段组，外层自行提供 <Form>、initialValues 与提交按钮
 * 字段与 institutionApi 的 InstitutionItem 一一对应：
 * name / name_en / type / province+city+district（region 级联，提交时拆分）/
 * address / contact_phone / manager_name / manager_phone / service_radius_km /
 * daily_max_work_orders / daily_time_range（daily_open_second ~ daily_close_second）/ 
 * min_lead_time_min / max_cancel_interval_min
 */
import { Form, Input, InputNumber, Select, TimePicker } from 'antd'
import type { InstitutionType } from '@/api/modules/institution'
import RegionCascader from '@/components/RegionCascader'
import './institution-form.less'

/** 机构类型选项（1-护理院 2-驿站） */
export const institutionTypeOptions: { label: string; value: InstitutionType }[] = [
  { label: '护理院', value: 1 },
  { label: '驿站', value: 2 },
]

export default function InstitutionBaseFields() {
  return (
    <div className="institution-form">
      <div className="form-grid form-grid--three">
        <Form.Item
          name="name"
          label={<span>机构名称</span>}
          rules={[{ required: true, message: '请输入机构名称' }]}
        >
          <Input maxLength={32} placeholder="例如：幸福里健康驿站" />
        </Form.Item>
        <Form.Item
          name="type"
          label={<span>机构类型</span>}
          rules={[{ required: true, message: '请选择机构类型' }]}
        >
          <Select placeholder="请选择机构类型" options={institutionTypeOptions} />
        </Form.Item>
        <Form.Item
          name="contact_phone"
          label={<span>联系电话</span>}
          rules={[{ required: true, message: '请输入联系电话' }]}
        >
          <Input maxLength={20} placeholder="患者咨询使用的联系电话" />
        </Form.Item>
      </div>
      <div className="form-grid form-grid--three">
        <Form.Item
          name="region"
          label={<span>所在地区</span>}
          rules={[{ required: true, message: '请选择省 / 市 / 区' }]}
        >
          <RegionCascader />
        </Form.Item>
        <Form.Item
          name="address"
          label={<span>详细地址</span>}
          rules={[{ required: true, message: '请输入详细地址' }]}
        >
          <Input maxLength={64} placeholder="街道、路名与门牌号" />
        </Form.Item>
        <Form.Item
          name="service_radius_km"
          label="服务半径（公里）"
          tooltip="上门服务覆盖半径，留空表示不限"
        >
          <InputNumber min={1} max={50} precision={1} style={{ width: '100%' }} placeholder="留空表示不限" />
        </Form.Item>
      </div>
      <div className="form-grid form-grid--three">
        <Form.Item
          name="daily_max_work_orders"
          label="日容量"
          tooltip="每日可预约（接单）的工单数量上限，留空使用系统默认 16"
        >
          <InputNumber
            min={0}
            max={999}
            precision={0}
            style={{ width: '100%' }}
            placeholder="默认 16 单/天"
          />
        </Form.Item>
        <Form.Item
          name="daily_time_range"
          label="接单时段"
          tooltip="每日可预约的起止时间，留空使用系统默认 08:00 ~ 18:00"
          rules={[
            {
              validator: (_, value?: [unknown, unknown] | null) => {
                if (!value?.[0] || !value?.[1]) return Promise.resolve()
                const start = value[0] as { hour: () => number; minute: () => number }
                const end = value[1] as { hour: () => number; minute: () => number }
                const startMinutes = start.hour() * 60 + start.minute()
                const endMinutes = end.hour() * 60 + end.minute()
                if (endMinutes <= startMinutes) {
                  return Promise.reject(new Error('接单结束时间需晚于开始时间'))
                }
                return Promise.resolve()
              },
            },
          ]}
        >
          <TimePicker.RangePicker format="HH:mm" style={{ width: '100%' }} placeholder={['开始', '结束']} />
        </Form.Item>
        <Form.Item
          name="min_lead_time_min"
          label="预约至少提前（分钟）"
          tooltip="患者预约服务工单时，至少需提前多少分钟，留空使用系统默认 180"
        >
          <InputNumber
            min={0}
            max={10080}
            precision={0}
            style={{ width: '100%' }}
            placeholder="默认 180 分钟"
          />
        </Form.Item>
      </div>
      <div className="form-grid form-grid--three">
        <Form.Item
          name="max_cancel_interval_min"
          label="取消规则（服务前，分钟）"
          tooltip="服务开始前多少分钟内不再允许取消，留空使用系统默认 180"
        >
          <InputNumber
            min={0}
            max={10080}
            precision={0}
            style={{ width: '100%' }}
            placeholder="默认 180 分钟"
          />
        </Form.Item>
        <Form.Item
          name="manager_name"
          label={<span>管理员姓名</span>}
        >
          <Input maxLength={16} placeholder="机构管理员姓名" />
        </Form.Item>
        <Form.Item
          name="manager_phone"
          label={<span>管理员手机号</span>}
          rules={[
            { pattern: /^1\d{10}$/, message: '请输入 11 位手机号' },
          ]}
        >
          <Input maxLength={11} placeholder="用于接收机构运营通知" />
        </Form.Item>
      </div>
    </div>
  )
}
