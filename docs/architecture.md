# Architecture

Salary Management is a modular monolith. `apps/api` is a NestJS service with Prisma and SQLite. `apps/web` is a React and Vite client. npm workspaces tie them together. There is no shared package: the API owns its DTOs, and the web app keeps its own response types until a type is actually imported by both sides.

## Modules

The API is split into auth, employees, salary, analytics, questions, audit, and health. Employee import lives in the employees module: column definitions, CSV and Excel parsing, row validation, templates, and the preview/confirm service. Questions interpret text into a structured intent and then call the analytics service. They do not calculate medians, averages, or distributions themselves. The rule-based interpreter is the only interpreter in this scaffold. An LLM adapter is intentionally absent.

Salary updates, history inserts, and audit inserts run in one Prisma transaction. A stale employee version returns 409 and writes nothing. A bulk import creates the ready employees, optional hire salaries, and audit rows in one transaction as well. Money is stored as integer minor units. Median, average, and percentiles are computed in the analytics service because SQLite has no decimal or median type. The analytics page charts those API results; it does not recalculate them.

## Access

Demo users are seeded local accounts with bcrypt password hashes. When `JWT_EXPIRES_IN` is unset, tokens expire after 15 minutes. `.env.example` sets one day so a demo session lasts through the script. Directory responses include current salary only for HR Manager and HR Viewer. Analytics and questions are limited to those two roles. Audit is limited to HR Manager and Auditor. Salary history is also visible to the Auditor. Bulk import is HR Manager only. Import audit actions are `EMPLOYEE_IMPORT` and, when the row includes a hire salary, `SALARY_UPDATE`.

Search stores a Unicode case-folded copy of each name (`firstNameKey`, `lastNameKey`) because SQLite `LIKE` is only case-insensitive for ASCII.

## Trade-offs

- SQLite keeps the demo free of a database server and allows one writer at a time. Prisma keeps a later move to PostgreSQL in the data layer. Import confirmations use a 30 second transaction and batches of 200 rows so that single writer stays predictable.
- Bulk import is preview, then confirm. The browser does not send a parsed row list back. Confirm uploads the file again and the API parses it. Ready rows are inserted together. Invalid rows stay out of the database and are reported. Duplicates are skipped. If the database rejects the batch, that confirm is rolled back and the user is asked to preview again.
- Imports are capped at 2,000 data rows and 2 MB. That bound is the reliability choice for SQLite, not a claim that larger files are impossible later.
- Excel reading and template writing use ExcelJS. CSV parsing is local, so the API does not take a second spreadsheet library for `.csv`. ExcelJS brings older transitive packages; the upload is still size-capped, signature-checked, and kept in memory.
- The feedback workbook is an Excel file the browser builds from the confirm response. Every row has an import result and a feedback message. The API does not store the upload or a second file.
- Salary amounts use minor units. Prisma’s SQLite integer is 32-bit, so an amount is rejected above `2,147,483,647` even when `MAX_AMOUNT_MINOR` is larger. Import annual amounts are major units in the file and are converted to minor units before that check.
- The web UI uses Tailwind and shared components. Day and night mode is a class on the document, stored in `localStorage`. Charts only display numbers the analytics API returned.
- Docker Compose is not part of this setup. `npm run dev` is the demo command.
- Swagger is served with Helmet content security policy disabled so the docs page can load its scripts.
- Password hashes use a fixed bcrypt salt for the four demo users so re-seeding those accounts stays repeatable. Employee and salary rows are generated from seed `42`.
- There is no shared types package. The API and the web app each own their response shapes.

## Known limitations

Approval workflow, currency conversion, and production single sign-on are out of scope. Group suppression defaults to five employees and is configured with `ANALYTICS_MIN_GROUP_SIZE`. Distribution buckets are 5,000,000 minor units wide.

Bulk import does not update existing employees. A duplicate id or email is skipped. A current salary appears only when its effective date is today or earlier. The sample template rows are real importable employees (`EMP-900001` Ada Lovelace and `EMP-900002` Grace Hopper); a second upload of that template skips them. A hostile `.xlsx` is limited by the 2 MB cap, and the parser still expands the workbook in memory.
