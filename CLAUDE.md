@AGENTS.md

# StraightFrom: how we work

The backend plan is `docs/BACKEND_PLAN.md`. Read it before building anything, and follow these values on every change.

## Values

1. **No tech debt: every feature ships with tests**, at the right level:
   - **Unit (Vitest):** rules and maths (fees, payouts, handles, ship-by dates). Fast, so lots of them.
   - **Integration:** every server action, webhook and background job, run against a throwaway test database (never the dev or prod project).
   - **End-to-end (Playwright, phone-sized browser):** a handful of critical journeys only (sign up → list → buy → ship → payout), not every button.
   - **Every bug fix starts with a test that reproduces the bug.**
   - The prototype's fake-data screens get their tests as each one is connected to the real backend.
2. **Money code gets a higher bar.** Every path that charges, refunds or pays out has a crash-and-retry test proving it never happens twice (claim → Stripe call with idempotency key → record). Amounts are whole cents. Stripe's fees are read from Stripe, never hardcoded.
3. **Nothing merges red.** Tests, typecheck and lint run on every push (GitHub Actions); `main` only takes green pull requests and is always deployable.
4. **The plan and the code move together.** If a feature is new or differs from `docs/BACKEND_PLAN.md`, update the plan in the same commit. Code and plan disagreeing is a bug.
5. **Strict at the edges.** TypeScript strict, no `any`. Every outside input (forms, webhooks, URL params) is validated with Zod. Zero lint warnings.
6. **Secrets stay out of code and chat.** Keys live only in `.env.local` (git-ignored) and Vercel's settings. `.env.example` lists the names. Dev and prod never share keys or data.
7. **Database changes only through migrations** checked into git. Nobody edits the production database by hand.
8. **No silent failures.** Errors are never swallowed; they go to Sentry. Every money action leaves a record (order timeline or admin activity log).
9. **Build only what's in the plan.** MVP first. New ideas go to a "later" list in the plan, not into the code.

## Definition of done

A feature is done only when:
- its tests are written and pass;
- typecheck and lint are clean;
- the plan is updated if anything changed;
- it's been checked at phone width;
- it's committed on a branch and merged into `main` through a green pull request.

## Working rules

- Present a short plan before each phase, and wait for approval.
- Keep the dev server running (`npm run dev` on port 3000).
- Work on a branch per phase or feature, with a pull request into `main`.
