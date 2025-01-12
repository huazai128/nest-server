import { MetricsName } from '@app/constants/enum.contant';
import {
  Language,
  TransportCategory,
  UserType,
} from '@app/constants/enum.contant';

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
