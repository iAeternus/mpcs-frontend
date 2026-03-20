import { VALIDATION_PATTERNS } from "@/constants";

/** 手机号正则 */
export const MOBILE_REGEX = VALIDATION_PATTERNS.MOBILE;
/** 邮箱正则 */
export const EMAIL_REGEX = VALIDATION_PATTERNS.EMAIL;
/** 密码正则 */
export const PASSWORD_REGEX = VALIDATION_PATTERNS.PASSWORD;
/** 用户名正则 */
export const USERNAME_REGEX = VALIDATION_PATTERNS.USERNAME;
/** 验证码正则 */
export const VERIFICATION_REGEX = VALIDATION_PATTERNS.VERIFICATION_CODE;

export const RULES = {
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
