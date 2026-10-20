export type AggregateMetric = 'median' | 'average' | 'min' | 'max';

export type QuestionFilters = {
  department?: string;
  country?: string;
  status?: string;
  currency?: string;
};

export type QuestionIntent =
  | {
      type: 'aggregate';
      metric: AggregateMetric;
      groupBy: Array<'department' | 'country' | 'employmentStatus'>;
      filters: QuestionFilters;
    }
  | {
      type: 'count';
      groupBy: Array<'department' | 'country' | 'employmentStatus'>;
      filters: QuestionFilters;
    }
  | {
      type: 'distribution';
      filters: QuestionFilters;
    }
  | {
      type: 'topBottom';
      direction: 'highest' | 'lowest';
      filters: QuestionFilters;
    }
  | {
      type: 'currentSalary';
      employeeId: string;
    };

export type InterpretResult =
  | { supported: true; intent: QuestionIntent }
  | {
      supported: false;
      reason: string;
      clarification?: string;
      suggestions: string[];
    };

export interface QuestionInterpreter {
  interpret(question: string): InterpretResult;
}
