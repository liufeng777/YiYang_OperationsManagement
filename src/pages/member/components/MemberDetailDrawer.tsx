/**
 * 注册会员 - 会员详情 Drawer
 * 数据来源：memberApi.getMember(id)（§4.1，含地址、标签、关系、风险等级；当前 DTO 返回基础档案 + 标签）
 * 机构 / 标签名称：由列表页传入 institutionMap / tagMap 匹配（institution_id → 机构名，tag_id → tag_name/tag_color）
 * 证件号：默认中间 * 掩码，点击眼睛图标切换显示完整证件号
 */
import { useEffect, useState } from 'react'
import { Button, Descriptions, Drawer, Spin, Tag } from 'antd'
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { memberApi } from '@/api'
import type { MemberDTO } from '@/api/modules/member'
import type { tagItem } from '@/api/modules/tag'
import { GENDER_TEXT, MEMBER_STATUS_TAG_COLOR, MEMBER_STATUS_TEXT, resolveMemberTags } from '../constants'

interface MemberDetailDrawerProps {
  /** 会员 ID；为 null 时不发起请求 */
  memberId: number | null
  open: boolean
  onClose: () => void
  /** 机构字典：institution_id → 机构名称 */
  institutionMap: Map<number, string>
  /** 标签字典：tag_id → 标签（tag_name / tag_color） */
  tagMap: Map<number, tagItem>
}

/** 生日格式化：ISO（如 1938-06-25T00:00:00+08:00）→ yyyy-MM-dd；非法值回显原始值 */
const formatBirthday = (value?: string) => {
  if (!value) return '—'
  const date = dayjs(value)
  return date.isValid() ? date.format('YYYY-MM-DD') : value
}

/** 证件号中间掩码：保留首尾各 4 位（短号按比例保留），中间以 * 替代 */
const maskIdCard = (value?: string) => {
  if (!value) return '—'
  const keep = value.length > 10 ? 4 : Math.max(Math.floor(value.length / 4), 1)
  if (value.length <= keep * 2) return '*'.repeat(value.length)
  return `${value.slice(0, keep)}${'*'.repeat(value.length - keep * 2)}${value.slice(-keep)}`
}

export default function MemberDetailDrawer({
  memberId,
  open,
  onClose,
  institutionMap,
  tagMap,
}: MemberDetailDrawerProps) {
  const [detail, setDetail] = useState<MemberDTO | null>(null)
  const [loading, setLoading] = useState(false)
  /** 证件号明文开关（默认掩码） */
  const [idCardVisible, setIdCardVisible] = useState(false)

  useEffect(() => {
    if (!open || !memberId) return
    // 每次打开新会员时重置为掩码状态，避免残留上一个会员的明文
    setIdCardVisible(false)
    setLoading(true)
    memberApi
      .getMember(memberId)
      .then(setDetail)
      .catch(() => {
        /* 错误提示由 request 拦截器统一处理 */
        setDetail(null)
      })
      .finally(() => setLoading(false))
  }, [open, memberId])

  const tags = detail ? resolveMemberTags(detail, tagMap) : []

  return (
    <Drawer title="会员详情" width={480} open={open} onClose={onClose} destroyOnHidden>
      <Spin spinning={loading}>
        <Descriptions
          column={1}
          size="small"
          bordered
          items={[
            { key: 'name', label: '姓名', children: detail?.name || '—' },
            {
              key: 'gender',
              label: '性别',
              children: detail ? (GENDER_TEXT[detail.gender] ?? '—') : '—',
            },
            { key: 'birthday', label: '出生日期', children: formatBirthday(detail?.birthday) },
            { key: 'phone', label: '手机号', children: detail?.phone || '—' },
            {
              key: 'id_card',
              label: '证件号',
              children: detail?.id_card ? (
                <span className="id-card-field">
                  {idCardVisible ? detail.id_card : maskIdCard(detail.id_card)}
                  <Button
                    type="text"
                    size="small"
                    icon={idCardVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    onClick={() => setIdCardVisible((visible) => !visible)}
                  />
                </span>
              ) : (
                '—'
              ),
            },
            {
              key: 'institution_id',
              label: '所属机构',
              children: detail?.institution_id
                ? (institutionMap.get(detail.institution_id) ?? `#${detail.institution_id}`)
                : '—',
            },
            { key: 'level', label: '会员等级', children: detail?.level || '—' },
            {
              key: 'status',
              label: '实名状态',
              children: detail ? (
                <span className={`status-btn status--${MEMBER_STATUS_TAG_COLOR[detail.status]}`}>
                  {MEMBER_STATUS_TEXT[detail.status] ?? detail.status}
                </span>
              ) : (
                '—'
              ),
            },
            {
              key: 'tags',
              label: '标签',
              children: tags.length ? (
                <>
                  {tags.map((tag) => (
                    <Tag key={tag.id} color={tag.color}>
                      {tag.name}
                    </Tag>
                  ))}
                </>
              ) : (
                '—'
              ),
            },
          ]}
        />
      </Spin>
    </Drawer>
  )
}
