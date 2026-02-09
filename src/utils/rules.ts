// 手机号正则
export const MOBILE_REGEX = /^[1]([3-9])[0-9]{9}$/;
// 邮箱正则
export const EMAIL_REGEX = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$/;
// 密码正则
export const PASSWORD_REGEX = /^[A-Za-z\d!@#$%^&*()_+]{6,32}$/;
// 用户名正则：2-20位字母、数字、下划线、中文
export const USERNAME_REGEX = /^[a-zA-Z0-9_\u4e00-\u9fa5]{2,20}$/;
// 验证码正则：6位数字
export const VERIFICATION_REGEX = /^[0-9]{6}$/;

export const RULES = {
  // 标识符：支持手机号/邮箱
  mobileOrEmail: [
    {
      required: true,
      message: "Please enter email/phone",
    },
    {
      validator: (_: unknown, value: string) => {
        if (!value) {
          return Promise.resolve();
        }
        if (EMAIL_REGEX.test(value) || MOBILE_REGEX.test(value)) {
          return Promise.resolve();
        }
        return Promise.reject(
          new Error("Please enter a valid email/phone/account"),
        );
      },
    },
  ],
  // 邮箱
  email: [
    {
      required: true,
      message: "Please enter email",
    },
    {
      pattern: EMAIL_REGEX,
      message: "Invalid email format",
    },
  ],
  // 手机号
  phone: [
    {
      required: true,
      message: "Please enter phone number",
    },
    {
      pattern: MOBILE_REGEX,
      message: "Invalid phone number format",
    },
  ],
  // 用户名
  username: [
    {
      required: true,
      message: "Please enter username",
    },
    {
      pattern: USERNAME_REGEX,
      message:
        "Username must be 2-20 characters (letters, numbers, underscore, Chinese)",
    },
  ],
  // 密码
  password: [
    {
      required: true,
      message: "Please enter password",
    },
    {
      pattern: PASSWORD_REGEX,
      message:
        "Password must be 8-16 characters with uppercase, lowercase, number and special character",
    },
  ],
  // 确认密码
  confirmPassword: [
    {
      required: true,
      message: "Please confirm password",
    },
  ],
  verification: [
    {
      required: true,
      message: "Please enter verification code",
    },
    {
      pattern: VERIFICATION_REGEX,
      message: "Verification code must be a 6-digit number",
    },
  ],
};
