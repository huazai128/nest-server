export interface UserInfo {
  userId: number;
  account: string;
}

export interface TokenInfo {
  access_token: string;
  expires_in: number;
}

export type LoginInfo = UserInfo & TokenInfo;
