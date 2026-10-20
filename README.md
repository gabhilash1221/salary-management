# Salary Management

Central salary directory for HR: search employees, update salary history, review compensation analytics, and ask a closed set of questions. The API calculates every compensation figure. The web app displays those results.

## Prerequisites

- Node.js 22 or newer
- npm 10 or newer

## Install

```bash
cp .env.example .env
npm install
```

On Windows PowerShell, copy the example env file with `Copy-Item .env.example .env`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the API on port 3000 and the web app on port 5173 |
| `npm run seed` | Reset and load 10,000 synthetic employees |
| `npm test` | Run API unit tests, API end-to-end tests, and web tests |
| `npm run lint` | Run Biome |

Continuous integration runs `npm run lint` and `npm test`.

## Demo accounts

The seed creates one user for each role. The password is `Password123!` unless `SEED_DEMO_PASSWORD` is changed.

| Email | Role |
| --- | --- |
| hr.manager@acme.test | HR manager |
| hr.viewer@acme.test | HR viewer |
| directory.user@acme.test | Directory user |
| auditor@acme.test | Auditor |

Open http://localhost:5173 after `npm run dev`. API docs are at http://localhost:3000/api/docs.

The walkthrough is in [docs/demo-script.md](docs/demo-script.md). Architecture choices are in [docs/architecture.md](docs/architecture.md).
