import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  DEPARTMENTS,
  EMPLOYMENT_STATUSES,
  Role,
  SUPPORTED_CURRENCIES,
} from '../../common/reference-data';
import { AnalyticsService } from './analytics.service';
import type { Dimension } from './stats';

class AnalyticsQueryDto {
  @IsOptional()
  @IsIn(DEPARTMENTS)
  department?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @IsOptional()
  @IsIn(EMPLOYMENT_STATUSES)
  status?: string;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES)
  currency?: string;

  @IsOptional()
  @IsIn(['department', 'country', 'employmentStatus'])
  groupBy?: Dimension;

  @IsOptional()
  @IsIn(['department', 'country', 'employmentStatus'])
  groupBy2?: Dimension;
}

@ApiTags('analytics')
@ApiBearerAuth()
@Roles(Role.HrManager, Role.HrViewer)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  summary(@Query() query: AnalyticsQueryDto) {
    return this.analytics.summary({
      department: query.department,
      country: query.country,
      status: query.status,
      currency: query.currency,
      groupBy: dimensions(query),
    });
  }

  @Get('distribution')
  distribution(@Query() query: AnalyticsQueryDto) {
    return this.analytics.distribution({
      department: query.department,
      country: query.country,
      status: query.status,
      currency: query.currency,
    });
  }
}

function dimensions(query: AnalyticsQueryDto): Dimension[] {
  const values = [query.groupBy, query.groupBy2].filter(
    (value): value is Dimension => Boolean(value),
  );
  return [...new Set(values)].slice(0, 2);
}
