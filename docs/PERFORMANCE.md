# Performance

Targets are for the seeded dataset of 10,000 employees. They come from [REQUIREMENTS.md](REQUIREMENTS.md) section 11.

| Area | Target |
| --- | --- |
| Directory search and filters | p95 under 300 ms |
| Analytics | p95 under 1 s |
| Salary update | p95 under 300 ms |
| Seed | Completes in under 60 s and is deterministic for seed 42 |

## What the implementation does

Directory reads are paged on the server. The default page size is 25 and the maximum is 100, so a screen never loads all 10,000 rows. Department, country, status, last name, and the Unicode name keys are indexed on `Employee`. Salary history is indexed by employee and effective date. Audit reads are indexed by entity, actor, and timestamp. The indexes are declared in [apps/api/prisma/schema.prisma](../apps/api/prisma/schema.prisma).

Name search uses `firstNameKey` and `lastNameKey`, which are Unicode case-folded copies of the names. SQLite `LIKE` is case-insensitive only for ASCII, so the keys keep accented names searchable without scanning every row in application code.

Analytics queries run in the API and always group by currency. The browser does not reduce salary rows. Questions call the same analytics service, so a question does not add a second scan with different math.

The search box waits 300ms after the last keystroke before it calls the directory. Department, country, and status call immediately because each change is one request. Both behaviors are described in [DESIGN.md](DESIGN.md).

The seed inserts employees and salary rows in batches after `prisma migrate deploy`.

## What CI checks

`npm test` and the GitHub Actions workflow check correctness: paging across all 10,000 employees, search, filters, the salary transaction, role limits, and question results. They do not record p95 latency. A reviewer who needs the timing targets measures them against a seeded local API.
