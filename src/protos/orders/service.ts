// Code generated by protoc-gen-ts_proto. DO NOT EDIT.
// versions:
//   protoc-gen-ts_proto  v1.181.1
//   protoc               v5.27.1
// source: orders/service.proto

/* eslint-disable */
import { Observable } from "rxjs";
import { type Order } from "./message";

export const protobufPackage = "proto_example.orders";

export interface OrderService {
  Find(request: Order): Promise<Order>;
  Sync(request: Observable<Order>): Observable<Order>;
  SyncCall(request: Observable<Order>): Observable<Order>;
  StreamReq(request: Observable<Order>): Promise<Order>;
  StreamReqCall(request: Observable<Order>): Promise<Order>;
}
