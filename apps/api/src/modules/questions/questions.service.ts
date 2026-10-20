import { Inject, Injectable } from '@nestjs/common';
import { analyticsDefinition } from '../../common/reference-data';
import { AnalyticsService } from '../analytics/analytics.service';
import type {
  QuestionIntent,
  QuestionInterpreter,
} from './interpreters/interpreter.interface';

export const QUESTION_INTERPRETER = Symbol('QUESTION_INTERPRETER');

@Injectable()
export class QuestionsService {
  constructor(
    private readonly analytics: AnalyticsService,
    @Inject(QUESTION_INTERPRETER)
    private readonly interpreter: QuestionInterpreter,
  ) {}

  async ask(question: string) {
    const interpreted = this.interpreter.interpret(question);
    if (!interpreted.supported) {
      return interpreted;
    }
    const generatedAt = new Date().toISOString();
    const definition = analyticsDefinition(this.analytics.minGroupSize());
    const payload = await this.run(interpreted.intent, definition);
    const currencies = [
      ...new Set(
        payload.results
          .map((row) => row.currency)
          .filter((currency): currency is string => Boolean(currency)),
      ),
    ];
    return {
      supported: true as const,
      intent: interpreted.intent.type,
      metric: metricOf(interpreted.intent),
      groupBy: groupByOf(interpreted.intent),
      filters: filtersOf(interpreted.intent),
      currency: currencies.length === 1 ? currencies[0] : null,
      results: payload.results,
      definition: payload.definition,
      rowCount: payload.results.length,
      generatedAt,
    };
  }

  private async run(intent: QuestionIntent, definition: string) {
    if (intent.type === 'currentSalary') {
      const current = await this.analytics.currentSalary(intent.employeeId);
      return {
        definition: current.definition,
        results: current.currentSalary
          ? [
              {
                currency: current.currentSalary.currency,
                employeeId: intent.employeeId,
                currentSalary: current.currentSalary,
              },
            ]
          : [],
      };
    }
    if (intent.type === 'distribution') {
      const distribution = await this.analytics.distribution(intent.filters);
      return {
        definition: distribution.definition,
        results: distribution.results,
      };
    }
    if (intent.type === 'topBottom') {
      const ranked = await this.analytics.rank(
        intent.filters,
        intent.direction,
      );
      return {
        definition: `${definition} Ranking is calculated separately inside each currency. Tied groups are all returned.`,
        results: ranked.results,
      };
    }
    if (intent.type === 'count') {
      const summary = await this.analytics.summary({
        ...intent.filters,
        groupBy: intent.groupBy,
      });
      return {
        definition,
        results: summary.results.map((row) => ({
          currency: row.currency,
          department: row.department,
          country: row.country,
          employmentStatus: row.employmentStatus,
          count: row.count,
        })),
      };
    }
    const summary = await this.analytics.summary({
      ...intent.filters,
      groupBy: intent.groupBy,
    });
    return { definition, results: summary.results };
  }
}

function metricOf(intent: QuestionIntent) {
  if (intent.type === 'aggregate') return intent.metric;
  if (intent.type === 'count') return 'count';
  if (intent.type === 'distribution') return 'distribution';
  if (intent.type === 'topBottom') return 'average';
  return 'current';
}

function groupByOf(intent: QuestionIntent) {
  if (intent.type === 'aggregate' || intent.type === 'count')
    return intent.groupBy;
  if (intent.type === 'topBottom') return ['department'];
  return [];
}

function filtersOf(intent: QuestionIntent) {
  if (intent.type === 'currentSalary') return { employeeId: intent.employeeId };
  return intent.filters;
}
