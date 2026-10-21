import { useMutation, useQuery } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { apiFetch } from '../../api/client';
import type { QuestionResponse } from '../../api/types';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ErrorState } from '../../components/ErrorState';
import { controlClass, Field } from '../../components/Field';
import { useI18n } from '../../i18n/locale-context';
import { useAuth } from '../auth/auth-context';

export function QuestionsPage() {
  const { session } = useAuth();
  const { t } = useI18n();
  const [question, setQuestion] = useState(
    'What is the median salary in India by department?',
  );
  const supported = useQuery({
    queryKey: ['supported-questions'],
    queryFn: () =>
      apiFetch<{ intents: Array<{ example: string }> }>(
        '/api/v1/questions/supported',
        {},
        session?.token,
      ),
  });
  const ask = useMutation({
    mutationFn: (value: string) =>
      apiFetch<QuestionResponse>(
        '/api/v1/questions',
        { method: 'POST', body: JSON.stringify({ question: value }) },
        session?.token,
      ),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    ask.mutate(question);
  }

  return (
    <section className="grid gap-4">
      <h1 className="text-2xl">{t('questions.title')}</h1>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <Field label={t('questions.question')} htmlFor="question">
          <textarea
            id="question"
            className={controlClass}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={3}
          />
        </Field>
        <Button type="submit" disabled={ask.isPending} className="w-fit">
          {t('questions.ask')}
        </Button>
      </form>
      {supported.data ? (
        <ul className="flex flex-wrap gap-2">
          {supported.data.intents.map((intent) => (
            <li key={intent.example} className="max-w-full">
              <Button
                className="h-auto whitespace-normal text-left"
                onClick={() => setQuestion(intent.example)}
              >
                {intent.example}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {ask.isError ? (
        <ErrorState
          message={
            ask.error instanceof Error
              ? ask.error.message
              : t('questions.error')
          }
        />
      ) : null}
      {ask.data && !ask.data.supported ? (
        <Card>
          <p>{ask.data.reason}</p>
          {ask.data.clarification ? <p>{ask.data.clarification}</p> : null}
          {ask.data.suggestions.length > 0 ? (
            <ul>
              {ask.data.suggestions.map((suggestion) => (
                <li key={suggestion}>{suggestion}</li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}
      {ask.data?.supported ? (
        <Card>
          <p>{ask.data.definition}</p>
          <p>
            {t('questions.rows', { count: ask.data.rowCount })}
            {ask.data.currency ? ` · ${ask.data.currency}` : ''}
          </p>
          <pre className="overflow-auto text-sm">
            {JSON.stringify(ask.data.results, null, 2)}
          </pre>
        </Card>
      ) : null}
    </section>
  );
}
