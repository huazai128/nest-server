import { PublishState } from '@app/constants/enum.contant';
import { PaginateSortDTO } from '@app/models/paginate.model';
import { DateQueryDTO, KeywordDTO } from '@app/models/query.model';
import { IntersectionType } from '@nestjs/mapped-types';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SITE_PUBLISH_STATES } from './site.model';
import { Transform } from 'class-transformer';
import { unknownToNumber } from '@app/transformers/value.transform';

export class SitePaginateDTO extends IntersectionType(
  PaginateSortDTO,
  KeywordDTO,
  DateQueryDTO,
) {
  @IsIn(SITE_PUBLISH_STATES)
  @IsInt()
  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }) => unknownToNumber(value))
  state?: PublishState;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  siteId: string;
}
