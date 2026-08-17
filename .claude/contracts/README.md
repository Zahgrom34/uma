# Contracts

One file per feature: `.claude/contracts/<feature-slug>.md`. The contract is the single source of truth for a feature run — every agent (ui-developer, backend-developer, playwright-qa, bug-hunter, planner-assessor, supreme-court, documentor) works strictly from it. If reality contradicts the contract, the agent STOPS and reports the conflict to the orchestrator; the orchestrator fixes the contract and re-runs. Agents never silently deviate.

## Lifecycle

`draft` → (user approves plan) → `approved` → (development runs) → `assessed` → (supreme court rules) → `allowed` | `blocked`. Only the orchestrator (main session) edits a contract, and never while status is `approved` and agents are running — conflicts found mid-run go back to `draft`, get fixed, then agents re-run.

## Template

```markdown
---
feature: <name>
status: draft
budget:
  iterations_allowed: <n>       # full dev→QC→court loops the user granted
  iterations_used: 0
  usd_at_start: <ccusage cost at run start>
created: <dd.mm.yyyy>
---

## 1. Scope
What ships. One paragraph, no ambiguity.

## 2. Out of scope
Explicit list. Anything here is a contract violation if an agent builds it.

## 3. Data & API contract
Exact types (TS interfaces), endpoint signatures, storage shape, validation
rules. This is the boundary ui-developer and backend-developer build against —
both sides code to THIS, not to each other's implementation.

## 4. UI surface
Screens/routes, shadcn components by name, states (empty/loading/error/success),
responsive expectations.

## 5. i18n
Keys added, with ru/uz/en values or a marker that copy comes later.

## 6. File ownership
Which agent owns which paths. No two agents write the same file.

## 7. Acceptance criteria
Numbered, checkable, includes at least one anti-slop criterion and one CIS
comprehension criterion. This is what planner-assessor grades and supreme
court rules on.

## 8. Conflict log
Appended by the orchestrator when an agent reports a contract conflict:
date, reporter, conflict, resolution.

## 9. Verdict
Filled after supreme court: ALLOW / BLOCK, reasoning, budget state
(iterations used, USD spent, 5h/weekly limit state from ccusage).
```
