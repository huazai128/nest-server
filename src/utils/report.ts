import { MetricsName } from '@app/constants/enum.contant';
import { modelOptions, prop, Ref, Severity } from '@typegoose/typegoose';
import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsInt,
  IsDefined,
  IsUrl,
  IsOptional,
  IsNumberString,
  IsIP,
} from 'class-validator';
import {
  Language,
  TransportCategory,
  UserType,
} from '@app/constants/enum.contant';
import mongoose from 'mongoose';
import { IPLocation } from '@app/processors/helper/helper.service.ip';
import { Site } from '@app/modules/site/site.model';

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
/** 性能 / 行为类 reportsType，查询与 mongoose enum 校验用 */
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

export const indexOptions: mongoose.IndexDefinition = {
  href: 'text',
};
export const indexWeights: mongoose.IndexOptions['weights'] = {
  siteId: 1,
  userId: 3,
  ip: 6,
  href: 11,
  path: 10,
  create_at: 2,
  category: 4,
  reportsType: 5,
};

@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
})
/** 各业务日志表共用的上报公共字段（站点、页面、会话） */
export class Report {
  /** 细分类型，如 first-paint / js / blank-screen */
  @IsIn([...MetricsTypes, ...MechanismTypes])
  @IsString()
  @prop({ enum: MetricsName, index: true, default: MetricsName.HT })
  reportsType: MetricsName;

  /** 站点，对应 SDK appKey */
  @IsNotEmpty()
  @prop({ ref: () => Site, required: true, index: true })
  siteId: Ref<Site>;

  /** 浏览器语种 */
  @IsIn(LOG_LANGS)
  @IsString()
  @IsDefined()
  @prop({ enum: Language, default: Language.Chinese })
  lang: Language;

  /** UA 解析结果 JSON 字符串 */
  @prop({ default: null, type: String })
  ua_result: string | null;

  /** 窗口宽高 */
  @IsString()
  @prop({ type: String, trim: true })
  winScreen: string;

  /** 文档宽高 */
  @IsString()
  @prop({ type: String, trim: true })
  docScreen: string;

  /** 业务用户 ID，来自 cookie */
  @IsNumberString()
  @IsOptional()
  @prop({ type: String, index: true, sparse: true })
  userId: string;

  /** 页面标题 */
  @IsString()
  @prop({ type: String, trim: true, validate: /\S+/, text: true })
  title: string;

  /** 路由 path */
  @IsString()
  @prop({ type: String, trim: true, index: true })
  path: string;

  /** 当前页完整 URL */
  @IsUrl()
  @IsOptional()
  @prop({ type: String, trim: true, index: true, text: true })
  href: string;

  /** document.referrer */
  @IsUrl()
  @IsOptional()
  @prop({ type: String, trim: true, index: true, text: true })
  referrer: string;

  /** 上一页 href，用于串联跳转 */
  @IsUrl()
  @IsOptional()
  @prop({ type: String, trim: true, index: true, text: true })
  prevHref: string;

  /** 触发换页的事件类型，如 pageshow / pushState */
  @IsString()
  @prop({ type: String, trim: true })
  jumpType: string;

  /** 导航来源：新开 / 刷新 / 前进后退 / 其他 */
  @IsIn(LOG_TYPE)
  @IsInt()
  @IsDefined()
  @prop({ default: UserType.URL, enum: UserType })
  type: UserType;

  /** 网络有效类型，如 4g */
  @IsString()
  @prop({ type: String, trim: true })
  effectiveType: string;

  /** 环境标识，如 test / prod */
  @IsString()
  @prop({ type: String, trim: true })
  mode: string;

  /** 访问者 IP，由网关补齐 */
  @IsIP()
  @IsOptional()
  @prop({ type: String, trim: true })
  ip: string;

  /** 上报大类：pv / perf / error 等 */
  @IsIn([LOG_CATEGORY])
  @IsString()
  @prop({ enum: TransportCategory, required: true, index: true })
  category: TransportCategory;

  /** IP 解析出的地理信息 */
  @prop({ type: Object, default: null })
  ip_location: Partial<IPLocation> | null;

  /** 单条监控 ID，错误用它反查行为 / 录屏 */
  @IsString()
  @prop({
    type: String,
    default: null,
    index: true,
    description: '监控ID,用于记录用户行为和错误排查',
  })
  monitorId: string | null;

  /** 页面 ID，路由变化时重新生成 */
  @IsString()
  @prop({
    type: String,
    default: null,
    index: true,
    description: '页面ID,用于标识当前页面',
  })
  pageId: string | null;

  /** 会话追踪 ID，刷新复用；跨会话补报以单条为准 */
  @IsString()
  @prop({ type: String, default: null, index: true }) // 添加索引提升追踪查询性能
  traceId: string | null;
}
