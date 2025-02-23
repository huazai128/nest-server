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
import { IResult } from 'ua-parser-js';
import mongoose from 'mongoose';
import { IPLocation } from '@app/processors/helper/helper.service.ip';
import { Site } from '@app/modules/site/site.model';

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
export class Report {
  @IsIn([...MetricsTypes, ...MechanismTypes])
  @IsString()
  @prop({ enum: MetricsName, index: true, default: MetricsName.HT })
  reportsType: MetricsName;

  @IsNotEmpty()
  @prop({ ref: () => Site, required: true, index: true })
  siteId: Ref<Site>;

  @IsIn(LOG_LANGS)
  @IsString()
  @IsDefined()
  @prop({ enum: Language, default: Language.Chinese })
  lang: Language;

  @prop({ default: null, type: Object })
  ua_result: Partial<IResult> | null;

  @IsString()
  @prop({ type: String, trim: true })
  winScreen: string;

  @IsString()
  @prop({ type: String, trim: true })
  docScreen: string;

  @IsNumberString()
  @IsOptional()
  @prop({ type: String, index: true, sparse: true })
  userId: string;

  @IsString()
  @prop({ type: String, trim: true, validate: /\S+/, text: true })
  title: string;

  @IsString()
  @prop({ type: String, trim: true, index: true })
  path: string;

  @IsUrl()
  @IsOptional()
  @prop({ type: String, trim: true, index: true, text: true })
  href: string;

  @IsUrl()
  @IsOptional()
  @prop({ type: String, trim: true, index: true, text: true })
  referrer: string;

  @IsUrl()
  @IsOptional()
  @prop({ type: String, trim: true, index: true, text: true })
  prevHref: string;

  @IsString()
  @prop({ type: String, trim: true })
  jumpType: string;

  @IsIn(LOG_TYPE)
  @IsInt()
  @IsDefined()
  @prop({ default: UserType.URL, enum: UserType })
  type: UserType;

  @IsString()
  @prop({ type: String, trim: true })
  effectiveType: string;

  @IsString()
  @prop({ type: String, trim: true })
  mode: string;

  @IsIP()
  @IsOptional()
  @prop({ type: String, trim: true })
  ip: string;

  @IsIn([LOG_CATEGORY])
  @IsString()
  @prop({ enum: TransportCategory, required: true, index: true })
  category: TransportCategory;

  @prop({ type: Object, default: null })
  ip_location: Partial<IPLocation> | null;

  @IsString()
  @prop({
    type: String,
    default: null,
    index: true,
    description: '监控ID,用于记录用户行为和错误排查',
  })
  monitorId: string | null;

  @IsString()
  @prop({
    type: String,
    default: null,
    index: true,
    description: '页面ID,用于标识当前页面',
  })
  pageId: string | null;
}
