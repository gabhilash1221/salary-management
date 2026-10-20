import { useMutation, useQuery } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { apiFetch } from '../../api/client';
import type { QuestionResponse } from '../../api/types';
import { ErrorState } from '../../components/ErrorState';
import { useAuth } from '../auth/auth-context';

export function QuestionsPage() {
  const { session } = useAuth();
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
    <section className="stack">
      <h1>Questions</h1>
      <form className="stack" onSubmit={onSubmit}>
        <label htmlFor="question">
          Question
          <textarea
            id="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={3}
          />
        </label>
        <button type="submit" disabled={ask.isPending}>
          Ask
        </button>
      </form>
      {supported.data ? (
        <ul>
          {supported.data.intents.map((intent) => (
            <li key={intent.example}>
              <button
                type="button"
                className="button"
                onClick={() => setQuestion(intent.example)}
              >
                {intent.example}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {ask.isError ? (
        <ErrorState
          message={
            ask.error instanceof Error
              ? ask.error.message
              : 'Could not ask the question'
          }
        />
      ) : null}
      {ask.data && !ask.data.supported ? (
        <div className="card">
          <p>{ask.data.reason}</p>
          {ask.data.clarification ? <p>{ask.data.clarification}</p> : null}
          {ask.data.suggestions.length > 0 ? (
            <ul>
              {ask.data.suggestions.map((suggestion) => (
                <li key={suggestion}>{suggestion}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {ask.data?.supported ? (
        <div className="card">
          <p>{ask.data.definition}</p>
          <p>
            {ask.data.rowCount} rows
            {ask.data.currency ? ` · ${ask.data.currency}` : ''}
          </p>
          <pre>{JSON.stringify(ask.data.results, null, 2)}</pre>
        </div>
      ) : null}
    </section>
  );
}
