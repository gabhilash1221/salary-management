import {
  BadRequestException,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestId } from '../../common/decorators/request-id.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/reference-data';
import type { AuthUser } from '../auth/auth-user';
import { MAX_IMPORT_BYTES } from './employee-import.columns';
import { EmployeeImportService } from './employee-import.service';
import {
  buildCsvTemplate,
  buildXlsxTemplate,
} from './employee-import.template';

type UploadedSpreadsheet = {
  originalname?: string;
  buffer?: Buffer;
};

const upload = FileInterceptor('file', {
  limits: { fileSize: MAX_IMPORT_BYTES },
});

@ApiTags('employees')
@ApiBearerAuth()
@Roles(Role.HrManager)
@Controller('employees/import')
export class EmployeeImportController {
  constructor(private readonly imports: EmployeeImportService) {}

  @Get('templates/employees.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="employee-import-template.csv"',
  )
  csvTemplate(): string {
    return buildCsvTemplate();
  }

  @Get('templates/employees.xlsx')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="employee-import-template.xlsx"',
  )
  async xlsxTemplate(): Promise<StreamableFile> {
    return new StreamableFile(await buildXlsxTemplate());
  }

  @Post('preview')
  @HttpCode(200)
  @UseInterceptors(upload)
  preview(
    @UploadedFile() file: UploadedSpreadsheet | undefined,
  ): Promise<unknown> {
    return this.imports.preview(requireFile(file));
  }

  @Post()
  @HttpCode(200)
  @UseInterceptors(upload)
  commit(
    @UploadedFile() file: UploadedSpreadsheet | undefined,
    @CurrentUser() user: AuthUser,
    @RequestId() requestId?: string,
  ): Promise<unknown> {
    return this.imports.commit(requireFile(file), user, requestId);
  }
}

function requireFile(file: UploadedSpreadsheet | undefined): {
  originalname: string;
  buffer: Buffer;
} {
  if (!file?.buffer) {
    throw new BadRequestException('Choose a .csv or .xlsx file');
  }
  return { originalname: file.originalname ?? '', buffer: file.buffer };
}
