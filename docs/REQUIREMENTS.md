# ACME Salary Management — Product Requirements

## Goal
Replace spreadsheet-based salary management for 10,000 employees across multiple countries with a centralized, searchable and auditable web application. Enable HR managers to maintain salary records and answer questions about compensation using reliable, explainable data.

## Primary Persona
**HR Manager:** Needs to find employees quickly, update salary information accurately, understand compensation by department, country and currency, and answer management questions without manually consolidating spreadsheets.

## Scope and Core Features
1. **Employee directory:** Search by employee ID or name; filter by department, country and employment status; use server-side pagination.
2. **Salary management:** View and update an employee's current salary, currency and effective date. Preserve salary history and record who changed what and when.
3. **Compensation analytics:** Show employee counts, salary distributions and average/median salary by relevant dimensions. Never aggregate incompatible currencies without an explicitly defined conversion policy.
4. **Question answering:** Allow HR to ask supported natural-language questions, such as “What is the median salary in India by department?” Return the result, filters, currency and calculation definition. Unsupported questions must be rejected or clarified rather than answered with fabricated data.
5. **Data integrity and security:** Validate all inputs, restrict salary access to authorized users, and maintain an audit trail.
6. **Dataset:** Provide a reproducible seed script that creates exactly 10,000 realistic synthetic employee records.

## Success Criteria
- All 10,000 seeded employees can be browsed through paginated APIs.
- Search, filtering and salary updates work end-to-end.
- Salary changes preserve the previous salary and create an audit record.
- Analytics are calculated by the backend from persisted data.
- Supported questions return results consistent with the underlying database.
- Automated tests cover core business rules and critical API behavior.
- The application can be deployed and demonstrated using documented steps.

## Deliberate Non-Goals
- Payroll processing, tax calculation, payslips, bank transfers and statutory compliance.
- Direct integration with HRIS, accounting or payroll providers.
- Real employee data or production identity-provider integration.
- Automatic foreign-exchange conversion without an approved exchange-rate source and policy.
- Unrestricted AI-generated SQL or AI-generated salary updates.

## Assumptions and Trade-offs
Use React with TypeScript, NestJS, SQLite and Prisma. Keep the application modular rather than introducing distributed services. Use synthetic data, deterministic salary calculations and a constrained analytics interface. Treat AI as an optional interpretation layer over validated, deterministic queries, not as the source of compensation facts.

## Out of Scope for the Initial Release
Bulk imports, approval workflows, multi-level compensation reviews and predictive salary recommendations. These can be added after core salary management and data integrity are reliable.