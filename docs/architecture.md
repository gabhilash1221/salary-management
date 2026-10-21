# Architecture

Salary Management is a modular monolith. `apps/api` is a NestJS service with Prisma and SQLite. `apps/web` is a React and Vite client. npm workspaces tie them together. There is no shared package: the API owns its DTOs, and the web app keeps its own response types until a type is actually imported by both sides.

## Modules

The API is split into auth, employees, salary, analytics, questions, audit, and health. Employee import lives in the employees module: column definitions, CSV and Excel parsing, row validation, templates, and the preview/confirm service. Questions interpret text into a structured intent and then call the analytics service. They do not calculate medians, averages, or distributions themselves. The rule-based interpreter is the only interpreter in this scaffold. An LLM adapter is intentionally absent.

Salary updates, history inserts, and audit inserts run in one Prisma transaction. A stale employee version returns 409 and writes nothing. A bulk import creates the ready employees, optional hire salaries, and audit rows in one transaction as well. Money is stored as integer minor units. Median, average, and percentiles are computed in the analytics service because SQLite has no decimal or median type. The analytics page charts those API results; it does not recalculate them.

## Access

Demo users are seeded local accounts with bcrypt password hashes. When `JWT_EXPIRES_IN` is unset, tokens expire after 15 minutes. `.env.example` sets one day so a demo session lasts through the script. Directory responses include current salary only for HR Manager and HR Viewer. Analytics and questions are limited to those two roles. Audit is limited to HR Manager and Auditor. Salary history is also visible to the Auditor. Bulk import and employee create, update, and delete are HR Manager only. Import audit actions are `EMPLOYEE_IMPORT` and, when the row includes a hire salary, `SALARY_UPDATE`. Creating, editing, and deleting an employee write `EMPLOYEE_CREATE`, `EMPLOYEE_UPDATE`, and `EMPLOYEE_DELETE`. Deleting an employee also removes that employee's salary history.

Signed-in users have a display name, a day or night theme, and an optional profile photo on the user row. The photo is PNG, JPEG, or WebP, checked by signature, limited to 2 MB, and stored as bytes in SQLite. The avatar request needs the bearer token, so the browser fetches it and shows a blob URL. Without a photo, the header and profile show initials from the display name. A password change checks the current password and stores a new bcrypt hash with a random salt. The four demo accounts keep the fixed seed salt until someone changes that password.

A signed-in theme is also sent on the WebSocket at `/api/v1/theme`. The browser cannot set an `Authorization` header on a WebSocket, so the token is a query parameter. The server checks the token, then sends theme messages only to sockets for that user. The sign-in page has no token, so its theme stays in `localStorage`. The Vite dev server proxies `/api`, including that WebSocket.

English and Portuguese are catalogs in the web app, stored in this browser as `salary-locale`. Labels for navigation, forms, and tables change with the language. Department, status, and country values stored by the API stay the English names and ISO codes. The directory shows the translated label for those stored values. Import and the question parser also accept Portuguese names, such as Engenharia, Ativo, and Moçambique, and save the English value or country code. Question examples stay in English because that is the supported question catalog.

Search stores a Unicode case-folded copy of each name (`firstNameKey`, `lastNameKey`) because SQLite `LIKE` is only case-insensitive for ASCII.

## Trade-offs

- SQLite keeps the demo free of a database server and allows one writer at a time. Prisma keeps a later move to PostgreSQL in the data layer. Import confirmations use a 30 second transaction and batches of 200 rows so that single writer stays predictable.
- Bulk import is preview, then confirm. The browser does not send a parsed row list back. Confirm uploads the file again and the API parses it. Ready rows are inserted together. Invalid rows stay out of the database and are reported. Duplicates are skipped. If the database rejects the batch, that confirm is rolled back and the user is asked to preview again.
- Imports are capped at 2,000 data rows and 2 MB. That bound is the reliability choice for SQLite, not a claim that larger files are impossible later.
- Excel reading and template writing use ExcelJS. CSV parsing is local, so the API does not take a second spreadsheet library for `.csv`. ExcelJS brings older transitive packages; the upload is still size-capped, signature-checked, and kept in memory.
- The feedback workbook is an Excel file the browser builds from the confirm response. Every row has an import result and a feedback message. The API does not store the upload or a second file.
- Salary amounts use minor units. Prisma’s SQLite integer is 32-bit, so an amount is rejected above `2,147,483,647` even when `MAX_AMOUNT_MINOR` is larger. Import annual amounts are major units in the file and are converted to minor units before that check.
- The web UI uses Tailwind and shared components. Day and night mode is a class on the document. A signed-in choice is stored on the user and echoed to that user's sockets. The same browser also keeps `salary-theme` so the page can paint before the socket connects. Language is a local catalog, not a user field and not a socket broadcast, so two browsers for one person can use different languages.
- Profile photos live in the user row. That avoids a file store for the demo and keeps the photo inside the SQLite backup. It also makes the user row larger, and the image is not cached by a public URL.
- New seed currencies are BRL, AOA, MZN, CVE, XOF, and STN, plus the existing INR, USD, EUR, GBP, and CAD. Portugal uses EUR and Timor-Leste uses USD. Annual ranges stay inside the 32-bit integer after conversion to minor units. The app stores every currency with two decimal minor units, including XOF, whose ISO exponent is zero. Display divides by 100 and then formats the major amount.
- The employee directory table scrolls inside the space left on the page. The header, filters, and pagination stay put. Analytics shows a skeleton while a summary or distribution request is in flight. Charts only display numbers the analytics API returned.
- Docker Compose is not part of this setup. `npm run dev` is the demo command.
- Swagger is served with Helmet content security policy disabled so the docs page can load its scripts.
- Password hashes use a fixed bcrypt salt for the four demo users so re-seeding those accounts stays repeatable. Employee and salary rows are generated from seed `42`.
- There is no shared types package. The API and the web app each own their response shapes.

## Known limitations

Approval workflow, currency conversion, and production single sign-on are out of scope. Group suppression defaults to five employees and is configured with `ANALYTICS_MIN_GROUP_SIZE`. Distribution buckets are 5,000,000 minor units wide.

Bulk import does not update existing employees. A duplicate id or email is skipped. A current salary appears only when its effective date is today or earlier. The sample template rows are real importable employees (`EMP-900001` Ada Lovelace and `EMP-900002` Grace Hopper); a second upload of that template skips them. A hostile `.xlsx` is limited by the 2 MB cap, and the parser still expands the workbook in memory.

The question parser still expects the English sentence shapes. Portuguese words are accepted for country, department, and a few dimension names inside those shapes. A fully Portuguese question is rejected as unsupported. Theme sync does not update a signed-out tab. A language change does not follow the user to another browser. Re-seeding is required before the directory contains employees from the newer countries; the country filters list them either way. Deleting an employee deletes that salary history, which is the exception to immutable salary rows.
