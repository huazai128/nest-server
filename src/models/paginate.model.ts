import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { unknownToNumber } from '@app/transformers/value.transform';
import { SortType } from '@app/constants/enum.contant';

export class PaginateBaseDTO {
  @Min(1)
  @IsInt()
  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }) => unknownToNumber(value))
  page: number;

  @Min(1)
  @Max(1000)
  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }) => unknownToNumber(value))
  size: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  cursor: string;
}

export class PaginateSortDTO extends PaginateBaseDTO {
  @IsIn([SortType.Asc, SortType.Desc])
  @IsInt()
  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }) => unknownToNumber(value))
  sort?: SortType.Desc | SortType.Asc;
}
