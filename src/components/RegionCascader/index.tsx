import { Cascader } from 'antd'
import type { CascaderProps } from 'antd'
import pcaData from 'china-division/dist/pca.json'
import hmtData from 'china-division/dist/HK-MO-TW.json'

/** 全国省市区原始数据：省 -> 市 -> 区县 */
type ChinaDivisionData = Record<string, Record<string, string[]>>

export type RegionValue = string[]

interface RegionOption {
  value: string
  label: string
  children?: RegionOption[]
}

export interface RegionCascaderProps
  extends Omit<CascaderProps, 'options' | 'value' | 'onChange' | 'multiple'> {
  value?: RegionValue
  onChange?: (value: RegionValue) => void
}

const divisionData: ChinaDivisionData = {
  ...(pcaData as ChinaDivisionData),
  ...(hmtData as ChinaDivisionData),
}

// 直辖市历史数据的 city 字段通常与 province 相同，沿用该值以兼容编辑回显和接口契约。
const municipalities = new Set(['北京市', '天津市', '上海市', '重庆市'])

/** 全国省市区三级选项，value 使用名称，与现有机构接口保持一致。 */
export const regionOptions: RegionOption[] = Object.entries(divisionData).map(
  ([province, cities]) => ({
    value: province,
    label: province,
    children: Object.entries(cities).map(([city, districts]) => ({
      value: municipalities.has(province) && city === '市辖区' ? province : city,
      label: city,
      children: districts.map((district) => ({ value: district, label: district })),
    })),
  }),
)

/** 全国省市区三级联动选择器，可直接作为 antd Form.Item 的受控子组件。 */
export default function RegionCascader({
  value,
  onChange,
  placeholder = '请选择省 / 市 / 区',
  showSearch = true,
  style,
  ...rest
}: RegionCascaderProps) {
  return (
    <Cascader
      {...rest}
      options={regionOptions}
      value={value}
      onChange={(nextValue) => onChange?.((nextValue ?? []) as RegionValue)}
      placeholder={placeholder}
      showSearch={showSearch}
      style={{ width: '100%', ...style }}
    />
  )
}
