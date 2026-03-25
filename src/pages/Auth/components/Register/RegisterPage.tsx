import { registerApi } from "@/apis/register";
import type { RegisterCommand } from "@/types/register/command";
import { Typography, Form, Input, Button, Checkbox } from "antd";
import { Link, useNavigate } from "react-router-dom";
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import { RULES } from "@/utils/rules";
import { createVerificationCodeForRegisterApi } from "@/apis/verification";
import { antdMessage } from "@/utils/antdHolder";

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = async (form: RegisterCommand) => {
    await registerApi(form);
    antdMessage.success("注册成功！");
    navigate("/login");
  };

  const handleGetVerificationCode = async () => {
    const mobileOrEmail = form.getFieldValue("mobileOrEmail");
    if (!mobileOrEmail) {
      antdMessage.warning("请先输入邮箱或手机号");
      return;
    }
    const res = await createVerificationCodeForRegisterApi({ mobileOrEmail });
    antdMessage.success(`验证码是：${res.id}`);
  };



  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: 'var(--color-bg-base)',
    padding: 'var(--space-4)',
  };

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 400,
    padding: 'var(--space-8)',
    backgroundColor: 'var(--color-surface-primary)',
    borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--color-border-default)',
    boxShadow: 'var(--shadow-lg)',
  };

  const titleStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: 'var(--space-2)',
    fontSize: 'var(--text-2xl)',
    fontWeight: 'var(--font-semibold)',
    color: 'var(--color-text-primary)',
  };

  const subtitleStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: 'var(--space-6)',
    color: 'var(--color-text-tertiary)',
    fontSize: 'var(--text-sm)',
  };

  const footerStyle: React.CSSProperties = {
    marginTop: 'var(--space-6)',
    textAlign: 'center',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-tertiary)',
  };

  const linkStyle: React.CSSProperties = {
    color: 'var(--color-brand)',
    cursor: 'pointer',
  };

  const buttonGroupStyle: React.CSSProperties = {
    display: 'flex',
    gap: 'var(--space-2)',
    alignItems: 'stretch',
  };


  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <Typography.Title level={2} style={titleStyle}>
          Create Account
        </Typography.Title>
        <p style={subtitleStyle}>开始您的云存储之旅</p>

        <Form
          form={form}
          validateTrigger="onBlur"
          onFinish={onFinish}
          layout="vertical"
        >
          <Form.Item name="username" rules={RULES.username}>
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              size="large"
            />
          </Form.Item>

          <Form.Item name="mobileOrEmail" rules={RULES.mobileOrEmail}>
            <Input
              prefix={<MailOutlined />}
              placeholder="邮箱 / 手机号"
              size="large"
            />
          </Form.Item>

          <Form.Item name="verification" rules={RULES.verification}>
            <div style={buttonGroupStyle}>
              <Input
                prefix={<SafetyOutlined />}
                placeholder="验证码"
                size="large"
                style={{ flex: 1 }}
              />
              <Button
                onClick={handleGetVerificationCode}
                size="large"
                style={{ height: 40, alignSelf: 'stretch' }}
              >
                获取
              </Button>
            </div>
          </Form.Item>

          <Form.Item name="password" rules={RULES.password}>
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={["password"]}
            rules={RULES.confirmPassword}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="确认密码"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="agreement"
            valuePropName="checked"
            rules={[
              {
                validator: (_, v) =>
                  v
                    ? Promise.resolve()
                    : Promise.reject(new Error("请同意协议")),
              },
            ]}
          >
            <Checkbox>
              同意
              <Link to="/agreement" style={linkStyle} onClick={(event) => event.stopPropagation()}>
                用户协议
              </Link>
              和
              <Link to="/privacy" style={linkStyle} onClick={(event) => event.stopPropagation()}>
                隐私政策
              </Link>
            </Checkbox>
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            style={{
              height: 44,
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-medium)',
              backgroundColor: 'var(--color-brand)',
              borderColor: 'var(--color-brand)',
            }}
          >
            注册
          </Button>
        </Form>

        <div style={footerStyle}>
          <span style={{ color: 'var(--color-text-tertiary)' }}>已有账号？</span>
          <Link to="/login" style={linkStyle}>
            去登录
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;




