import { Module } from '@nestjs/common';
import { EmployeeImportController } from './employee-import.controller';
import { EmployeeImportService } from './employee-import.service';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
  controllers: [EmployeeImportController, EmployeesController],
  providers: [EmployeeImportService, EmployeesService],
})
export class EmployeesModule {}
