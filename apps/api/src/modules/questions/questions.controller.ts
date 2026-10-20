import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/reference-data';
import { QUESTION_CATALOG } from './intents/catalog';
import { QuestionsService } from './questions.service';

class AskQuestionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  question!: string;
}

@ApiTags('questions')
@ApiBearerAuth()
@Roles(Role.HrManager, Role.HrViewer)
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}

  @Get('supported')
  supported() {
    return { intents: QUESTION_CATALOG };
  }

  @Post()
  ask(@Body() body: AskQuestionDto) {
    return this.questions.ask(body.question);
  }
}
