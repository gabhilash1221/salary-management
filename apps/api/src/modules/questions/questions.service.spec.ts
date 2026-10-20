import type { QuestionInterpreter } from './interpreters/interpreter.interface';
import { QuestionsService } from './questions.service';

describe('QuestionsService', () => {
  it('returns the interpreter rejection without calling analytics', async () => {
    const analytics = {
      minGroupSize: () => 5,
      summary: jest.fn(),
      distribution: jest.fn(),
      rank: jest.fn(),
      currentSalary: jest.fn(),
    };
    const interpreter: QuestionInterpreter = {
      interpret: () => ({
        supported: false,
        reason: 'Unsupported',
        suggestions: ['Example'],
      }),
    };
    const service = new QuestionsService(analytics as never, interpreter);
    await expect(service.ask('nope')).resolves.toEqual({
      supported: false,
      reason: 'Unsupported',
      suggestions: ['Example'],
    });
    expect(analytics.summary).not.toHaveBeenCalled();
  });

  it('delegates a supported aggregate to analytics', async () => {
    const analytics = {
      minGroupSize: () => 5,
      summary: jest.fn().mockResolvedValue({
        results: [
          {
            currency: 'INR',
            department: 'Engineering',
            count: 10,
            suppressed: false,
            median: 100,
          },
        ],
      }),
      distribution: jest.fn(),
      rank: jest.fn(),
      currentSalary: jest.fn(),
    };
    const interpreter: QuestionInterpreter = {
      interpret: () => ({
        supported: true,
        intent: {
          type: 'aggregate',
          metric: 'median',
          groupBy: ['department'],
          filters: { country: 'IN' },
        },
      }),
    };
    const service = new QuestionsService(analytics as never, interpreter);
    const answer = await service.ask(
      'What is the median salary in India by department?',
    );
    expect(analytics.summary).toHaveBeenCalledWith({
      country: 'IN',
      groupBy: ['department'],
    });
    expect(answer).toMatchObject({
      supported: true,
      intent: 'aggregate',
      metric: 'median',
      currency: 'INR',
      rowCount: 1,
    });
  });
});
