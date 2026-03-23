import { Typography, Form, Input, Button } from "antd";
import { useAppDispatch } from "@/store";
import { Link, useNavigate } from "react-router-dom";
import { RULES } from "@/utils/rules";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import type { MobileOrEmailLoginCommand } from "@/types/login/command";
import { login } from "@/store/modules/authStore";
import { antdMessage } from "@/utils/antdHolder";

export const LoginPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = async (form: MobileOrEmailLoginCommand) => {
    await dispatch(login(form));
    antdMessage.success("登录成功！");
    navigate("/");
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

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <Typography.Title level={2} style={titleStyle}>
          Welcome Back
        </Typography.Title>
        <p style={subtitleStyle}>登录以继续使用系统</p>

        <Form
          form={form}
          validateTrigger="onBlur"
          onFinish={onFinish}
          layout="vertical"
        >
          <Form.Item name="mobileOrEmail" rules={RULES.mobileOrEmail}>
            <Input
              prefix={<UserOutlined />}
              placeholder="邮箱 / 手机号"
              size="large"
            />
          </Form.Item>

          <Form.Item name="password" rules={RULES.password}>
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
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
            登录
          </Button>
        </Form>

        <div style={footerStyle}>
          <span style={{ color: 'var(--color-text-tertiary)' }}>忘记密码？</span>
          <div style={{ marginTop: 'var(--space-2)' }}>
            <span style={{ color: 'var(--color-text-tertiary)' }}>没有账号？</span>
            <Link to="/login/register" style={linkStyle}>
              立即注册
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;