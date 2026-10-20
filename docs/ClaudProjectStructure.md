acme-salary-management/
├── package.json                  # workspaces + root scripts (dev, test, seed, lint)
├── README.md                     # setup, seed, run, test, demo steps
├── .env.example
├── docker-compose.yml            # optional one-command start
├── docs/
│   ├── requirements.md
│   ├── architecture.md           # decisions, trade-offs, limitations
│   └── demo-script.md
│
├── packages/
│   └── shared/                   # optional: types shared by api and web
│       └── src/
│           ├── roles.ts          # Role enum, permission map
│           ├── currency.ts       # supported ISO 4217 codes
│           └── dto-types.ts      # response shapes (Employee, SalaryRecord, QuestionResponse)
│
├── apps/
│   ├── api/                      # NestJS
│   │   ├── package.json
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed/
│   │   │       ├── seed.ts            # entry: reset, generate, verify count == 10,000
│   │   │       ├── generators.ts      # seeded RNG, names, departments, salary ranges
│   │   │       └── reference-data.ts  # countries, currencies, departments, titles
│   │   ├── src/
│   │   │   ├── main.ts                # bootstrap: validation pipe, Swagger, CORS, helmet
│   │   │   ├── app.module.ts
│   │   │   ├── config/                # typed env config + validation
│   │   │   ├── common/
│   │   │   │   ├── decorators/        # @Roles(), @CurrentUser()
│   │   │   │   ├── guards/            # JwtAuthGuard, RolesGuard
│   │   │   │   ├── filters/           # global exception filter (consistent error body)
│   │   │   │   ├── interceptors/      # request ID, logging
│   │   │   │   ├── pipes/
│   │   │   │   └── utils/             # money (minor units), pagination helpers
│   │   │   ├── prisma/                # PrismaModule + PrismaService
│   │   │   └── modules/
│   │   │       ├── auth/              # login, JWT strategy, password hashing
│   │   │       ├── users/
│   │   │       ├── employees/         # controller, service, dto, repository
│   │   │       ├── salary/            # update (transaction), history, domain rules
│   │   │       ├── analytics/         # query service, stats (median, percentiles), suppression
│   │   │       ├── questions/         # Q&A
│   │   │       │   ├── intents/       # intent definitions + query templates
│   │   │       │   ├── interpreters/  # interpreter.interface.ts, rule-based.ts, llm.ts (optional)
│   │   │       │   └── questions.service.ts
│   │   │       ├── audit/             # append-only writer + read API
│   │   │       └── health/
│   │   └── test/
│   │       ├── unit/                  # or *.spec.ts beside the source files
│   │       ├── e2e/                   # supertest: pagination, RBAC, salary update, 409, Q&A
│   │       └── helpers/               # test DB setup, factories
│   │
│   └── web/                      # React + Vite + TypeScript
│       ├── package.json
│       ├── vite.config.ts        # dev proxy to /api
│       ├── tsconfig.json
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── app/
│           │   ├── router.tsx
│           │   ├── providers.tsx          # QueryClient, auth context
│           │   └── layout/
│           ├── api/                       # fetch client, token handling, typed endpoints
│           ├── features/
│           │   ├── auth/                  # login page, route guards
│           │   ├── employees/             # list, filters, search, pagination, detail
│           │   ├── salary/                # update form, history table, conflict handling
│           │   ├── analytics/             # summary tables, distribution chart
│           │   ├── questions/             # ask box, supported examples, result view
│           │   └── audit/                 # audit table with filters
│           ├── components/                # shared UI: DataTable, Pagination, ErrorState, EmptyState
│           ├── hooks/
│           ├── lib/                       # formatMoney, date helpers
│           └── test/                      # Vitest + Testing Library setup