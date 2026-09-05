/**
 * 系统设置 - 新建 / 编辑协议版本
 * 视觉对齐设计稿：协议基本信息 + 协议正文编辑器，右侧发布设置 + 患者端实时预览
 * 当前为 mock 数据，后端就绪后替换为 systemApi.saveAgreement
 */
import { App, Button, Card, Form, Input, Select, Space, Switch } from 'antd'
import { PlusOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import RichTextEditor from '@/components/RichTextEditor'
import AgreementPhone from './AgreementPhone'
import './agreement-edit.less'

/** 协议正文初始内容（富文本 HTML） */
const agreementHtml = `
<h2>隐私政策</h2>
<p>我们重视您的个人信息和健康数据安全。本政策说明我们如何收集、使用、存储、共享和保护您的信息，以及您可以如何行使相关权利。</p>
<h3>一、我们收集的信息</h3>
<ol>
  <li>账户与身份信息：手机号码、姓名、实名认证状态。</li>
  <li>服务信息：预约机构、服务项目、订单和退款记录。</li>
  <li>健康信息：仅在您明确授权后处理健康档案、评估和报告数据。</li>
</ol>
<h3>二、健康数据授权与撤回</h3>
<p>健康数据属于敏感个人信息。我们将在展示授权目的、范围和期限后单独征得您的同意。您可以在“设置与隐私”中撤回授权；撤回不影响此前基于授权完成的处理。</p>
`

export default function AgreementEdit() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const params = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()

  // 顶部「新建协议版本」：url=/edit/new 且无 action 参数 → 表单为空
  const isTopNew = !params.id || params.id === 'new'
  // 列表「编辑」带 action=edit；「新建版本」带 action=create
  const action = searchParams.get('action')
  // 标题：编辑协议版本 / 新建协议版本
  const title = action === 'edit' ? '编辑协议版本' : '新建协议版本'
  // 从列表进入（编辑/新建版本）时回填名称与类型
  const hasInitial = !isTopNew

  const [form] = Form.useForm()
  const name = Form.useWatch('name', form) ?? ''
  const version = hasInitial ? 'V1.4' : ''

  return (
    <PageContainer
      title={title}
      description="基于当前生效版本创建草稿，发布后按生效时间切换"
      extra={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => {
            navigate('/system/agreement')
          }}>返回协议与授权</Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={async () => {
              try {
                await form.validateFields()
              } catch {
                message.warning('请先完善必填项：协议类型、协议名称')
                return
              }
              message.success('协议版本已保存并发布，将按生效时间切换（mock）')
              // navigate('/system/agreement')
            }}
          >
            保存并发布
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={
          hasInitial
            ? {
                type: searchParams.get('type') ?? undefined,
                name: searchParams.get('name') ?? undefined,
                changeNote: undefined,
                effectiveTime: undefined,
                requireReConsent: undefined,
              }
            : {}
        }
      >
      <div className="agreement-edit">
        <div className="agreement-edit__form">
          <Card variant="borderless" className="edit-card" style={{height: 228}}>
            <div className="edit-card__header">
              <h3>协议基本信息</h3>
              <span className='header-label'>基于 V1.3 创建</span>
            </div>
            <div className="edit-field__row">
              <div className="edit-field">
                <Form.Item
                  name="type"
                  label={<span>协议类型</span>}
                  rules={[{ required: true, message: '请选择协议类型' }]}
                >
                  <Select
                    options={[
                      { label: '隐私政策', value: '隐私政策' },
                      { label: '用户服务协议', value: '用户服务协议' },
                      { label: '健康数据授权', value: '健康数据授权' },
                      { label: '家庭信息授权', value: '家庭信息授权' },
                    ]}
                  />
                </Form.Item>
              </div>
              <div className="edit-field">
                <Form.Item
                  name="name"
                  label={<span>协议名称</span>}
                  rules={[{ required: true, message: '请输入协议名称' }]}
                >
                  <Input />
                </Form.Item>
              </div>
              <div className="edit-field">
                <label>
                  新版本号
                </label>
                <Input value={version} disabled />
              </div>
            </div>
            <div className="edit-field">
              <Form.Item name="changeNote" label="版本变更说明">
                <Input
                  placeholder="简要说明本次版本变更内容，将记录在版本历史中"
                />
              </Form.Item>
            </div>
          </Card>

          <Card variant="borderless" className="edit-card RichTextEditor-card" style={{height: 593.75}}>
            <div className="edit-card__header">
              <h3>协议正文</h3>
              <span className='header-label'>支持标题、正文、列表和链接</span>
            </div>
            <div style={{flex: 1}}>
              <RichTextEditor value={agreementHtml} />
            </div>
          </Card>
        </div>

        <div className="agreement-edit__side">
          <Card variant="borderless" className="edit-card" style={{height: 228}}>
            <div className="edit-card__header">
              <h3>发布设置</h3>
            </div>
            <div className="publish-row">
              <span>生效时间</span>
              <Form.Item name="effectiveTime" noStyle>
                <Input style={{ width: 180 }} />
              </Form.Item>
            </div>
            <div className="publish-row">
              <span>生效后要求用户重新同意</span>
              <Form.Item name="requireReConsent" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </div>
            <p className="publish-note">仅重大范围变化时开启，避免频繁打断患者使用。</p>
            <div className="publish-actions">
              <Button onClick={() => message.success('草稿已保存（mock）')}>保存草稿</Button>
            </div>
          </Card>

          <Card variant="borderless" className="edit-card">
            <div className="edit-card__header">
              <h3>患者端实时预览</h3>
              <Button type="link" size="small" onClick={() => message.success('预览已刷新')}>
                刷新预览
              </Button>
            </div>
            <AgreementPhone
              name={name}
              type="隐私政策"
              version={version}
              effectiveDate="2026年8月15日"
            />
          </Card>
        </div>
      </div>
      </Form>
    </PageContainer>
  )
}
