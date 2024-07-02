export interface UserInfo {
  userId: number;
  account: string;
}

export interface TokenInfo {
  accessToken: string;
  expiresIn: number;
}

export type LoginInfo = UserInfo & TokenInfo;
