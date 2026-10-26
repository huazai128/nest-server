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

/** 上报大类，对应 SaveLogRequest.category / 分表 */
export enum TransportCategory {
  /** 页面访问 */
  PV = 'pv',
  /** 性能指标 */
  PREF = 'perf',
  /** 用户行为（点击 / 曝光等） */
  EVENT = 'event',
  /** 自定义埋点 / 测速 */
  CUSTOM = 'custom',
  /** 接口日志 */
  API = 'api',
  /** 错误（含报错白屏） */
  ERROR = 'error',
  /** 录屏 */
  RV = 'video',
  /** 用户反馈 */
  USER = 'user',
}

/** 细分类型，对应 SaveLogRequest.reportsType，入库枚举校验用 */
export enum MetricsName {
  /** 首次绘制 */
  FP = 'first-paint',
  /** 首次内容绘制 */
  FCP = 'first-contentful-paint',
  /** 首次有意义绘制 */
  FMP = 'first-meaning-paint',
  /** 导航各阶段耗时 */
  NT = 'navigation-timing',
  /** 静态资源加载瀑布 */
  RF = 'resource-flow',
  /** 路由变化 / PV */
  RCR = 'router-change-record',
  /** 点击行为 */
  CBR = 'click-behavior-record',
  /** 自定义埋点 */
  CDR = 'custom-define-record',
  /** 接口请求 */
  HT = 'http-record',
  /** 元素曝光 */
  CE = 'change-exposure',
  /** 同步 JS 异常 */
  JS = 'js',
  /** 静态资源加载失败 */
  RS = 'resource',
  /** 未捕获 Promise rejection */
  UJ = 'unhandledrejection',
  /** 跨域脚本 Script error. */
  CS = 'cors',
  /** React 组件错误 */
  REACT = 'react',
  /** 历史 HTTP 类型名，与 HT 并存 */
  HTS = 'http',
  /** 报错导致的白屏 */
  BS = 'blank-screen',
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
  MetricsName.BS,
];
