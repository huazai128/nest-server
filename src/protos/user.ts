// Code generated by protoc-gen-ts_proto. DO NOT EDIT.
// versions:
//   protoc-gen-ts_proto  v1.181.1
//   protoc               v5.27.1
// source: protos/user.proto

/* eslint-disable */

export const protobufPackage = "userproto";

export interface getBooksRequest {
}

export interface getUsersResponse {
  users: User[];
}

export interface User {
  id: number;
  name: string;
  createdAt: Date | undefined;
}

export interface UserService {
  getUsers(request: getBooksRequest): Promise<getUsersResponse>;
}
