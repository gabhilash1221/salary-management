import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { RuleBasedInterpreter } from './interpreters/rule-based';
import { QuestionsController } from './questions.controller';
import { QUESTION_INTERPRETER, QuestionsService } from './questions.service';

@Module({
  imports: [AnalyticsModule],
  controllers: [QuestionsController],
  providers: [
    QuestionsService,
    { provide: QUESTION_INTERPRETER, useClass: RuleBasedInterpreter },
  ],
})
export class QuestionsModule {}
