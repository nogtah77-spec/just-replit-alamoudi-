# Supabase schema migrations

Supabase is the production PostgreSQL source of truth for this application.
Schema changes are committed under `supabase/migrations/` and must be applied
through the dedicated GitHub Actions workflow rather than during a Vercel
build or API startup.

## Current migration

`20260808000000_add_property_region_columns.sql` adds the columns that exist in
the application schema but were missing from the production database:

- `regions.hero_image`
- `properties.parking`
- `properties.additional_features`

`20260809030000_add_property_assigned_staff.sql` adds the optional
`properties.assigned_staff_id` relationship used by the administrative
“الموظف المسؤول” field on properties and property sources.

The migration uses `IF NOT EXISTS`, empty-string defaults, and a null cleanup
before enforcing `NOT NULL`, so it is safe to apply to the current production
data without changing non-null values.

## Applying migrations

The workflow is intentionally manual so a normal GitHub push does not run
production DDL and does not create an additional Vercel deployment.

1. Create a GitHub Environment named `production`.
2. Add the production Supabase PostgreSQL connection string as an Actions
   secret named `SUPABASE_DB_URL` inside that environment.
3. Optionally enable required reviewers for the `production` environment.
4. Open **Actions → Apply Supabase migrations → Run workflow**.
5. Enter `APPLY` in the confirmation field.
6. Confirm that the workflow completes successfully.

The connection string is a secret and must never be committed or pasted into
the repository or chat. It should use the production Supabase database and a
role permitted to apply migrations.

## After the first successful migration

Only after verifying the new columns with a production schema query should the
temporary legacy-schema branches be removed from the API. That cleanup should
be a separate reviewed change, followed by the normal verification workflow.

## Environment separation

- Development: Replit development database variables.
- Preview: Vercel Preview variables.
- Production: Vercel Production variables pointing to the production Supabase
  project.

Vercel builds must not run migrations. The migration workflow is the only
automated path that changes the production schema.
