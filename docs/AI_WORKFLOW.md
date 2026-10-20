# AI workflow

The running application does not call a language model. This note records the instructions given to the coding assistant while the repository was built, and the product rule those instructions were not allowed to weaken.

## Product rule

Question answering ships with the rule-based interpreter only. If an LLM is added later, it may only translate text into a structured intent that the API validates against the closed catalog. The model does not write SQL, does not see salary rows, and does not produce the numbers in an answer. Every compensation figure comes from `AnalyticsService`.

That rule is in [REQUIREMENTS.md](REQUIREMENTS.md) sections 9 and 15. The interpreter lives in `apps/api/src/modules/questions/interpreters/rule-based.ts`. There is no `llm.ts` adapter in this release.

## Instructions used

The assistant was given the repository and these instructions, in order:

1. Review [REQUIREMENTS.md](REQUIREMENTS.md) for ambiguities and propose acceptance criteria. Currency conversion was treated as out of scope. Question answering was treated as a closed catalog. Authentication for the demo was local seeded users, not a production identity provider.
2. Compare [ClaudProjectStructure.md](ClaudProjectStructure.md) and [ProjectStructure.md](ProjectStructure.md) and choose a starting layout. The Claude tree was selected. Biome and GitHub Actions were taken from the shorter sketch. `packages/shared`, an LLM interpreter, and Docker Compose were left out.
3. Implement that layout: npm workspaces, the NestJS and Prisma API, the React and Vite client, the seed for 10,000 employees, and CI that runs the same lint and test commands as the README.
4. Put the scaffold on a feature branch with separate commits for the application and the docs, then push that branch. A follow-up commit fixed the auth session type import before the branch was merged.
5. After the merge, add API coverage for paging through all 10,000 employees, search and filters, a salary update that writes history and audit together, a 409 on a stale version, role limits, and a question whose median matches the stored rows.
6. Debounce directory search by 300ms.
7. Reload the directory when department, country, or status changes, and remove the Apply button.
8. When the access token expires, return to sign-in and show the toast `The token is expired`.

Design notes for the choices in steps 2, 6, 7, and 8 are in [DESIGN.md](DESIGN.md).
