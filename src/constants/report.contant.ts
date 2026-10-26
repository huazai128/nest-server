import { MetricsName } from '@app/constants/enum.contant';
import {
  Language,
  TransportCategory,
  UserType,
} from '@app/constants/enum.contant';

/** 日志语种可选值 */
export const LOG_LANGS = [Language.Chinese, Language.English];
/** performance.navigation.type 对应的来源分类 */
export const LOG_TYPE = [
  UserType.URL,
  UserType.RELOAD,
  UserType.AROUND,
  UserType.OTHER,
];
/** 允许入库的业务 category（不含 webInfo / pageInfo） */
export const LOG_CATEGORY = [
  TransportCategory.API,
  TransportCategory.CUSTOM,
  TransportCategory.ERROR,
  TransportCategory.EVENT,
  TransportCategory.PREF,
  TransportCategory.PV,
  TransportCategory.USER,
];
/** 性能 / 行为类 reportsType，查询校验用 */
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
/** 错误类 reportsType，含报错白屏 */
export const MechanismTypes = [
  MetricsName.CS,
  MetricsName.JS,
  MetricsName.REACT,
  MetricsName.RS,
  MetricsName.UJ,
  MetricsName.BS,
];
