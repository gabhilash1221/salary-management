# Trade-offs

Each choice below is the one in this release. The cost is what a later change has to pick up.

## SQLite and Prisma

SQLite stores the demo database in a file and needs no separate server. It allows one writer at a time, which is enough for a single local demo and the test suite. Prisma is the only data access layer, so a move to PostgreSQL is a datasource and migration change rather than a rewrite of the salary or analytics modules.

## Integer money

Amounts are integers in minor units with an ISO currency code. SQLite has no decimal type, and floating point would round salaries. The API never adds amounts across currencies. Conversion stays out of scope until there is an approved exchange-rate source.

## Statistics in the service

Median, average, and percentiles are computed in the analytics service. SQLite has no median function. The same functions are unit-tested, and question answers call this service instead of calculating a second copy of the numbers.

## No shared package

`apps/api` and `apps/web` each own their TypeScript types. A shared package would force both apps to publish types before either screen needed them. A type moves to a shared package only when both sides import it.

## No Docker Compose

`npm run dev` starts the API and the web app. Compose would add a second way to boot the same two processes. The README stays the one setup path.

## Swagger and Helmet

Helmet is on. Its content security policy is off so the Swagger page at `/api/docs` can load its scripts. The API itself does not serve the web app's pages.

## Repeatable demo passwords

The four demo users use a fixed bcrypt salt so `npm run seed` recreates the same hashes. Employee and salary rows come from seed `42`. The demo password is documented in `.env.example` and the README. It is a local fixture, not a production secret policy.

## Expiry toast, no refresh token

Access tokens last 15 minutes. There is no refresh token and no silent renewal. When the token expires, the web app clears the session and asks the user to sign in again. That keeps the demo free of a second credential while making expiry visible.
