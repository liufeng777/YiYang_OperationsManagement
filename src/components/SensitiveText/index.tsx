/**
 * 用户敏感信息统一脱敏展示。
 * - 姓名：保留首个字符，其余以 * 代替
 * - 手机号：保留前 3 位、后 4 位
 * - 身份证：保留前 3 位、后 4 位
 * - 地址：默认仅显示到区 / 县；详细地址仅允许在履约等明确场景展开
 */
import { useEffect, useMemo, useState } from 'react'
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'
import './index.less'

export type SensitiveTextType = 'name' | 'phone' | 'idCard' | 'address'

export interface SensitiveTextProps {
  type: SensitiveTextType
  value?: string | number | null
  /** 是否允许查看明文；地址默认 false，其余类型默认 true */
  allowReveal?: boolean
  /** 地址的省市区，传入后可避免从完整地址中推断行政区 */
  region?: Array<string | null | undefined> | string
  className?: string
  placeholder?: string
}

const EMPTY_TEXT = '—'

/** 保留中间长度，避免把已脱敏数据再次压缩成固定数量的星号。 */
const maskMiddle = (value: string, prefixLength: number, suffixLength: number) => {
  const chars = Array.from(value)
  if (chars.length <= prefixLength + suffixLength) return '*'.repeat(chars.length)
  return `${chars.slice(0, prefixLength).join('')}${'*'.repeat(
    chars.length - prefixLength - suffixLength,
  )}${chars.slice(-suffixLength).join('')}`
}

export const maskName = (value: string) => {
  const chars = Array.from(value)
  return chars.length > 1 ? `${chars[0]}${'*'.repeat(chars.length - 1)}` : value
}

export const maskPhone = (value: string) => maskMiddle(value, 3, 4)

export const maskIdCard = (value: string) => maskMiddle(value, 3, 4)

/** 从完整地址截取到首个区 / 县 / 旗，忽略“自治区”中的“区”。 */
const addressToDistrict = (value: string) => {
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    if (char === '区' && value.slice(Math.max(0, index - 2), index + 1) === '自治区') continue
    if (char === '区' || char === '县' || char === '旗') return value.slice(0, index + 1)
  }

  // 无法识别区县时不能回显街道门牌，仅保留可识别的上级行政区。
  const parentRegion = value.match(/^.*?(?:省|市|自治州|地区|盟)/)?.[0]
  return parentRegion ? `${parentRegion}***` : '***'
}

export const maskAddress = (
  value: string,
  region?: SensitiveTextProps['region'],
) => {
  const regionText = Array.isArray(region)
    ? region.filter((item): item is string => Boolean(item?.trim())).join('')
    : region?.trim()
  return regionText || addressToDistrict(value)
}

export const maskSensitiveText = (
  type: SensitiveTextType,
  value: string,
  region?: SensitiveTextProps['region'],
) => {
  switch (type) {
    case 'name':
      return maskName(value)
    case 'phone':
      return maskPhone(value)
    case 'idCard':
      return maskIdCard(value)
    case 'address':
      return maskAddress(value, region)
  }
}

const FIELD_TEXT: Record<SensitiveTextType, string> = {
  name: '姓名',
  phone: '手机号',
  idCard: '身份证号',
  address: '详细地址',
}

export default function SensitiveText({
  type,
  value,
  allowReveal,
  region,
  className = '',
  placeholder = EMPTY_TEXT,
}: SensitiveTextProps) {
  const [visible, setVisible] = useState(false)
  const text = value == null ? '' : String(value).trim()
  /**
   * 是否提供「查看明文」入口：默认不提供（列表等场景只展示掩码），
   * 详情页等确需查看明文的场景显式传 allowReveal。
   */
  const canReveal = allowReveal ?? false
  const maskedText = useMemo(
    () => (text ? maskSensitiveText(type, text, region) : placeholder),
    [type, text, region, placeholder],
  )

  // 切换记录后立即恢复掩码，避免上一条记录的明文状态残留。
  useEffect(() => {
    setVisible(false)
  }, [text, type, allowReveal])

  if (!text) return <span className={className}>{placeholder}</span>

  /** 不允许查看明文：仅展示掩码文本，不渲染眼睛按钮 */
  if (!canReveal) return <span className={className}>{maskedText}</span>

  const actionText = visible ? `隐藏${FIELD_TEXT[type]}` : `查看${FIELD_TEXT[type]}`

  return (
    <span className={`sensitive-text ${className}`.trim()}>
      <span className="sensitive-text__value">{visible ? text : maskedText}</span>
      <Tooltip title={actionText}>
        <Button
          className="sensitive-text__button"
          type="text"
          size="small"
          aria-label={actionText}
          aria-pressed={visible}
          icon={visible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          onClick={() => setVisible((current) => !current)}
        />
      </Tooltip>
    </span>
  )
}
