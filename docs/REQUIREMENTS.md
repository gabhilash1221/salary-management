# Salary Management — Product Requirements

Revised draft: testable requirements, explicit domain rules, data model, API outline and security model.

## 1. Goal

Replace spreadsheet-based salary management for 10,000 employees across multiple countries with a centralized, searchable and auditable web application. HR managers can maintain salary records and answer compensation questions using reliable, explainable, deterministic data.

## 2. Personas and Roles

| Role | Description | Permissions |
| --- | --- | --- |
| HR Manager (primary) | Finds employees, updates salaries, analyses compensation | Read/write salary, view analytics, ask questions, view audit trail |
| HR Viewer | Read-only HR staff | Read salary, analytics and Q\&A; no updates |
| Directory User | Non-compensation staff | Employee directory only; no salary fields anywhere (including analytics and Q&A) |
| Auditor | Compliance reviewer | Read-only audit trail and salary history |

Authentication for the initial release uses seeded demo users with hashed passwords and JWT access tokens. Production identity-provider integration is a non-goal.

## 3. Scope

### In scope

1. Employee directory with search, filters and server-side pagination.
2. Salary management with preserved history and audit trail.
3. Compensation analytics computed by the backend.
4. Constrained natural-language question answering.
5. Role-based access control, input validation and audit logging.
6. Reproducible seed script for exactly 10,000 synthetic employees.
7. Automated tests, API documentation and documented deployment steps.

### Out of scope for the initial release

Bulk imports, approval workflows, multi-level compensation reviews and predictive salary recommendations (see Roadmap).

## 4. Functional Requirements

### FR-1 Employee directory

- Search by employee ID (exact) or name (case-insensitive, contains match on first or last name).
- Filter by department, country and employment status; filters combine with AND.
- Server-side pagination: default page size 25, maximum 100; response includes total count, page and page size.
- Sort by name, employee ID, department, hire date; default is name ascending with a stable tie-breaker on ID.
- Directory responses include salary fields only for roles permitted to see them.

### FR-2 Salary management

- View an employee's current salary: amount, currency, effective date.
- Update salary with amount, currency, effective date and an optional reason/comment.
- Every update creates a new salary history record; previous records are never modified or deleted.
- Every update creates an audit record in the same database transaction as the history record.
- View full salary history for an employee, newest first.
- Concurrent edits are detected with optimistic concurrency: the update request carries the employee's version and the API returns 409 Conflict when it is stale.

### FR-3 Compensation analytics

- Metrics: employee count, minimum, maximum, average, median, and selected percentiles (P25, P75).
- Dimensions: department, country, currency, employment status, and combinations of up to two dimensions.
- Results are always grouped by currency. The system never blends currencies into one figure.
- Groups smaller than a configurable minimum size (default 5) return the count but suppress salary statistics, to avoid exposing individual salaries.
- All figures are calculated by the backend from persisted data, never in the browser or by an LLM.

### FR-4 Question answering

- Supports a closed list of question intents (section 9), each mapped to a deterministic, parameterized query.
- Every answer returns the result, the filters applied, the currency, and a plain-language definition of the calculation.
- Unsupported or ambiguous questions are rejected or clarified. The system never fabricates data or answers from model knowledge.
- Works fully without an LLM using a rule-based parser. An LLM may optionally be used as an interpretation layer behind the same interface (section 9.3).

### FR-5 Audit trail

- Audit entries are append-only and have no update or delete API.
- Authorized roles can view and filter the audit trail by employee, actor, action and date range, with pagination.

## 5. Domain Rules

| Rule | Definition |
| --- | --- |
| Money representation | Amounts stored as integers in minor units (e.g. cents, paise) with an ISO 4217 currency code. No floating point. |
| Valid amount | Greater than zero, within a configurable maximum per currency. |
| Currency | Must be a supported ISO 4217 code. Each employee has one active currency at a time; a currency change creates a normal history record and is audited. |
| Effective date | Not earlier than the employee's hire date. Must be later than the effective date of the latest existing record unless an explicit backdating rule is enabled. Future-dated changes are allowed. |
| Current salary | The record with the latest effective date that is on or before today. Future-dated records do not count until their date arrives. |
| Employment status | Active, On Leave, Terminated. Analytics default to Active and On Leave; Terminated is included only when requested. |
| Employee ID | Unique, immutable, format `EMP-` followed by a zero-padded number. |
| Median | For an even number of values, the mean of the two middle values, rounded to the nearest minor unit. |

## 6. Data Model

### Employee

id (internal), employeeId (unique), firstName, lastName, email (unique), department, country (ISO 3166-1 alpha-2), jobTitle, status, hireDate, terminationDate (nullable), version, createdAt, updatedAt.

### SalaryRecord (immutable history)

id, employeeId (FK), amountMinor (integer), currency (ISO 4217), effectiveDate, reason (nullable), createdByUserId, createdAt.

### AuditLog (append-only)

id, timestamp, actorUserId, actorRole, action (e.g. SALARY\_UPDATE, LOGIN, EXPORT), entityType, entityId, oldValue (JSON), newValue (JSON), reason, requestId.

### User

id, email (unique), passwordHash, role, isActive, createdAt.

### Indexes

Unique on employeeId and email; indexes on department, country, status, (lastName, firstName), and on SalaryRecord (employeeId, effectiveDate); indexes on AuditLog for entityId, actorUserId and timestamp.

## 7. API Outline

All endpoints are under `/api/v1`, require a bearer token (except login), validate input with DTOs (unknown properties rejected) and return a consistent error body: `{ statusCode, error, message, details[], requestId }`.

| Method | Path | Purpose | Roles |
| --- | --- | --- | --- |
| POST | /auth/login | Obtain access token | Public |
| GET | /employees | Search, filter, sort, paginate | All |
| GET | /employees/:id | Employee detail (salary fields by role) | All |
| GET | /employees/:id/salary | Current salary | HR Manager, HR Viewer |
| GET | /employees/:id/salary/history | Salary history | HR Manager, HR Viewer, Auditor |
| PUT | /employees/:id/salary | Update salary (requires version) | HR Manager |
| GET | /analytics/summary | Counts and statistics by dimensions | HR Manager, HR Viewer |
| GET | /analytics/distribution | Salary distribution buckets per currency | HR Manager, HR Viewer |
| POST | /questions | Ask a supported natural-language question | HR Manager, HR Viewer |
| GET | /questions/supported | List supported intents and examples | HR Manager, HR Viewer |
| GET | /audit | Query audit trail | HR Manager, Auditor |
| GET | /health | Liveness and database check | Public |

Interactive documentation is exposed through OpenAPI (Swagger) and kept in sync with the DTOs.

## 8. Analytics Definitions

- **Grouping:** every result row carries dimension values plus a currency code. A request without a currency filter returns one row per currency per group.
- **Minimum group size:** groups under the threshold return `count` and `suppressed: true` instead of statistics.
- **Distribution:** fixed-width buckets computed per currency from persisted data; bucket edges are returned with the response.
- **Currency conversion:** out of scope. Cross-currency comparison is only available if a future exchange-rate source and policy are approved, and then only with the rate date and source shown in the result.
- **Consistency:** analytics and Q&A use the same query service, so identical questions produce identical numbers.

## 9. Question Answering

### 9.1 Supported intents

| Intent | Example |
| --- | --- |
| Median / average / min / max salary by dimension | What is the median salary in India by department? |
| Employee count by dimension | How many employees are in Germany by status? |
| Salary distribution | Show the salary distribution for Engineering in the US |
| Top/bottom groups by metric | Which department has the highest average salary in Canada? |
| Employee current salary | What is the current salary of EMP-000123? |

Filters supported in questions: department, country, employment status, currency.

### 9.2 Response contract

Supported: `{ supported: true, intent, metric, groupBy[], filters, currency, results[], definition, rowCount, generatedAt }`.

Unsupported or ambiguous: `{ supported: false, reason, clarification?, suggestions[] }`.

Ambiguity rules: unknown department or country names return suggestions rather than guesses; a question implying a cross-currency blend returns per-currency results with a note, or asks for a currency; salary-update or free-form data-modification requests are always rejected.

### 9.3 Optional LLM layer

- The LLM may only translate text into a structured intent object validated against a strict schema (allowed intents, metrics, dimensions, filter values).
- The backend then runs the matching deterministic query. The LLM never writes SQL, never sees salary data, and never produces the numbers in the answer.
- Invalid or unrecognized model output falls back to the rule-based parser or to an unsupported response.
- Prompt-injection attempts in the question text cannot change the allowed intent set; tests cover this.

## 10. Security and Integrity

- Role-based access control enforced in the backend on every endpoint and at field level (salary fields stripped for Directory Users in directory, analytics and Q&A responses).
- Passwords hashed with a modern algorithm (argon2 or bcrypt); short-lived JWTs; login rate limiting.
- All inputs validated and sanitized; Prisma parameterized queries only; no raw SQL built from user input.
- Audit entries record actor, role, action, entity, old and new values, reason and request ID; sensitive reads of salary data by non-HR roles are denied and logged.
- CORS restricted to the configured frontend origin; secrets only through environment variables with a committed `.env.example`.
- Salary update, history insert and audit insert execute in one transaction, or none are applied.

## 11. Non-Functional Requirements

| Area | Target (on the 10,000-row seeded dataset) |
| --- | --- |
| Directory search/filter | p95 under 300 ms |
| Analytics endpoints | p95 under 1 s |
| Salary update | p95 under 300 ms |
| Seed script | Completes in under 60 s; deterministic output for a given seed |
| Availability of demo | Starts with a single documented command |
| Observability | Structured logs with request IDs; health endpoint |
| UI states | Loading, empty and error states on all data screens; keyboard-accessible forms with labelled inputs |

## 12. Seed Data

- Exactly 10,000 synthetic employees, generated from a fixed random seed with a documented command (for example `npm run seed`). Re-running resets and regenerates the identical dataset.
- Multiple countries, each with a realistic currency (for example INR, USD, EUR, GBP, CAD) and plausible salary ranges per department and country.
- Realistic distributions of departments, job titles, hire dates and statuses, including some Terminated and On Leave employees.
- Between one and five salary history records per employee, consistent with hire dates.
- Edge cases: duplicate names, long or accented names, employees at salary range boundaries, future-dated salary changes, and small groups below the suppression threshold.
- Seeded demo users for each role.
- The seed script verifies the final count equals 10,000 and fails otherwise.

## 13. Testing Strategy

- **Unit:** salary validation rules, effective-date logic, current-salary resolution, median/percentile calculation, minimum-group suppression, intent parsing.
- **Integration (API):** pagination across all 10,000 records without gaps or duplicates, search and filters, salary update creating history and audit records, rollback on failure, 409 on stale version, RBAC for each role, validation errors.
- **Q&A:** every supported intent matches a direct database query; unsupported, ambiguous and injection inputs are rejected.
- **Frontend:** component tests for directory and salary forms; one end-to-end flow (search, open employee, update salary, see history).
- **Continuous check:** tests and lint run with a single command and in CI.

## 14. Success Criteria

1. All 10,000 seeded employees can be browsed through paginated APIs with no missing or duplicate records.
2. Search, filtering and sorting return correct results and meet the performance targets in section 11.
3. A salary update stores a new history record, keeps the previous salary, and creates an audit entry atomically.
4. A stale update is rejected with 409 and changes nothing.
5. Analytics are calculated by the backend, grouped by currency, and never blend currencies.
6. Each supported question returns a result that matches an independent database query, including filters, currency and definition.
7. Unsupported questions are rejected or clarified and never return invented data.
8. Role restrictions are enforced: Directory Users never receive salary data from any endpoint.
9. Automated tests cover the core business rules and critical API behavior, and all pass.
10. A reviewer can install, seed, run and demonstrate the app by following the README.

## 15. Deliberate Non-Goals

- Payroll processing, tax calculation, payslips, bank transfers and statutory compliance.
- Direct integration with HRIS, accounting or payroll providers.
- Real employee data or production identity-provider integration.
- Automatic foreign-exchange conversion without an approved exchange-rate source and policy.
- Unrestricted AI-generated SQL or AI-generated salary updates.

## 16. Assumptions and Trade-offs

- **Stack:** React with TypeScript, NestJS, SQLite and Prisma. SQLite fits this scale and gives a zero-ops demo. It supports a single writer at a time and lacks a native median or decimal type, so medians are computed in the service layer and money uses integer minor units. The data layer stays behind Prisma so a move to PostgreSQL is a configuration and migration change rather than a rewrite.
- **Architecture:** a modular monolith (auth, employees, salary, analytics, questions, audit modules) rather than distributed services.
- **AI:** optional and constrained; deterministic calculations are the source of every compensation fact.
- **Synthetic data:** realistic but not derived from any real person or company.

## 17. Deliverables

- Source code with a README covering prerequisites, install, seed, run, test and demo steps.
- `.env.example`, seed and test commands, and optionally a Docker Compose file for one-command startup.
- OpenAPI documentation.
- Requirements document: [REQUIREMENTS.md](REQUIREMENTS.md).
- Planning and design notes: [DESIGN.md](DESIGN.md).
- Architecture note with diagrams: [architecture.md](architecture.md).
- Prompts and instructions used with AI tools: [AI_WORKFLOW.md](AI_WORKFLOW.md).
- Trade-off explanations: [TRADEOFFS.md](TRADEOFFS.md).
- Performance considerations: [PERFORMANCE.md](PERFORMANCE.md).
- Demo script: the walkthrough of search, salary update with history and audit, analytics, and a supported and an unsupported question.

## 18. Roadmap (After the Initial Release)

| Item | Why deferred |
| --- | --- |
| Bulk imports | Needs validation, error reporting and rollback design on top of reliable single updates |
| Approval workflows | Depends on stable roles and the audit model |
| Multi-level compensation reviews | Requires workflow and review-cycle data not in the core model |
| Predictive salary recommendations | Requires trustworthy history, fairness review and explainability |
| Currency conversion | Requires an approved exchange-rate source and policy |
| PostgreSQL and real identity provider | Production hardening once the core is proven |
