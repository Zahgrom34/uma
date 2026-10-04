# UMA — Storefront + CMS

Monorepo-style workspace for the UMA fashion brand (Uzbekistan, CIS audience).

## Layout

- `umabranduz/` — existing storefront. Vite + React (JS, no TS), hand-rolled hash routing, cart/order state in localStorage; deployed to GitHub Pages. Since cms-v1, content (products, translations, pages, commerce settings) loads at runtime from the API via `src/content.js` with a three-tier fallback (live API → localStorage cache → committed `src/content-snapshot.json`); since cms-v2 the UI strings in `src/App.jsx` are bundled fallbacks overridden at runtime by API `uiStrings` (hero media and social links are API-driven too); since catalog-sync-v1 the catalog/menu is driven by the API's categories keyed on `categorySlug` (see `docs/features/catalog-sync-v1.md`); styles in one global `styles.css`. `src/main.jsx` dynamically imports App.jsx after content applies — load-bearing, do not convert to a static import (see `docs/features/cms-v1.md`). Treat as legacy: do not extend its DOM-mutation i18n hacks (`LocalizedInterface`, `lockSizeFinderToWomen`, `syncProductLanguage`).
- `api/` — content API (NestJS + Prisma + SQLite): source of truth for products/categories/media/pages/ui-strings/settings; cookie-JWT admin auth; import/snapshot scripts; since billz-v1/v2/v3 a manual BILLZ 2 POS stock+price+photo sync (`src/billz/`, token in Settings not env). See `docs/features/cms-v1.md`, `docs/features/billz-v2.md`, `docs/features/billz-v3.md`.
- `shared/` — `@uma/shared` boundary package: wire types + Zod schemas, backend-owned; `cms/` keeps a verbatim copy in `cms/src/lib/api/types.ts`.
- `cms/` — the CMS we are building (React + TypeScript + Tailwind + shadcn/ui). Goal: a comfortable admin for managing products (with ru/uz/en translations), media, pages/copy, sale & stock — replacing the hardcoded content layer of the storefront.

## Non-negotiables

1. **No AI slop.** Design and copy must not look AI-generated. The precise slop definition lives in `docs/ai-slop.md` (being defined — if it does not exist yet, ask before making taste decisions). Until then: no purple gradients on white cards, no emoji-as-icons, no generic "Lorem SaaS" landing aesthetics, no ✨/🚀 copy, no en-dash-riddled marketing prose. The brand voice is quiet, editorial, fashion-house minimalism (see the storefront).
2. **CIS audience first.** Primary UI language Russian, plus Uzbek and English. Currency UZS formatted `1 500 000 UZS` (space-separated, ru-RU). Dates dd.mm.yyyy. Copy must read natively for ru/uz speakers, not like translated English.
3. **shadcn/ui for all CMS UI.** Load the `shadcn` skill before adding/composing components. Load `ui-ux-pro-max` before any visual/design decision.
4. Run `antislop` skill over any user-facing copy before it ships.

## AI team (`.claude/agents/`)

Delegate via the Agent tool; run independent agents in parallel.

- `planner-assessor` — plans features (feeds the contract); assesses finished work against the contract and anti-slop rules.
- `ui-developer` — builds CMS screens with shadcn/Tailwind, strictly to the contract.
- `backend-developer` — API, data model, persistence, auth, strictly to the contract.
- `playwright-qa` — drives the running app in a real browser, verifies contract acceptance criteria actually work.
- `bug-hunter` — hunts bugs VISIBLE to end users and audits ru/uz comprehension for the CIS audience.
- `supreme-court` — final ALLOW/BLOCK verdict on the evidence, constrained by the run budget (checks `ccusage`).
- `documentor` — after ALLOW: feature record, changelog, doc updates, contract close-out.

## Feature pipeline (ALWAYS — the default way features are built)

Every feature request goes through this pipeline — do not implement features directly in the main session. The main session is the orchestrator only: it plans, writes contracts, dispatches agents, and relays verdicts. Trivial one-line fixes explicitly requested as such are the only exception.

Contracts live in `.claude/contracts/` (template in its README). The contract is the single source of truth; agents that hit a contradiction STOP and report — the orchestrator fixes the contract and re-runs them. Only the orchestrator edits contracts.

1. **Plan.** User requests a feature (possibly vague) and grants a budget (e.g. "3 iterations"). Enter plan mode; use the `Explore` and `Plan` agents plus `planner-assessor` to fill in details. Write the contract as `draft`: scope, out-of-scope, exact data/API types, UI surface, i18n keys, file ownership (no two agents share a file), acceptance criteria, budget block with `ccusage` USD at start.
2. **Approve.** User approves the plan → contract becomes `approved` and is frozen for the run.
3. **Develop.** Run `ui-developer` + `backend-developer` in parallel, each prompt naming the contract. On a reported conflict: contract back to `draft`, fix, re-run the affected agent.
4. **Quality control.** Run `playwright-qa` + `bug-hunter` in parallel, then `planner-assessor` in assessment mode. All three grade against the contract's acceptance criteria with evidence.
5. **Verdict.** Run `supreme-court` with the contract + all reports. BLOCK (unshippable, evidence-backed) → re-run from step 3 if the budget allows a full iteration, otherwise court prescribes a lightweight fix or documented compromise. ALLOW → step 6.
6. **Document.** Run `documentor`: feature record in `docs/features/`, changelog, contract closed out.

Budget is checked with `npx -y ccusage@latest blocks --active --json` (5h block) and `daily`/`weekly`. ccusage reports USD and tokens, not plan-limit percentages — headroom is estimated by comparing the projected cost of the next iteration against what previous iterations cost and what the user granted. The granted budget is a hard constraint on remedies, not a suggestion. If a feature request arrives without a budget, ask for one before writing the contract.

## Commands

- Storefront: `cd umabranduz && npm run dev` (Vite, port 5173; `VITE_API_URL` overrides the API base, dev default `http://localhost:3000`).
- CMS: `cd cms && npm run dev` (`CMS_API_PROXY` overrides the `/api` + `/media` proxy target, default `http://localhost:3000`).
- API: `cd api && npm run start:dev` (env in `api/.env`; in this environment `PORT=3001` because 3000 is occupied). Seed/import: `npm run import`; snapshot only: `npm run snapshot`; tests: `npm test`.
