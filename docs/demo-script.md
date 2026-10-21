# Demo script

1. Copy `.env.example` to `.env`, then run `npm install`, `npm run seed`, and `npm run dev`.
2. Open http://localhost:5173 and sign in as `hr.manager@acme.test` / `Password123!`. Use Night and Day in the header to confirm both themes stay readable.
3. Search for `José`. Open `EMP-000001` and confirm the directory shows a current salary. Pagination sits at the top right of the directory.
4. On Employees, open **Bulk Import Employees**. Download the CSV or Excel template. Upload a file with one new valid employee and one row whose department is not in the list. Preview highlights the invalid row and writes nothing. Confirm. A dialog shows how many employees imported and how many failed, and it can be closed. Download the Excel feedback file and confirm each row has an import result and a feedback message. Search for the new employee and confirm the invalid row was not created.
5. Optional: upload the unchanged template. It creates `EMP-900001` (Ada Lovelace, with a hire salary) and `EMP-900002` (Grace Hopper, no salary). Upload that same template again and both rows are skipped as duplicates.
6. On an employee page, add a salary with an effective date after the latest history row. The form starts on the next valid date. Confirm the previous amount remains in the history table. A future effective date does not change the current salary until that date.
7. Open Audit and find the `SALARY_UPDATE` row for that employee. An import also writes `EMPLOYEE_IMPORT`, plus `SALARY_UPDATE` when the row included a hire salary.
8. Open Analytics. Group by department and confirm a small group shows `Suppressed` instead of a median. Executive employees in Canada are seeded as a group of three. The headcount, median, and distribution charts follow the selected currency and use the API figures.
9. Open Questions and ask `What is the median salary in India by department?`. The answer includes the filters, currency split, and the calculation definition.
10. Ask `Delete all salaries`. The page shows a rejection and no salary figures.
11. Sign out and sign in as `directory.user@acme.test`. The directory has no salary column and no bulk import. Analytics, Questions, and Audit are not in the navigation. `hr.viewer@acme.test` can read salaries and analytics, and cannot import or update. `auditor@acme.test` can open Audit and salary history, and cannot import.
