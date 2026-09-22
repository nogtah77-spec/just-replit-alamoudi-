---
name: Drizzle schema sync in development
description: Automatic startup schema push can stop on interactive rename/conflict prompts in non-TTY workflows.
---

When a new Drizzle table or column is added, the managed workflow may build and start successfully even if `drizzle-kit push --force` reports an interactive conflict and cannot complete. Verify the development database schema explicitly before testing routes.

**Why:** Non-interactive workflow startup cannot answer Drizzle's schema conflict prompt, so relying only on the workflow log can leave the API running against an incomplete schema.

**How to apply:** Use the supported development database tooling to inspect or apply the missing development-only schema, then restart the API and verify the affected endpoint. Do not apply ad-hoc DDL to production.