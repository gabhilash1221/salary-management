acme-salary-management/
├── apps/
│   ├── api/                     # NestJS
│   │   ├── src/
│   │   │   ├── employees/
│   │   │   ├── salaries/
│   │   │   ├── analytics/
│   │   │   ├── audit/
│   │   │   ├── auth/
│   │   │   └── common/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   └── test/
│   └── web/                     # React + Vite
│       └── src/
│           ├── components/
│           ├── features/
│           │   ├── employees/
│           │   ├── salaries/
│           │   └── analytics/
│           ├── lib/
│           └── test/
├── docs/
│   ├── REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── AI_WORKFLOW.md
│   └── TRADEOFFS.md
├── .github/workflows/ci.yml
├── biome.json
├── package.json
├── README.md
└── .gitignore