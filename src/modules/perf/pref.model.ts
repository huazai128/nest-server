import { getProviderByTypegoose } from '@app/transformers/model.transform';
import { indexOptions, indexWeights, Report } from '@app/utils/report';
import { AutoIncrementID } from '@typegoose/auto-increment';
import {
  modelOptions,
  prop,
  plugin,
  index,
  Severity,
} from '@typegoose/typegoose';
import {
  IsString,
  IsArray,
  IsNumber,
  IsUrl,
  IsOptional,
  ArrayUnique,
  IsDefined,
  IsObject,
  IsBoolean,
} from 'class-validator';
import * as paginate from 'mongoose-paginate-v2';
import * as aggregatePaginate from 'mongoose-aggregate-paginate-v2';

export class ResourcePref {
  // name 资源地址
  @IsUrl()
  @IsOptional()
  @prop({ type: String, default: null })
  name: string | null;

  // transferSize 传输大小
  @IsNumber()
  @prop({ type: Number, default: 0 })
  transferSize: number;

  // initiatorType 资源类型
  @IsString()
  @prop({ type: String, default: null })
  initiatorType: string | null;

  // startTime 开始时间
  @IsNumber()
  @prop({ type: Number, default: 0 })
  startTime: number;

  // responseEnd 结束时间
  @IsNumber()
  @prop({ type: Number, default: 0 })
  responseEnd: number;

  //消耗时间
  @IsNumber()
  @prop({ type: Number, default: 0 })
  time: number;

  // DNS
  @IsNumber()
  @prop({ type: Number, default: 0 })
  dnsLookup: number;

  // TCP
  @IsNumber()
  @prop({ type: Number, default: 0 })
  initialConnect: number;

  // SSL
  @IsNumber()
  @prop({ type: Number, default: 0 })
  ssl: number;

  // 数据传输时间
  @IsNumber()
  @prop({ type: Number, default: 0 })
  request: number;

  //  请求响应耗时
  @IsNumber()
  @prop({ type: Number, default: 0 })
  ttfb: number;

  @IsNumber()
  @prop({ type: Number, default: 0 })
  contentDownload: number;

  // 是否命中缓存
  @IsBoolean()
  @prop({ type: Boolean, default: false })
  isCache: boolean;
}

export class NTiming {
  @IsNumber()
  @prop({ type: Number, default: null })
  fp: number | null;

  @IsNumber()
  @prop({ type: Number, default: null })
  tti: number | null;

  @IsNumber()
  @prop({ type: Number, default: null })
  domReady: number | null;

  @IsNumber()
  @prop({ type: Number, default: null })
  load: number | null;

  @IsNumber()
  @prop({ type: Number, default: null })
  firseByte: number | null;

  @IsNumber()
  @prop({ type: Number, default: null })
  dns: number | null;

  @IsNumber()
  @prop({ type: Number, default: null })
  tcp: number | null;

  @IsNumber()
  @prop({ type: Number, default: null })
  ssl: number | null;

  @IsNumber()
  @prop({ type: Number, default: null })
  ttfb: number | null;

  @IsNumber()
  @prop({ type: Number, default: null })
  trans: number | null;

  @IsNumber()
  @prop({ type: Number, default: null })
  domParse: number | null;

  @IsNumber()
  @prop({ type: Number, default: null })
  res: number | null;
}

export class PaintInfo {
  @IsNumber()
  @prop({ type: Number, default: null })
  duration: number | null;

  @IsString()
  @prop({ type: String, default: null })
  entryType: string | null;

  @IsString()
  @prop({ type: String, default: null })
  name: string | null;

  @IsNumber()
  @prop({ type: Number, default: null })
  startTime: number | null;
}

export class PrefDto extends Report {
  // 资源加载信息
  @ArrayUnique()
  @IsArray()
  @IsDefined()
  @prop({ type: () => [ResourcePref], default: [], _id: false })
  resourcePrefs: Array<ResourcePref>;

  // NT
  @IsObject()
  @IsDefined()
  @prop({ type: NTiming, _id: false, default: null })
  ntTiming: NTiming | null;

  // 首次有效绘制时长
  @IsNumber()
  @prop({ type: Number, default: null })
  fmpTime: number | null;

  // 灰屏
  @IsObject()
  @IsOptional()
  @prop({ type: PaintInfo, _id: false, default: null })
  fcpTime: Partial<PaintInfo> | null;

  // 白屏
  @IsObject()
  @IsOptional()
  @prop({ type: PaintInfo, _id: false, default: null })
  fpTime: Partial<PaintInfo> | null;
  // 资源加载命中缓存率
  @IsString()
  @prop({ type: Number, default: 0 })
  cacheRate: number;

  // performanceLog自定义埋点性能上报
  @IsNumber()
  @prop({ type: Number, default: 0 })
  exeTime: number;
}

@index(
  { ...indexOptions },
  {
    name: 'SearchIndex',
    weights: {
      ...indexWeights,
    },
  },
)
@plugin(AutoIncrementID, {
  field: 'id',
  incrementBy: 1,
  startAt: 1000000000,
  trackerCollection: 'identitycounters',
  trackerModelName: 'identitycounter',
})
@plugin(paginate)
@plugin(aggregatePaginate)
@modelOptions({
  options: { allowMixed: Severity.ALLOW },
  schemaOptions: {
    toObject: { getters: true },
    timestamps: {
      createdAt: 'create_at',
      updatedAt: 'update_at',
    },
  },
})
export class PrefLog extends PrefDto {
  @prop({ unique: true }) // 设置唯一索引
  id: number;

  @prop({ default: Date.now, index: true, immutable: true })
  create_at?: Date;

  @prop({ default: Date.now })
  update_at?: Date;
}

export const PrefLogProvider = getProviderByTypegoose(PrefLog);
