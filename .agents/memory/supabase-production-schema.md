---
name: Supabase production schema compatibility
description: The published Supabase database can lag behind the local Drizzle schema; verify production columns before moving data.
---

The published Supabase database may contain the core tables and records while still missing newer columns from the local development schema. The Replit Supabase connector is suitable for REST table data, but it may not provide PostgreSQL DDL or SQL execution.

**Why:** A direct Drizzle read failed when production lacked newer property and region columns, even though the tables and authentication database were healthy.

**How to apply:** Before transferring or exposing data, compare the production table shape with the current schema. Use a compatibility projection for critical reads such as authentication when appropriate, and handle schema changes through the supported PostgreSQL/publish migration path rather than ad-hoc production DDL. For newly introduced tables used by a live route, add an idempotent compatibility initializer or an explicit migration before exposing the route. Keep the production connection secret name consistent between Replit and Vercel; a secret that exists only in Replit is not automatically available to Vercel.