import { Typography, Form, Input, Button } from "antd";
import { useAppDispatch } from "@/store";
import { Link, useNavigate } from "react-router-dom";
import loginBg from "@/assets/login-bg.png";
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
    navigate("/"); // 跳转到首页
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        // todo url
        backgroundImage: `url(${loginBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* 背景遮罩层 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      {/* 登录卡片 */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 md:p-10">
          {/* 头部 */}
          <div className="text-center mb-8">
            <Typography.Title level={2} className="!mb-2 !text-gray-800">
              欢迎回来
            </Typography.Title>
            <p className="text-gray-500 text-sm">请登录您的账户继续</p>
          </div>

          {/* 表单 */}
          <Form
            form={form}
            validateTrigger="onBlur"
            onFinish={onFinish}
            layout="vertical"
          >
            <Form.Item name="mobileOrEmail" rules={RULES.mobileOrEmail}>
              <Input
                prefix={<UserOutlined className="text-gray-400" />}
                placeholder="邮箱/手机号/账号"
                size="large"
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item name="password" rules={RULES.password}>
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                type="password"
                placeholder="8-16位,含大小写字母、数字、特殊字符"
                size="large"
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item className="mb-4">
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                className="w-full rounded-lg h-12 text-base font-medium bg-blue-600 hover:bg-blue-700"
              >
                登录
              </Button>
            </Form.Item>
          </Form>

          {/* 底部链接 */}
          <div className="space-y-3 text-sm">
            <div className="text-center">
              <Link
                to=""
                className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              >
                忘记密码?
              </Link>
            </div>
            <div className="text-center pt-4 border-t border-gray-200">
              <span className="text-gray-600">还没有账号? </span>
              <Link
                to="/login/register"
                className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
              >
                立即注册
              </Link>
            </div>
          </div>
        </div>

        {/* 装饰元素 */}
        <div className="absolute -top-4 -left-4 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl"></div>
      </div>
    </div>
  );
};
