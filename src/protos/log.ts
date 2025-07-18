// Code generated by protoc-gen-ts_proto. DO NOT EDIT.
// versions:
//   protoc-gen-ts_proto  v2.6.1
//   protoc               v5.27.1
// source: log.proto

/* eslint-disable */
import { Observable } from "rxjs";
import { type ChartItem } from "./common/chart_item";
import { type Pagination } from "./common/pagination";
import { type QueryDTO } from "./common/query_dto";

export const protobufPackage = "logproto";

export interface IPLocationRequest {
  /** IP 地址 */
  ip: string;
}

export interface IPLocationResponse {
  /** IP 地址 */
  ip: string;
  /** 国家 */
  country: string;
  /** 省份 */
  province: string;
  /** 城市 */
  city: string;
  /** 国家代码 */
  countryCode: string;
  /** 地区 */
  region: string;
  /** 地区代码 */
  regionCode: string;
  /** 邮政编码 */
  zip: string;
  /** 纬度 */
  latitude: number;
  /** 经度 */
  longitude: number;
}

export interface NTiming {
  /** First Paint 首次绘制时间 */
  fp: number;
  /** Time to Interactive 可交互时间 */
  tti: number;
  /** DOM Ready 时间 */
  domReady: number;
  /** 页面完全加载时间 */
  load: number;
  /** 首字节时间 */
  firseByte: number;
  /** DNS 解析时间 */
  dns: number;
  /** TCP 连接时间 */
  tcp: number;
  /** SSL 连接时间 */
  ssl: number;
  /** Time to First Byte 首字节时间 */
  ttfb: number;
  /** 传输时间 */
  trans: number;
  /** DOM 解析时间 */
  domParse: number;
  /** 资源加载时间 */
  res: number;
}

export interface PaintInfo {
  /** 持续时间 */
  duration: number;
  /** 条目类型 */
  entryType: string;
  /** 名称 */
  name: string;
  /** 开始时间 */
  startTime: number;
}

export interface SaveLogRequest {
  /** 唯一索引 */
  id: string;
  /** 报告类型 */
  reportsType: string;
  /** 站点 ID */
  siteId: string;
  /** 模型引用类型 */
  onModel: string;
  /** 日志类别 */
  category: string;
  /** 用户 ID */
  userId: string;
  /** 标题 */
  title: string;
  /** 路径 */
  path: string;
  /** URL */
  href: string;
  /** 方法 */
  method: string;
  /** 请求 URL */
  url: string;
  /** 请求体参数 */
  body:
    | { [key: string]: any }
    | undefined;
  /** 请求参数 */
  params:
    | { [key: string]: any }
    | undefined;
  /** 响应 */
  response:
    | Response
    | undefined;
  /** 错误信息 */
  value: string;
  /** IP 地址 */
  ip: string;
  /** 创建时间 */
  createAt: string;
  /** 更新时间 */
  updateAt: string;
  /** 追踪 ID */
  traceId: string;
  /** 监控 ID */
  monitorId: string;
  /** 标签id */
  nodeId: string;
  /** First Meaningful Paint 首次有意义绘制时间 */
  fmpTime: number;
  /** 缓存命中率 */
  cacheRate: string;
  /** 资源信息 */
  resourcePrefs: RequestInfo[];
  /** 性能计时信息 */
  ntTiming:
    | NTiming
    | undefined;
  /** 结束时间 */
  endTime: string;
  /** 交互时间 */
  interactionTime: string;
  /** 加载时间 */
  loadedTime: string;
  /** 正在加载时间 */
  loadingTime: string;
  /** 查询 URL */
  queryUrl: string;
  /** 请求时间 */
  requestTime: string;
  /** 响应时间 */
  responseTime: string;
  /** 状态 */
  status: number;
  /** 状态文本 */
  statusText: string;
  /** 错误类型 */
  errorType: string;
  /** 内容 */
  content: string;
  /** 元数据 */
  meta:
    | Meta
    | undefined;
  /** MongoDB ID */
  Id: string;
  /** 语言 */
  lang: string;
  /** User Agent 用户代理 */
  ua: string;
  /** 窗口屏幕信息 */
  winScreen: string;
  /** 文档屏幕信息 */
  docScreen: string;
  /** 来源页面 */
  referrer: string;
  /** 上一页URL */
  prevHref: string;
  /** 跳转类型 */
  jumpType: string;
  /** 类型 */
  type: number;
  /** 网络连接类型 */
  effectiveType: string;
  /** 模式 */
  mode: string;
  /** IP地理位置 */
  ipLocation: string;
  /** 标签文本 */
  tagText: string;
  /** 标签名称 */
  tagName: string;
  /** DOM节点 */
  nodeDom: string;
  /** CSS类名列表 */
  classList: string[];
  /** 日志名称 */
  logName: string;
  /** 日志数据 */
  logData: string;
  /** 日志位置 */
  logPos: string;
  /** 日志ID */
  logId: string;
  /** 错误详情列表 */
  errorDetailList: string[];
  /** 堆栈跟踪 */
  stackTrace: StackTrace[];
  /** 用户行为痕迹 */
  breadcrumbs: BehaviorItem[];
  /** 错误唯一ID */
  errorUid: string;
  /** 页面ID */
  pageId: string;
  /** 速度 */
  speed: string;
  /** 耗时 */
  costTime: string;
  /** FP timing object */
  fpTime:
    | PaintInfo
    | undefined;
  /** FCP timing value */
  fcpTime:
    | PaintInfo
    | undefined;
  /** 唯一ID ，用于用户自定上报id，如团队id、项目id等 */
  oId: string;
  /** 组件名称 */
  componentName: string;
  /** 录制视频数据 */
  events: string;
  /** ua解析结果 */
  uaResult: string;
  /** 关联表自增id */
  cId: string;
  /** 关联表_id */
  tId: string;
  /** 录屏uuid key 用于保持 */
  recordKeys: string[];
}

export interface BehaviorItem {
  /** 行为类型 */
  type: string;
  /** 监控ID */
  monitorId: string;
}

export interface Meta {
  /** 请求体 */
  body:
    | { [key: string]: any }
    | undefined;
  /** 结束时间 */
  endTime: string;
  /** 交互时间 */
  interactionTime: string;
  /** 加载完成时间 */
  loadedTime: string;
  /** 加载中时间 */
  loadingTime: string;
  /** 请求方法 */
  method: string;
  /** 请求参数 */
  params:
    | { [key: string]: any }
    | undefined;
  /** 查询URL */
  queryUrl: string;
  /** 请求时间 */
  requestTime: string;
  /** 响应信息 */
  response:
    | Response
    | undefined;
  /** 响应时间 */
  responseTime: string;
  /** 状态码 */
  status: number;
  /** 状态文本 */
  statusText: string;
  /** URL */
  url: string;
  /** 列号 */
  col: string;
  /** 文件名 */
  file: string;
  /** 行号 */
  row: string;
}

export interface RequestInfo {
  /** 内容下载时间 */
  contentDownload: number;
  /** DNS 查找时间 */
  dnsLookup: number;
  /** 初始连接时间 */
  initialConnect: number;
  /** 发起者类型 */
  initiatorType: string;
  /** 是否使用缓存 */
  isCache: boolean;
  /** 请求 URL */
  name: string;
  /** 请求持续时间 */
  requestDuration: number;
  /** 响应结束时间 */
  responseEnd: number;
  /** 是否使用 SSL */
  ssl: boolean;
  /** 开始时间 */
  startTime: number;
  /** TTFB（首次字节时间） */
  timeToFirstByte: number;
  /** 传输大小 */
  transferSize: number;
}

export interface Response {
  /** 状态码 */
  status: number;
  /** 消息 */
  message: string;
  /** 结果 */
  result: string;
}

export interface LogResponse {
  /** 状态码 */
  status: number;
  /** 消息 */
  message: string;
  /** 结果数据 */
  result: { [key: string]: any } | undefined;
}

export interface LogList {
  /** 日志列表数据 */
  data: SaveLogRequest[];
  /** 分页信息 */
  pagination: Pagination | undefined;
}

export interface ChartList {
  /** 图表数据列表 */
  data: ChartItem[];
}

export interface StackTrace {
  /** 列号 */
  colno: number;
  /** 文件名 */
  filename: string;
  /** 函数名 */
  functionName: string;
  /** 行号 */
  lineno: string;
}

/** 日志块传输请求消息 */
export interface SaveLogChunkRequest {
  /** 块索引 */
  chunkIndex: number;
  /** 总块数 */
  totalChunks: number;
  /** 数据块内容（JSON字符串） */
  data: string;
  /** 块传输ID，用于标识同一次传输 */
  chunkId: string;
}

export interface LogService {
  /** 保存走kafka, 不过两种都支持==== */
  saveLog(request: SaveLogRequest): Observable<LogResponse>;
  /** 保存日志 */
  saveLogChunked(request: Observable<SaveLogChunkRequest>): Observable<LogResponse>;
  /** 获取日志列表 */
  getLogs(request: QueryDTO): Observable<LogList>;
  /** 通过游标获取日志列表 */
  getLogsByCursor(request: QueryDTO): Observable<LogList>;
  /** 获取日志图表数据 */
  getLogsChart(request: QueryDTO): Observable<ChartList>;
  /** 处理IP地理位置 */
  handleIPLocation(request: IPLocationRequest): Observable<IPLocationResponse>;
}
