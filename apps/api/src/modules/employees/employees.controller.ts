import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DEPARTMENTS, EMPLOYMENT_STATUSES } from '../../common/reference-data';
import type { AuthUser } from '../auth/auth-user';
import { EmployeesService } from './employees.service';

class ListEmployeesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(DEPARTMENTS)
  department?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsIn(EMPLOYMENT_STATUSES)
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsIn(['name', 'employeeId', 'department', 'hireDate'])
  sort?: 'name' | 'employeeId' | 'department' | 'hireDate';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}

@ApiTags('employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  list(@Query() query: ListEmployeesQueryDto, @CurrentUser() user: AuthUser) {
    return this.employees.list(query, user.role);
  }

  @Get(':employeeId')
  async get(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const employee = await this.employees.get(employeeId, user.role);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return employee;
  }
}
