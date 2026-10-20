# Design notes

These notes record how the initial release was shaped. The product rules stay in [REQUIREMENTS.md](REQUIREMENTS.md). The running structure is in [architecture.md](architecture.md).

## Layout

Two structure sketches were compared before any application code was written.

[ClaudProjectStructure.md](ClaudProjectStructure.md) was the starting tree. It already named the pieces the requirements depend on: auth screens, employee search, salary history, analytics, a closed question catalog, an audit trail, guards, a split seed, and money helpers.

[ProjectStructure.md](ProjectStructure.md) was the shorter skeleton. It contributed Biome and the GitHub Actions workflow that runs the same lint and test commands as the README. Its module names were folded into the Claude tree.

The following items from those sketches were left out of the initial release:

- `packages/shared`. The API owns request and response types. The web app keeps its own TypeScript types until a type is imported by both sides.
- An LLM interpreter file. Question text is parsed by the rule-based interpreter only.
- Docker Compose. `npm run dev` starts the API and the web app.

The result is an npm workspace with `apps/api` (NestJS, Prisma, SQLite) and `apps/web` (React, Vite).

## Directory screen

Search and the three filters were designed as separate controls.

- The search box waits 300ms after the last keystroke, then requests the directory. That keeps the field responsive while the API still does the search.
- Department, country, and status each request the directory as soon as the value changes. Filters combine with AND. There is no Apply button.
- A change of search or filter returns to page 1. Paging keeps the current search and filters.
- The page size stays 25, with a server maximum of 100.

## Session

Demo users sign in with a local email and password. The API issues a JWT that expires after 15 minutes. The web app reads the `exp` claim and also treats an authenticated `401` whose message is `The token is expired` as the end of the session.

When that happens the app clears the stored session, drops cached queries, returns to the sign-in page, and shows the toast `The token is expired`. A failed login stays on the form. Sign out does not show the toast.

## Salary and questions

A salary update carries the employee version. The API writes the new history row, increments the version, and inserts the audit row in one transaction. A stale version returns 409 and writes nothing.

A question is accepted only when the rule-based interpreter maps it to a supported intent. The questions module then calls the analytics service. The browser displays the result, filters, currency, and definition returned by the API.
