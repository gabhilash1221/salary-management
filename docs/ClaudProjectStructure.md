salary-management/
├── package.json                  # workspaces + root scripts (dev, test, seed, lint)
├── README.md                     # setup, seed, run, test, demo steps
├── .env.example                  # JWT_EXPIRES_IN=1d for the demo; code default is 15m
├── docs/
│   ├── REQUIREMENTS.md           # product rules, including bulk import (FR-6)
│   ├── architecture.md           # decisions, trade-offs, limitations
│   ├── demo-script.md
│   ├── ProjectStructure.md
│   └── ClaudProjectStructure.md
│
├── apps/
│   ├── api/                      # NestJS
│   │   ├── package.json          # exceljs for .xlsx templates and parsing
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed/
│   │   │       ├── seed.ts            # reset, generate, verify count == 10,000
│   │   │       ├── generators.ts      # seeded RNG, names, departments, salary ranges
│   │   │       ├── generators.spec.ts
│   │   │       └── reference-data.ts  # countries, currencies, departments, titles
│   │   ├── src/
│   │   │   ├── main.ts                # bootstrap: validation pipe, Swagger, CORS, helmet
│   │   │   ├── app.module.ts
│   │   │   ├── configure-app.ts
│   │   │   ├── config/                # typed env config + validation
│   │   │   ├── common/
│   │   │   │   ├── decorators/        # @Roles(), @CurrentUser(), @RequestId()
│   │   │   │   ├── guards/            # JwtAuthGuard, RolesGuard
│   │   │   │   ├── filters/           # global exception filter, including upload size
│   │   │   │   ├── interceptors/      # request ID, logging
│   │   │   │   └── utils/             # money (minor units), dates, pagination
│   │   │   ├── prisma/                # PrismaModule + PrismaService
│   │   │   └── modules/
│   │   │       ├── auth/              # login, JWT strategy, password hashing, rate limit
│   │   │       ├── employees/         # list and detail
│   │   │       │   ├── employee-import.controller.ts   # templates, preview, confirm
│   │   │       │   ├── employee-import.service.ts      # one transaction for ready rows
│   │   │       │   ├── employee-import.parse.ts        # CSV parser and ExcelJS
│   │   │       │   ├── employee-import.validate.ts
│   │   │       │   ├── employee-import.template.ts
│   │   │       │   └── employee-import.columns.ts      # headers, 2 MB, 2,000 rows
│   │   │       ├── salary/            # update (transaction), history, domain rules
│   │   │       ├── analytics/         # summary, distribution, stats, suppression
│   │   │       ├── questions/         # Q&A
│   │   │       │   ├── intents/
│   │   │       │   └── interpreters/  # rule-based interpreter only
│   │   │       ├── audit/             # append-only read API
│   │   │       └── health/
│   │   └── test/
│   │       ├── e2e/                   # access, salary flow, employee import
│   │       └── helpers/
│   │
│   └── web/                      # React + Vite + TypeScript + Tailwind
│       ├── package.json
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── index.css              # theme tokens, including night mode
│           ├── app/
│           │   ├── router.tsx
│           │   ├── providers.tsx      # theme, QueryClient, auth
│           │   ├── theme-context.tsx
│           │   └── layout/            # header nav, day/night, sign out
│           ├── api/                   # JSON client plus multipart upload and download
│           ├── features/
│           │   ├── auth/
│           │   ├── employees/         # list, filters, pagination, bulk import
│           │   ├── salary/            # update form, next valid effective date
│           │   ├── analytics/         # summary, currency filter, charts
│           │   ├── questions/
│           │   └── audit/
│           ├── components/            # Button, Field, Card, DataTable, BarChart, states
│           ├── hooks/
│           ├── lib/                   # formatMoney, nextIsoDate
│           └── test/
│
└── .github/workflows/ci.yml      # lint and test

Not in this repository: a shared types package, Docker Compose, a users module, and an LLM question interpreter. Import and API response types stay in the app that uses them. Trade-offs for those choices are in `docs/architecture.md`.
