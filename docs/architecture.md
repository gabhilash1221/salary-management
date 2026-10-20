# Architecture

Salary Management is a modular monolith. `apps/api` is a NestJS service with Prisma and SQLite. `apps/web` is a React and Vite client. npm workspaces tie them together. There is no shared package: the API owns its DTOs, and the web app keeps its own response types until a type is actually imported by both sides.

## Modules

The API is split into auth, employees, salary, analytics, questions, audit, and health. Questions interpret text into a structured intent and then call the analytics service. They do not calculate medians, averages, or distributions themselves. The rule-based interpreter is the only interpreter in this scaffold. An LLM adapter is intentionally absent.

Salary updates, history inserts, and audit inserts run in one Prisma transaction. A stale employee version returns 409 and writes nothing. Money is stored as integer minor units. Median, average, and percentiles are computed in the analytics service because SQLite has no decimal or median type.

## Access

Demo users are seeded local accounts with bcrypt password hashes. JWTs expire after 15 minutes. Directory responses include current salary only for HR Manager and HR Viewer. Analytics and questions are limited to those two roles. Audit is limited to HR Manager and Auditor. Salary history is also visible to the Auditor.

Search stores a Unicode case-folded copy of each name (`firstNameKey`, `lastNameKey`) because SQLite `LIKE` is only case-insensitive for ASCII.

## Trade-offs

- SQLite keeps the demo free of a database server and allows one writer at a time. Prisma keeps a later move to PostgreSQL in the data layer.
- Docker Compose is not part of this setup. `npm run dev` is the demo command.
- Swagger is served with Helmet content security policy disabled so the docs page can load its scripts.
- Password hashes use a fixed bcrypt salt for the four demo users so re-seeding those accounts stays repeatable. Employee and salary rows are generated from seed `42`.

## Known limitations

Bulk import, approval workflow, currency conversion, and production single sign-on are out of scope. Group suppression defaults to five employees and is configured with `ANALYTICS_MIN_GROUP_SIZE`. Distribution buckets are 5,000,000 minor units wide.
