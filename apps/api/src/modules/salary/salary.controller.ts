import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestId } from '../../common/decorators/request-id.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/reference-data';
import type { AuthUser } from '../auth/auth-user';
import { SalaryService } from './salary.service';

class UpdateSalaryDto {
  @IsInt()
  @Min(1)
  amountMinor!: number;

  @IsString()
  currency!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  effectiveDate!: string;

  @IsInt()
  version!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

@ApiTags('salary')
@ApiBearerAuth()
@Controller('employees/:employeeId/salary')
export class SalaryController {
  constructor(private readonly salary: SalaryService) {}

  @Get()
  @Roles(Role.HrManager, Role.HrViewer)
  current(@Param('employeeId') employeeId: string) {
    return this.salary.current(employeeId);
  }

  @Get('history')
  @Roles(Role.HrManager, Role.HrViewer, Role.Auditor)
  history(@Param('employeeId') employeeId: string) {
    return this.salary.history(employeeId);
  }

  @Put()
  @Roles(Role.HrManager)
  update(
    @Param('employeeId') employeeId: string,
    @Body() body: UpdateSalaryDto,
    @CurrentUser() user: AuthUser,
    @RequestId() requestId?: string,
  ) {
    return this.salary.update(employeeId, body, user, requestId);
  }
}
