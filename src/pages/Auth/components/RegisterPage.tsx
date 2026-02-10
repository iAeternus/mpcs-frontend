import { registerApi } from "@/apis/register";
import type { RegisterCommand } from "@/types/register/command";
import { Typography, Form, Input, Button, Checkbox } from "antd";
import { Link, useNavigate } from "react-router-dom";
import loginBg from "@/assets/login-bg.png";
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
    console.log("registerFormValues", form);
    await registerApi(form);
    antdMessage.success("注册成功！");
    navigate("/login"); // 跳转到登录页
  };

  const handleGetVerificationCode = async () => {
    try {
      const mobileOrEmail = form.getFieldValue("mobileOrEmail");

      if (!mobileOrEmail) {
        antdMessage.warning("请先输入邮箱或手机号");
        return;
      }

      const res = await createVerificationCodeForRegisterApi({
        mobileOrEmail,
      });

      // 暂定逻辑：浏览器上方弹出验证码（这里用返回的 id 代替）
      antdMessage.success(`验证码是：${res.id}`);
    } catch (error) {
      console.error(error);
      antdMessage.error("获取验证码失败，请重试");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* 背景遮罩层 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      {/* 注册卡片 */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 md:p-10">
          {/* 头部 */}
          <div className="text-center mb-8">
            <Typography.Title level={2} className="!mb-2 !text-gray-800">
              创建账户
            </Typography.Title>
            <p className="text-gray-500 text-sm">开始您的AI面试之旅</p>
          </div>

          {/* 表单 */}
          <Form
            form={form}
            validateTrigger="onBlur"
            onFinish={onFinish}
            layout="vertical"
          >
            {/* 用户名 */}
            <Form.Item name="username" rules={RULES.username}>
              <Input
                prefix={<UserOutlined className="text-gray-400" />}
                placeholder="用户名"
                size="large"
                className="rounded-lg"
              />
            </Form.Item>

            {/* 手机号 / 邮箱 */}
            <Form.Item name="mobileOrEmail" rules={RULES.mobileOrEmail}>
              <Input
                prefix={<MailOutlined className="text-gray-400" />}
                placeholder="邮箱 / 手机号"
                size="large"
                className="rounded-lg"
              />
            </Form.Item>

            {/* 验证码 */}
            <Form.Item name="verification" rules={RULES.verification}>
              <div className="flex gap-2">
                <Input
                  prefix={<SafetyOutlined className="text-gray-400" />}
                  placeholder="验证码"
                  size="large"
                  className="rounded-lg"
                />
                <Button
                  size="large"
                  className="rounded-lg"
                  type="default"
                  onClick={handleGetVerificationCode}
                >
                  获取验证码
                </Button>
              </div>
            </Form.Item>

            {/* 密码 */}
            <Form.Item name="password" rules={RULES.password}>
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="8-16位,含大小写字母、数字、特殊字符"
                size="large"
                className="rounded-lg"
              />
            </Form.Item>

            {/* 确认密码 */}
            <Form.Item
              name="confirmPassword"
              dependencies={["password"]}
              rules={[
                ...RULES.confirmPassword,
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error("The two passwords do not match"),
                    );
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="请再次输入密码"
                size="large"
                className="rounded-lg"
              />
            </Form.Item>

            {/* 用户协议 */}
            <Form.Item
              name="agreement"
              valuePropName="checked"
              rules={[
                {
                  validator: (_, value) =>
                    value
                      ? Promise.resolve()
                      : Promise.reject(new Error("请先同意用户协议")),
                },
              ]}
            >
              <Checkbox>
                我已阅读并同意
                <Link
                  to="/agreement"
                  className="text-blue-600 hover:underline ml-1"
                >
                  《用户协议》
                </Link>
                和
                <Link
                  to="/privacy"
                  className="text-blue-600 hover:underline ml-1"
                >
                  《隐私政策》
                </Link>
              </Checkbox>
            </Form.Item>

            {/* 注册按钮 */}
            <Form.Item className="mb-4">
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                className="w-full rounded-lg h-12 text-base font-medium bg-blue-600 hover:bg-blue-700"
              >
                注册
              </Button>
            </Form.Item>
          </Form>

          {/* 底部链接 */}
          <div className="text-center pt-4 border-t border-gray-200">
            <span className="text-gray-600 text-sm">已有账号? </span>
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors text-sm"
            >
              立即登录
            </Link>
          </div>
        </div>

        {/* 装饰元素 */}
        <div className="absolute -top-4 -left-4 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>
      </div>
    </div>
  );
};
