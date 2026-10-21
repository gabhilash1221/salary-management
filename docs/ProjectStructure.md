salary-management/
├── apps/
│   ├── api/                         # NestJS, Prisma, SQLite
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── employees/       # directory, plus Excel/CSV import
│   │   │   │   ├── salary/
│   │   │   │   ├── analytics/
│   │   │   │   ├── questions/
│   │   │   │   ├── audit/
│   │   │   │   └── health/
│   │   │   ├── common/              # guards, filters, money, dates
│   │   │   ├── config/
│   │   │   └── prisma/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed/                # 10,000 employees from seed 42
│   │   └── test/                    # unit specs and supertest e2e
│   └── web/                         # React, Vite, Tailwind
│       └── src/
│           ├── app/                 # router, providers, theme socket
│           ├── api/
│           ├── components/          # Button, DataTable, charts, states
│           ├── features/
│           │   ├── auth/
│           │   ├── employees/       # directory, edit, and bulk import
│           │   ├── profile/         # name, photo, password
│           │   ├── salary/
│           │   ├── analytics/
│           │   ├── questions/
│           │   └── audit/
│           ├── i18n/                # English and Portuguese catalogs
│           ├── hooks/
│           └── lib/
├── docs/
│   ├── REQUIREMENTS.md
│   ├── architecture.md              # decisions, trade-offs, limitations
│   ├── demo-script.md
│   ├── ProjectStructure.md
│   └── ClaudProjectStructure.md
├── .github/workflows/ci.yml
├── biome.json
├── package.json
├── README.md
└── .env.example
