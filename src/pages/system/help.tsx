/**
 * 系统设置 - 帮助与电话配置
 * 视觉对齐设计稿：联系电话与分流规则 + 患者端帮助中心预览 + 常见问题表格
 * 当前为 mock 数据，后端就绪后替换为 systemApi.saveHelpConfig / getFaqList
 */
import { useMemo, useState } from 'react'
import { App, Button, Card, Input, Select, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { CustomerServiceOutlined, PlusOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import SystemTabs from '@/pages/system/components/SystemTabs'
import type { FaqItem } from '@/api/modules/system'
import './help.less'

const routeRules = [
  { scene: '机构/服务咨询', rule: '优先拨打当前机构电话', source: '来源：机构同步资料' },
  { scene: '退款及平台异常', rule: '统一拨打平台客服电话', source: '来源：本页平台电话' },
  { scene: 'AI 无法解答', rule: '有机构上下文则机构优先，否则平台兜底', source: '自动分流' },
]

const initialFaqs: FaqItem[] = [
  {
    id: '1',
    question: '如何预约护理服务？',
    category: '服务预约',
    visible: true,
    sort: 1,
    updatedAt: '2026-08-10 14:20',
  },
  {
    id: '2',
    question: '订单取消后如何申请整单退款？',
    category: '订单退款',
    visible: true,
    sort: 2,
    updatedAt: '2026-08-09 16:35',
  },
  {
    id: '3',
    question: '怎样为家人预约服务？',
    category: '家庭协助',
    visible: true,
    sort: 3,
    updatedAt: '2026-08-08 11:10',
  },
]

export default function HelpConfig() {
  const { message } = App.useApp()
  const [phone, setPhone] = useState('400-688-6688')
  const [serviceTime, setServiceTime] = useState('每日 08:00–20:00')
  const [offTip, setOffTip] = useState('请留下联系方式，客服将在服务时间回电')
  const [faqs, setFaqs] = useState(initialFaqs)
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')

  const filteredFaqs = useMemo(() => {
    return faqs.filter((item) => {
      const categoryHit = category === 'all' || item.category === category
      const statusHit =
        status === 'all' || (status === 'visible' ? item.visible : !item.visible)
      return categoryHit && statusHit
    })
  }, [category, faqs, status])

  const handleHide = (record: FaqItem) => {
    setFaqs((prev) =>
      prev.map((item) => (item.id === record.id ? { ...item, visible: false } : item)),
    )
    message.success(`「${record.question}」已隐藏（mock）`)
  }

  const columns = useMemo<ColumnsType<FaqItem>>(
    () => [
      {
        title: '问题标题',
        dataIndex: 'question',
        key: 'question',
        render: (value: string) => <strong className="faq-question">{value}</strong>,
      },
      { title: '分类', dataIndex: 'category', key: 'category', width: 120 },
      {
        title: '患者端展示',
        dataIndex: 'visible',
        key: 'visible',
        width: 110,
        render: (value: boolean) => (
          <span className={`faq-visible${value ? ' is-on' : ''}`}>{value ? '展示中' : '已隐藏'}</span>
        ),
      },
      { title: '排序', dataIndex: 'sort', key: 'sort', width: 70 },
      { title: '最近更新', dataIndex: 'updatedAt', key: 'updatedAt', width: 160 },
      {
        title: '操作',
        key: 'action',
        width: 170,
        render: (_, record) => (
          <div className="faq-actions">
            <Button type="link" size="small" onClick={() => message.info('编辑问题开发中')}>
              编辑
            </Button>
            <Button type="link" size="small" onClick={() => message.info(`预览：${record.question}`)}>
              预览
            </Button>
            {record.visible && (
              <Button type="link" size="small" onClick={() => handleHide(record)}>
                隐藏
              </Button>
            )}
          </div>
        ),
      },
    ],
    [message],
  )

  return (
    <PageContainer
      title="帮助与电话配置"
      description="维护平台客服电话、联系规则及患者端常见问题"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => message.info('新建常见问题开发中')}>
          新建常见问题
        </Button>
      }
    >
      <div className="help-page">
        <SystemTabs />

        <div className="help-page__top">
          <Card variant="borderless" className="help-card">
            <div className="help-card__header">
              <h3>联系电话与分流规则</h3>
              <Button
                type="link"
                size="small"
                onClick={() => message.success('电话配置已保存（mock）')}
              >
                保存电话配置
              </Button>
            </div>
            <div className="help-card__fields">
              <div className="help-field">
                <label>平台客服电话</label>
                <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
              </div>
              <div className="help-field">
                <label>人工服务时间</label>
                <Input value={serviceTime} onChange={(event) => setServiceTime(event.target.value)} />
              </div>
              <div className="help-field">
                <label>非服务时段提示</label>
                <Input value={offTip} onChange={(event) => setOffTip(event.target.value)} />
              </div>
            </div>
            <div className="help-card__rules">
              <label>患者端联系规则</label>
              {routeRules.map((rule) => (
                <div className="rule-row" key={rule.scene}>
                  <strong>{rule.scene}</strong>
                  <span>{rule.rule}</span>
                  <em>{rule.source}</em>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="borderless" className="help-card help-card--preview">
            <div className="help-card__header">
              <h3>患者端帮助中心预览</h3>
            </div>
            <div className="help-phone">
              <div className="help-phone__nav">
                <strong>帮助与客服</strong>
                <span>•••</span>
              </div>
              <div className="help-phone__phone">
                <i>
                  <CustomerServiceOutlined />
                </i>
                <div>
                  <strong>平台客服电话 {phone}</strong>
                  <span>人工服务时间：{serviceTime}</span>
                </div>
              </div>
              <div className="help-phone__faq">
                <span>常见问题</span>
                {faqs
                  .filter((item) => item.visible)
                  .slice(0, 2)
                  .map((item) => (
                    <div key={item.id}>
                      <p>{item.question}</p>
                      <em>›</em>
                    </div>
                  ))}
              </div>
              <button type="button" className="help-phone__cta">
                联系人工客服
              </button>
            </div>
          </Card>
        </div>

        <Card variant="borderless" className="list-card">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">常见问题</span>
              <span className="list-card__header__tips">共 12 条 · 患者端展示 10 条</span>
            </div>
            <div className="help-card__filters">
              <Select
                size="small"
                value={category}
                onChange={setCategory}
                options={[
                  { label: '全部分类', value: 'all' },
                  { label: '服务预约', value: '服务预约' },
                  { label: '订单退款', value: '订单退款' },
                  { label: '家庭协助', value: '家庭协助' },
                ]}
              />
              <Select
                size="small"
                value={status}
                onChange={setStatus}
                options={[
                  { label: '全部状态', value: 'all' },
                  { label: '展示中', value: 'visible' },
                  { label: '已隐藏', value: 'hidden' },
                ]}
              />
            </div>
          </div>
          <Table<FaqItem>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={filteredFaqs}
            pagination={false}
          />
        </Card>
      </div>
    </PageContainer>
  )
}
