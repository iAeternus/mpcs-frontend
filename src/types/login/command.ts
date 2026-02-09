export interface MobileOrEmailLoginCommand {
  mobileOrEmail: string;
  password: string;
}

export interface JwtTokenResponse {
  token: string;
}

export interface VerificationCodeLoginCommand {
  mobileOrEmail: string;
  verification: string;
}
