---
name: GitHub Actions write scope
description: Replit GitHub connections can read and show repo push permissions while rejecting writes that include GitHub workflow files.
---

The Replit GitHub OAuth connection may report a healthy account with `repo` scope and repository-level `push/admin` permissions while writes involving `.github/workflows` are rejected. A separately supplied GitHub credential can expose both `repo` and `workflow`, providing a distinct path for workflow-file writes.

**Why:** Repeated OAuth reconnects did not add the missing workflow authorization, while the independently supplied credential exposed `repo, workflow` and authenticated successfully through the GitHub API.

**How to apply:** Before a workflow-file push, inspect the credential actually used by the write path. Do not infer its scope from the Replit OAuth connection, and do not alter Vercel or Supabase as a workaround.