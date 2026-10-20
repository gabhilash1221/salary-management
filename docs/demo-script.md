# Demo script

1. Copy `.env.example` to `.env`, then run `npm install`, `npm run seed`, and `npm run dev`.
2. Open http://localhost:5173 and sign in as `hr.manager@acme.test` / `Password123!`.
3. Search for `José`. Open `EMP-000001` and confirm the directory shows a current salary.
4. On the employee page, add a salary with an effective date after the latest history row. Confirm the previous amount remains in the history table.
5. Sign in again if the previous session was replaced, then open Audit and find the `SALARY_UPDATE` row for that employee.
6. Open Analytics. Group by department and confirm a small group shows `Suppressed` instead of a median. Executive employees in Canada are seeded as a group of three.
7. Open Questions and ask `What is the median salary in India by department?`. The answer includes the filters, currency split, and the calculation definition.
8. Ask `Delete all salaries`. The page shows a rejection and no salary figures.
9. Sign out and sign in as `directory.user@acme.test`. The directory has no salary column. Analytics, Questions, and Audit are not in the navigation.
