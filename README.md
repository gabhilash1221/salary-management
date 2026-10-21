# Salary Management

Central salary directory for HR: search employees, import employees from Excel or CSV, update salary history, review compensation analytics, and ask a closed set of questions. The API calculates every compensation figure and validates every import. The web app displays those results.

The header switches between English and Portuguese, and between day and night. A signed-in theme is saved on that user and pushed to their other open sessions. The language choice stays in this browser. The header avatar opens a profile page for the display name, photo, and password.

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

The walkthrough is in [docs/demo-script.md](docs/demo-script.md). Product rules are in [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md). Architecture and trade-offs are in [docs/architecture.md](docs/architecture.md). The layout of the code is in [docs/ProjectStructure.md](docs/ProjectStructure.md).

HR managers use the Employees page to add, edit, and delete people, sort the directory, and open **Bulk Import Employees**. Import stays in a dialog: download either template, preview the file, then confirm. Ready rows are created, invalid rows are reported, and duplicates are skipped. After confirm, a dialog shows how many employees imported and how many failed. Download the Excel feedback file for a result and message on every row.

The country list includes Portugal, Brazil, Angola, Mozambique, Cape Verde, Guinea-Bissau, São Tomé and Príncipe, and Timor-Leste, along with India, the United States, Germany, the United Kingdom, and Canada. A new seed places employees in those countries. People already in a database stay as they are until `npm run seed` is run again.
