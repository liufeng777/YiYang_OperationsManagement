/**
 * 注册会员模块共享枚举文案
 * 实名状态见 member.ts §4.1：1-未实名 2-已实名 9-禁用
 */
import type { MemberDTO, MemberTagBrief } from '@/api/modules/member'
import type { tagItem } from '@/api/modules/tag'

/** 实名状态文案 */
export const MEMBER_STATUS_TEXT: Record<number, string> = {
  1: '未实名',
  2: '已实名',
  9: '禁用',
}

/** 实名状态 → Tag 颜色 */
export const MEMBER_STATUS_TAG_COLOR: Record<number, string> = {
  1: 'warning',
  2: 'success',
  9: 'cancel',
}

/** 性别文案：1-男 2-女 */
export const GENDER_TEXT: Record<number, string> = {
  1: '男',
  2: '女',
}

/** 会员标签原始形态：契约为 MemberTagBrief[]（无颜色）；实测可能为 tag_ids 数组 */
type RawMemberTag = number | MemberTagBrief

/**
 * 解析会员标签：兼容 tags（对象数组 / id 数组）与 tag_ids 两种返回，
 * 优先从标签字典取 tag_name / tag_color 渲染
 */
export function resolveMemberTags(record: MemberDTO, tagMap: Map<number, tagItem>) {
  const raw = (record.tags ??
    (record as unknown as { tag_ids?: RawMemberTag[] }).tag_ids ??
    []) as unknown as RawMemberTag[]
  return raw.map((tag) => {
    const id = typeof tag === 'number' ? tag : tag.id
    const dict = tagMap.get(id)
    return {
      id,
      name: dict?.tag_name ?? (typeof tag === 'number' ? `#${id}` : tag.tag_name),
      color: dict?.tag_color || undefined,
    }
  })
}
