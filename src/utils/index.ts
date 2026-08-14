/**
 * 通用工具函数
 */
import dayjs from 'dayjs'

/** 格式化日期时间 */
export function formatDateTime(
  value?: string | number | Date,
  format = 'YYYY-MM-DD HH:mm:ss',
) {
  if (!value) return '-'
  return dayjs(value).format(format)
}

/** 千分位数字格式化 */
export function formatNumber(value?: number | string, digits = 2) {
  const num = Number(value)
  if (Number.isNaN(num)) return '-'
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/** 金额格式化（保留两位） */
export function formatAmount(value?: number | string) {
  const num = Number(value)
  if (Number.isNaN(num)) return '-'
  return `¥${num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/** 触发浏览器下载 */
export function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
