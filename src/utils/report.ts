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
  IsNumber,
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
  // https://typegoose.github.io/typegoose/docs/api/decorators/model-options/#allowmixed
  options: { allowMixed: Severity.ALLOW },
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
  @prop({ type: String, default: null })
  winScreen: string | null;

  @IsString()
  @prop({ type: String, default: null })
  docScreen: string | null;

  @IsNumber()
  @IsNumberString()
  @IsOptional()
  @prop({ type: String, default: null, index: true })
  userId: string | null;

  @IsString()
  @prop({ type: String, default: null, validate: /\S+/, text: true })
  title: string | null;

  @IsString()
  @prop({ type: String, default: null, index: true })
  path: string | null;

  @IsString()
  @IsUrl()
  @IsOptional()
  @prop({ type: String, default: null, index: true, text: true })
  href: string | null;

  @IsString()
  @IsUrl()
  @IsOptional()
  @prop({ type: String, default: null, index: true, text: true })
  referrer: string | null;

  @IsString()
  @IsUrl()
  @IsOptional()
  @prop({ type: String, default: null, index: true, text: true })
  prevHref: string | null;

  @IsString()
  @prop({ type: String, default: null })
  jumpType: string | null;

  @IsIn(LOG_TYPE)
  @IsInt()
  @IsDefined()
  @prop({ default: UserType.URL, enum: UserType })
  type: UserType;

  @IsString()
  @prop({ type: String, default: null })
  effectiveType: string | null;

  @IsString()
  @prop({ type: String, default: null })
  mode: string;

  @IsIP()
  @IsOptional()
  @prop({ default: null, type: String })
  ip: string | null;

  @IsIn([LOG_CATEGORY])
  @IsString()
  @prop({ enum: TransportCategory, required: true, index: true })
  category: TransportCategory;

  @prop({ type: Object, default: null })
  ip_location: Partial<IPLocation> | null;
}
