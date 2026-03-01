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

  return (
    <div className="auth-light-inputs min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      {/* 光斑 */}
      <div className="absolute -top-32 -left-32 w-[400px] h-[400px] bg-white/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] bg-white/20 rounded-full blur-3xl" />

      {/* 卡片 */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="backdrop-blur-xl bg-white/80 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-10 border border-white/40">
          <div className="text-center mb-8">
            <Typography.Title level={2} className="!mb-1 !font-semibold">
              Welcome Back
            </Typography.Title>
            <p className="text-gray-500">登录以继续使用系统</p>
          </div>

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
                className="rounded-xl"
              />
            </Form.Item>

            <Form.Item name="password" rules={RULES.password}>
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="密码"
                size="large"
                className="rounded-xl"
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              className="w-full h-12 rounded-xl text-base font-medium bg-gradient-to-r from-indigo-500 to-purple-600"
            >
              登录
            </Button>
          </Form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <Link to="" className="hover:text-indigo-600">
              忘记密码？
            </Link>
            <div className="mt-2">
              没有账号？
              <Link
                to="/login/register"
                className="ml-1 text-indigo-600 hover:underline"
              >
                立即注册
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
