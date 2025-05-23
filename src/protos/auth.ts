// Code generated by protoc-gen-ts_proto. DO NOT EDIT.
// versions:
//   protoc-gen-ts_proto  v2.6.1
//   protoc               v5.27.1
// source: auth.proto

/* eslint-disable */
import { Observable } from "rxjs";

export const protobufPackage = "authproto";

export interface LoginRequest {
  account: string;
  password: string;
}

export interface LoginResponse {
  userId: number;
  account: string;
}

export interface ValidateUserRequest {
  userId: number;
}

export interface UserInfo {
  userId: number;
  account: string;
  avatar: string;
  role: number[];
  createAt: string;
  updateAt: string;
}

export interface AuthService {
  login(request: LoginRequest): Observable<LoginResponse>;
  validateUser(request: ValidateUserRequest): Observable<LoginResponse>;
  getUserById(request: ValidateUserRequest): Observable<UserInfo>;
}
