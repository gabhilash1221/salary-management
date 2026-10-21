import { Injectable } from '@nestjs/common';
import {
  COUNTRY_NAMES,
  DEPARTMENTS,
  foldLookup,
  resolveCountryCode,
  resolveDepartmentName,
} from '../../../common/reference-data';
import { SUGGESTED_QUESTIONS } from '../intents/catalog';
import type {
  InterpretResult,
  QuestionFilters,
  QuestionInterpreter,
} from './interpreter.interface';

@Injectable()
export class RuleBasedInterpreter implements QuestionInterpreter {
  interpret(question: string): InterpretResult {
    const text = question.trim().replace(/\s+/g, ' ');
    if (!text) {
      return unsupported('Enter a question.', SUGGESTED_QUESTIONS);
    }
    if (
      /\b(ignore|disregard)\b[\s\S]{0,40}\b(instruction|prompt|rule)s?\b/i.test(
        text,
      ) ||
      /\b(drop|delete)\b[\s\S]{0,40}\b(table|database|sql)\b/i.test(text)
    ) {
      return unsupported(
        'That question is outside the supported catalog.',
        SUGGESTED_QUESTIONS,
      );
    }
    if (
      /\b(update|change|set|delete|increase|decrease|insert|drop)\b/i.test(
        text,
      ) &&
      /\b(salary|salaries|pay)\b/i.test(text)
    ) {
      return unsupported(
        'Salary changes are not available through questions.',
        [],
      );
    }

    const current = text.match(/current salary of (emp-\d+)/i);
    if (current?.[1]) {
      return {
        supported: true,
        intent: { type: 'currentSalary', employeeId: current[1].toUpperCase() },
      };
    }

    const aggregate = text.match(
      /(?:what is the )?(median|average|minimum|maximum|min|max) salary in (?:the )?([\p{L} -]+?) by (department|departamento|country|pais|país|status|estado|employment status)\b/iu,
    );
    if (aggregate?.[1] && aggregate[2] && aggregate[3]) {
      const country = resolveCountry(aggregate[2]);
      if (!country.ok) return country.result;
      return {
        supported: true,
        intent: {
          type: 'aggregate',
          metric: normalizeMetric(aggregate[1]),
          groupBy: [normalizeDimension(aggregate[3])],
          filters: { country: country.code },
        },
      };
    }

    const count = text.match(
      /how many employees are in (?:the )?([\p{L} -]+?) by (status|estado)\b/iu,
    );
    if (count?.[1]) {
      const country = resolveCountry(count[1]);
      if (!country.ok) return country.result;
      return {
        supported: true,
        intent: {
          type: 'count',
          groupBy: ['employmentStatus'],
          filters: { country: country.code },
        },
      };
    }

    const distribution = text.match(
      /salary distribution for ([\p{L}]+) in (?:the )?([\p{L} -]+)/iu,
    );
    if (distribution?.[1] && distribution[2]) {
      const department = resolveDepartment(distribution[1]);
      if (!department.ok) return department.result;
      const country = resolveCountry(distribution[2]);
      if (!country.ok) return country.result;
      return {
        supported: true,
        intent: {
          type: 'distribution',
          filters: { department: department.name, country: country.code },
        },
      };
    }

    const rank = text.match(
      /which department has the (highest|lowest) average salary in (?:the )?([\p{L} -]+)/iu,
    );
    if (rank?.[1] && rank[2]) {
      const country = resolveCountry(rank[2]);
      if (!country.ok) return country.result;
      return {
        supported: true,
        intent: {
          type: 'topBottom',
          direction: rank[1].toLowerCase() === 'highest' ? 'highest' : 'lowest',
          filters: { country: country.code },
        },
      };
    }

    return unsupported(
      'That question is outside the supported catalog.',
      SUGGESTED_QUESTIONS,
    );
  }
}

function normalizeMetric(value: string): 'median' | 'average' | 'min' | 'max' {
  const metric = value.toLowerCase();
  if (metric === 'minimum') return 'min';
  if (metric === 'maximum') return 'max';
  if (
    metric === 'average' ||
    metric === 'median' ||
    metric === 'min' ||
    metric === 'max'
  )
    return metric;
  return 'median';
}

function normalizeDimension(
  value: string,
): 'department' | 'country' | 'employmentStatus' {
  const dimension = foldLookup(value);
  if (dimension === 'country' || dimension === 'pais') return 'country';
  if (
    dimension === 'status' ||
    dimension === 'estado' ||
    dimension === 'employment status'
  ) {
    return 'employmentStatus';
  }
  return 'department';
}

function resolveCountry(
  raw: string,
): { ok: true; code: string } | { ok: false; result: InterpretResult } {
  const name = clean(raw).replace(/^the\s+/i, '');
  const code = resolveCountryCode(name);
  if (!code) {
    return {
      ok: false,
      result: unsupported(
        `Unknown country "${clean(raw)}".`,
        COUNTRY_NAMES,
        'Use a supported country name.',
      ),
    };
  }
  return { ok: true, code };
}

function resolveDepartment(
  raw: string,
): { ok: true; name: string } | { ok: false; result: InterpretResult } {
  const name = resolveDepartmentName(clean(raw));
  if (!name) {
    return {
      ok: false,
      result: unsupported(
        `Unknown department "${clean(raw)}".`,
        [...DEPARTMENTS],
        'Use a supported department name.',
      ),
    };
  }
  return { ok: true, name };
}

function clean(value: string) {
  return value
    .trim()
    .replace(/[?.!]+$/g, '')
    .trim();
}

function unsupported(
  reason: string,
  suggestions: readonly string[],
  clarification?: string,
): InterpretResult {
  return {
    supported: false,
    reason,
    clarification,
    suggestions: [...suggestions],
  };
}

export type { QuestionFilters };
