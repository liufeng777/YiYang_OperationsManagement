/**
 * 系统设置 - 新建 / 编辑协议版本
 * 视觉对齐设计稿：协议基本信息 + 协议正文编辑器，右侧发布设置 + 患者端实时预览
 * 当前为 mock 数据，后端就绪后替换为 systemApi.saveAgreement
 */
import { App, Button, Card, Form, Input, Select, Switch } from 'antd'
import {
  BoldOutlined,
  ItalicOutlined,
  LinkOutlined,
  MenuOutlined,
  OrderedListOutlined,
  PlusOutlined,
  RedoOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '@/components/PageContainer'
import './agreement-edit.less'

export default function AgreementEdit() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const params = useParams<{ id: string }>()
  const isNew = !params.id || params.id === 'new'

  const [form] = Form.useForm()
  const name = Form.useWatch('name', form) ?? ''
  const version = 'V1.4'

  return (
    <PageContainer
      title={isNew ? '新建协议版本' : '编辑协议版本'}
      description="基于当前生效版本创建草稿，发布后按生效时间切换"
      extra={
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
            navigate('/system/agreement')
          }}
        >
          保存并发布
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          type: '隐私政策',
          name: '幸福颐养隐私政策',
          changeNote: '补充健康数据使用范围及授权撤回说明',
          effectiveTime: '2026-08-15 00:00',
          requireReConsent: true,
        }}
      >
      <div className="agreement-edit">
        <div className="agreement-edit__form">
          <Card variant="borderless" className="edit-card">
            <div className="edit-card__header">
              <h3>协议基本信息</h3>
              <span>基于 V1.3 创建</span>
            </div>
            <div className="edit-field__row">
              <div className="edit-field">
                <Form.Item
                  name="type"
                  label={<span>协议类型 <i>*</i></span>}
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
                  label={<span>协议名称 <i>*</i></span>}
                  rules={[{ required: true, message: '请输入协议名称' }]}
                >
                  <Input />
                </Form.Item>
              </div>
              <div className="edit-field">
                <label>
                  新版本号 <i>*</i>
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

          <Card variant="borderless" className="edit-card">
            <div className="edit-card__header">
              <h3>协议正文</h3>
              <span>支持标题、正文、列表和链接</span>
            </div>
            <div className="editor-toolbar">
              <Button size="small" type="text">正文</Button>
              <Button size="small" type="text" icon={<BoldOutlined />} />
              <Button size="small" type="text">H2</Button>
              <Button size="small" type="text" icon={<MenuOutlined />} />
              <Button size="small" type="text" icon={<OrderedListOutlined />} />
              <Button size="small" type="text" icon={<LinkOutlined />} />
              <Button size="small" type="text" icon={<ItalicOutlined />} />
              <Button size="small" type="text" icon={<UndoOutlined />} />
              <Button size="small" type="text" icon={<RedoOutlined />} />
            </div>
            <div className="editor-body">
              <h4>{name}</h4>
              <p className="editor-meta">更新日期：2026年8月10日　生效日期：2026年8月15日</p>
              <p>
                幸福颐养运营方（以下简称“我们”）重视您的个人信息和健康数据安全。本政策说明我们如何收集、使用、存储、共享和保护您的信息，以及您可以如何行使相关权利。
              </p>
              <h5>一、我们收集的信息</h5>
              <ol>
                <li>账户与身份信息：手机号码、姓名、实名认证状态。</li>
                <li>服务信息：预约机构、服务项目、订单和退款记录。</li>
                <li>健康信息：仅在您明确授权后处理健康档案、评估和报告数据。</li>
              </ol>
              <h5>二、健康数据授权与撤回</h5>
              <p>
                健康数据属于敏感个人信息。我们将在展示授权目的、范围和期限后单独征得您的同意。您可以在“设置与隐私”中撤回授权；撤回不影响此前基于授权完成的处理。
              </p>
              <div className="editor-tip">
                法务提示：发布前请确认主体名称、联系方式、处理目的和授权撤回路径。
              </div>
            </div>
          </Card>
        </div>

        <div className="agreement-edit__side">
          <Card variant="borderless" className="edit-card">
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
            <div className="agreement-phone">
              <div className="agreement-phone__bar">
                <span>9:41</span>
                <span>•••</span>
              </div>
              <div className="agreement-phone__nav">
                <span>‹</span>
                <strong>隐私政策</strong>
                <span>•••</span>
              </div>
              <div className="agreement-phone__body">
                <h4>{name}</h4>
                <p className="agreement-phone__meta">{version} · 生效日期 2026年8月15日</p>
                <p>
                  我们重视您的个人信息和健康数据安全。本政策说明我们如何处理您的信息，以及您可以如何行使相关权利。
                </p>
                <h5>一、我们收集的信息</h5>
                <ul>
                  <li>账户与身份信息</li>
                  <li>预约、订单和服务记录</li>
                  <li>经单独授权的健康档案与报告</li>
                </ul>
                <h5>二、健康数据授权与撤回</h5>
                <p>
                  健康数据属于敏感个人信息。您可以在“设置与隐私”中撤回授权，撤回不影响此前基于授权完成的处理。
                </p>
                <div className="agreement-phone__contact">联系我们：010-6888 6688</div>
              </div>
              <button type="button" className="agreement-phone__cta">
                我已阅读并同意
              </button>
            </div>
          </Card>
        </div>
      </div>
      </Form>
    </PageContainer>
  )
}
