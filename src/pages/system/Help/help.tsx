/**
 * 系统设置 - 帮助与电话配置
 * 视觉对齐设计稿：联系电话与分流规则 + 患者端帮助中心预览 + 常见问题表格
 * 后端接口未对接：页面以 Alert 提示、不展示业务数据；接口就绪后接入 systemApi.saveHelpConfig / getFaqList
 */
import { useMemo, useState } from 'react'
import { App, Button, Card, Input, Select } from 'antd'
import FillTable from '@/components/FillTable'
import type { ColumnsType } from 'antd/es/table'
import { CustomerServiceOutlined, PlusOutlined } from '@ant-design/icons'
import PageContainer from '@/components/PageContainer'
import ApiPendingAlert from '@/components/ApiPendingAlert'
import type { FaqItem } from '@/api/modules/system'
import './help.less'

const routeRules = [
  { scene: '机构/服务咨询', rule: '优先拨打当前机构电话', source: '来源：机构同步资料' },
  { scene: '退款及平台异常', rule: '统一拨打平台客服电话', source: '来源：本页平台电话' },
  { scene: 'AI 无法解答', rule: '有机构上下文则机构优先，否则平台兜底', source: '自动分流' },
]

export default function HelpConfig() {
  const { message } = App.useApp()
  const [phone, setPhone] = useState('')
  const [serviceTime, setServiceTime] = useState('')
  const [offTip, setOffTip] = useState('')
  /** 接口未对接：无 FAQ 数据，操作统一提示 */
  const [faqs] = useState<FaqItem[]>([])
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')

  /** 接口未对接：操作统一提示 */
  const notReady = () => {
    message.warning('接口未对接，功能暂未开放')
  }

  const filteredFaqs = useMemo(() => {
    return faqs.filter((item) => {
      const categoryHit = category === 'all' || item.category === category
      const statusHit =
        status === 'all' || (status === 'visible' ? item.visible : !item.visible)
      return categoryHit && statusHit
    })
  }, [category, faqs, status])

  const handleHide = () => {
    notReady()
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
            <Button type="link" size="small" onClick={notReady}>
              编辑
            </Button>
            <Button type="link" size="small" onClick={notReady}>
              预览
            </Button>
            {record.visible && (
              <Button type="link" size="small" onClick={handleHide}>
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
      fixed
      title="帮助与电话配置"
      description="维护平台客服电话、联系规则及患者端常见问题"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={notReady}>
          新建常见问题
        </Button>
      }
    >
      <div className="help-page">
        <ApiPendingAlert feature="帮助与电话配置" />
        <div className="help-page__top">
          <Card variant="borderless" className="help-card">
            <div className="help-card__header">
              <h3>联系电话与分流规则</h3>
              <Button
                type="link"
                size="small"
                onClick={notReady}
              >
                保存电话配置
              </Button>
            </div>
            <div className="form-grid form-grid--three">
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

        <Card variant="borderless" className="list-card list-card--fill">
          <div className="list-card__header">
            <div>
              <span className="list-card__header__title">常见问题</span>
              <span className="list-card__header__tips">共 {filteredFaqs.length} 条</span>
            </div>
            <div className="help-card__filters">
              <Select
                size="small"
                value={category}
                onChange={setCategory}
                options={[{ label: '全部分类', value: 'all' }]}
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
          <FillTable<FaqItem>
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
