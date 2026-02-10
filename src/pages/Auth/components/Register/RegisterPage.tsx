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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-500 via-indigo-500 to-purple-600 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-[400px] h-[400px] bg-white/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] bg-white/20 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="backdrop-blur-xl bg-white/85 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] p-10 border border-white/40">
          <div className="text-center mb-8">
            <Typography.Title level={2}>Create Account</Typography.Title>
            <p className="text-gray-500">开始您的云存储之旅</p>
          </div>

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
                className="rounded-xl"
              />
            </Form.Item>

            <Form.Item name="mobileOrEmail" rules={RULES.mobileOrEmail}>
              <Input
                prefix={<MailOutlined />}
                placeholder="邮箱 / 手机号"
                size="large"
                className="rounded-xl"
              />
            </Form.Item>

            <Form.Item name="verification" rules={RULES.verification}>
              <div className="flex gap-2">
                <Input
                  prefix={<SafetyOutlined />}
                  placeholder="验证码"
                  size="large"
                  className="rounded-xl"
                />
                <Button
                  onClick={handleGetVerificationCode}
                  size="large"
                  className="rounded-xl"
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
                className="rounded-xl"
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
                className="rounded-xl"
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
                <Link to="/agreement" className="text-indigo-600 ml-1">
                  用户协议
                </Link>
                和
                <Link to="/privacy" className="text-indigo-600 ml-1">
                  隐私政策
                </Link>
              </Checkbox>
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600"
            >
              注册
            </Button>
          </Form>

          <div className="mt-6 text-center text-sm text-gray-600">
            已有账号？
            <Link to="/login" className="ml-1 text-indigo-600 hover:underline">
              去登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
