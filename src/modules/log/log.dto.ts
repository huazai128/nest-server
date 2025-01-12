import { MetricsName, TransportCategory } from '@app/constants/enum.contant';
import { PaginateSortDTO } from '@app/models/paginate.model';
import {
  DateQueryDTO,
  KeyIdQueryDTO,
  KeywordDTO,
  SiteIdQueryDTO,
  TimeSlotQueryDTO,
} from '@app/models/query.model';
import { SaveLogRequest } from '@app/protos/log';
import {
  LOG_CATEGORY,
  MechanismTypes,
  MetricsTypes,
} from '@app/constants/report.contant';
import { IntersectionType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export interface LogData extends Partial<SaveLogRequest> {}

export class LogSearchDTO {
  @IsIn(LOG_CATEGORY)
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  category: TransportCategory;

  @IsIn([...MetricsTypes, ...MechanismTypes])
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  reportsType?: MetricsName;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  traceId?: string;
}

export class LogPaginateQueryDTO extends IntersectionType(
  PaginateSortDTO,
  KeywordDTO,
  DateQueryDTO,
  LogSearchDTO,
  SiteIdQueryDTO,
  KeyIdQueryDTO,
) {}

export class LogChartQueryDTO extends IntersectionType(
  LogSearchDTO,
  DateQueryDTO,
  KeywordDTO,
  SiteIdQueryDTO,
  TimeSlotQueryDTO,
  KeyIdQueryDTO,
) {}

export class LogAggregationSearchDTO extends IntersectionType(
  LogPaginateQueryDTO,
) {
  @IsIn(['page', 'api'])
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  type: string;
}
