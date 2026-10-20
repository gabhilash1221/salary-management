export const QUESTION_CATALOG = [
  {
    intent: 'salary_by_dimension',
    example: 'What is the median salary in India by department?',
  },
  {
    intent: 'employee_count',
    example: 'How many employees are in Germany by status?',
  },
  {
    intent: 'salary_distribution',
    example: 'Show the salary distribution for Engineering in the US',
  },
  {
    intent: 'top_bottom_group',
    example: 'Which department has the highest average salary in Canada?',
  },
  {
    intent: 'employee_current_salary',
    example: 'What is the current salary of EMP-000123?',
  },
] as const;

export const SUGGESTED_QUESTIONS = QUESTION_CATALOG.map((item) => item.example);
