import { stringToObject, unknownToNumber } from '@app/transformers/value.transform'
import { Transform } from 'class-transformer'
import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator'

export class KeywordDTO {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  kw?: string

  @IsObject()
  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }) => stringToObject(value))
  keywordParmas?: Record<string, string>
}

export class SiteIdQueryDTO {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  siteId: string
}
export class DateQueryDTO {
  @IsNumber()
  @IsOptional()
  @IsNotEmpty()
  @Transform(({ value }) => unknownToNumber(value))
  startTime?: number

  @IsNumber()
  @IsOptional()
  @IsNotEmpty()
  @Transform(({ value }) => unknownToNumber(value))
  endTime?: number
}

export class TimeSlotQueryDTO {
  @IsNumber()
  @IsOptional()
  @IsNotEmpty()
  @Transform(({ value }) => unknownToNumber(value))
  timeSlot: number
}

export class KeyIdQueryDTO {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  keyId: string
}
