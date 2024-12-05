export enum SortType {
  Asc = 1, // 升序
  Desc = -1, // 降序
}

export enum PublishState {
  Draft = 0, // 草稿
  Published = 1, // 已发布
  Recycle = -1, // 回收站
}

export enum ReportStatus {
  NotReport = 0, // API 不上报告警
  Report = 1, //  API 接口异常上报告警
}

export enum Language {
  English = 'en', // English
  Chinese = 'zh', // 简体中文
}

export enum UserType {
  URL, // 点击链接、地址栏输入、表单提交、脚本操作等。
  RELOAD, // 点击重新加载按钮、location.reload。
  AROUND, // 点击前进或后退按钮。
  OTHER = 255, // 任何其他来源。即非刷新/ 非前进后退、非点击链接 / 地址栏输入 / 表单提交 / 脚本操作等。
}
// 环境变量
export enum EnvStatus {
  TEST = 'test',
  RELEASE = 'release',
  PROD = 'prod',
}

// 上报类型
export enum TransportCategory {
  PV = 'pv', //
  PREF = 'perf',
  EVENT = 'event',
  CUSTOM = 'custom',
  API = 'api',
  ERROR = 'error',
  RV = 'video',
  USER = 'user',
}

//日志类型
export enum MetricsName {
  FP = 'first-paint',
  FCP = 'first-contentful-paint',
  FMP = 'first-meaning-paint',
  NT = 'navigation-timing',
  RF = 'resource-flow',
  RCR = 'router-change-record',
  CBR = 'click-behavior-record',
  CDR = 'custom-define-record',
  HT = 'http-record',
  CE = 'change-exposure',
  JS = 'js',
  RS = 'resource',
  UJ = 'unhandledrejection',
  CS = 'cors',
  REACT = 'react',
  HTS = 'http',
}

export const LOG_LANGS = [Language.Chinese, Language.English];

export const LOG_TYPE = [
  UserType.URL,
  UserType.RELOAD,
  UserType.AROUND,
  UserType.OTHER,
];

export const LOG_CATEGORY = [
  TransportCategory.API,
  TransportCategory.CUSTOM,
  TransportCategory.ERROR,
  TransportCategory.EVENT,
  TransportCategory.PREF,
  TransportCategory.PV,
  TransportCategory.USER,
];

export const MetricsTypes = [
  MetricsName.CBR,
  MetricsName.CDR,
  MetricsName.CE,
  MetricsName.FCP,
  MetricsName.FMP,
  MetricsName.FP,
  MetricsName.HT,
  MetricsName.NT,
  MetricsName.RCR,
  MetricsName.RF,
];

export const MechanismTypes = [
  MetricsName.CS,
  MetricsName.JS,
  MetricsName.REACT,
  MetricsName.RS,
  MetricsName.UJ,
];
