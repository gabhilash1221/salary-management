import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestId } from '../../common/decorators/request-id.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  DEPARTMENTS,
  EMPLOYMENT_STATUSES,
  Role,
} from '../../common/reference-data';
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
  @IsIn([
    'name',
    'employeeId',
    'department',
    'country',
    'status',
    'hireDate',
    'salary',
  ])
  sort?:
    | 'name'
    | 'employeeId'
    | 'department'
    | 'country'
    | 'status'
    | 'hireDate'
    | 'salary';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}

class WriteEmployeeDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  employeeId?: string;

  @IsString()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MaxLength(100)
  lastName!: string;

  @IsString()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MaxLength(40)
  department!: string;

  @IsString()
  @MaxLength(40)
  country!: string;

  @IsString()
  @MaxLength(80)
  jobTitle!: string;

  @IsString()
  @MaxLength(20)
  status!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  hireDate!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  terminationDate?: string | null;
}

class UpdateEmployeeDto extends WriteEmployeeDto {
  @Type(() => Number)
  @IsInt()
  version!: number;
}

class DeleteEmployeeDto {
  @Type(() => Number)
  @IsInt()
  version!: number;
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

  @Post()
  @Roles(Role.HrManager)
  create(
    @Body() body: WriteEmployeeDto,
    @CurrentUser() user: AuthUser,
    @RequestId() requestId?: string,
  ) {
    return this.employees.create(body, user, requestId);
  }

  @Patch(':employeeId')
  @Roles(Role.HrManager)
  update(
    @Param('employeeId') employeeId: string,
    @Body() body: UpdateEmployeeDto,
    @CurrentUser() user: AuthUser,
    @RequestId() requestId?: string,
  ) {
    return this.employees.update(employeeId, body, user, requestId);
  }

  @Delete(':employeeId')
  @Roles(Role.HrManager)
  remove(
    @Param('employeeId') employeeId: string,
    @Body() body: DeleteEmployeeDto,
    @CurrentUser() user: AuthUser,
    @RequestId() requestId?: string,
  ) {
    return this.employees.remove(employeeId, body.version, user, requestId);
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
