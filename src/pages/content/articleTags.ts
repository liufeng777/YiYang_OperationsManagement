/** 将接口返回的标签安全转换为数组，兼容 JSON 字符串与已解析数组。 */
export function parseArticleTags(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === 'string')
  }
  if (!value?.trim()) return []

  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((tag): tag is string => typeof tag === 'string')
  } catch {
    return []
  }
}
