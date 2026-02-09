export interface CreateRegisterVerificationCodeCommand {
  mobileOrEmail: string;
}

export interface CreateLoginVerificationCodeCommand {
  mobileOrEmail: string;
}

export interface CreateFindBackPasswordVerificationCodeCommand {
  mobileOrEmail: string;
}

export interface CreateChangeMobileVerificationCodeCommand {
  mobile: string;
}

export interface IdentifyMobileVerificationCodeCommand {
  mobile: string;
}
