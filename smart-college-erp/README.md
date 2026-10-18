# Smart College ERP & AI Assistance System

Next.js (App Router) · TypeScript · Tailwind + shadcn/ui · Prisma 7 · PostgreSQL on AWS RDS · NextAuth (credentials) · Recharts

## Setup

```bash
npm install
cp .env.example .env      # fill in DATABASE_URL, NEXTAUTH_SECRET, SEED_PASSWORD
npm run db:migrate        # applies prisma/migrations to the database
npm run db:seed           # demo college data (idempotent)
npm run dev
```

AWS RDS requires TLS. The app and `prisma.config.ts` enable it automatically. To verify the server
certificate, set `DATABASE_CA_CERT` to the contents of the RDS CA bundle.

Demo accounts (password is `SEED_PASSWORD`): `admin@college.test`, `anita.rao@college.test` (faculty),
`aarav.patil@college.test` (student).

## Architecture

| Area | Where |
| --- | --- |
| Schema, migrations, seed | `prisma/` |
| DB client (pg adapter + SSL) | `src/lib/db.ts` |
| Auth config, password hashing | `src/lib/auth.ts`, `src/lib/password.ts` |
| Server-side role guards (data access layer) | `src/lib/session.ts` |
| Optimistic route redirect | `src/proxy.ts` |
| Assistant: intent/entity parsing and DB answers | `src/lib/assistant/` |
| Student / faculty / admin portals | `src/app/(app)/{student,faculty,admin}` |
| Admin CRUD server actions (zod-validated) | `src/app/(app)/admin/actions.ts` |

Security model: the proxy only does a cheap cookie/role redirect. Every page and server action re-checks the
user against the database (`requireRole` / `assertRole`), so a disabled account or changed role takes effect
immediately. All queries go through Prisma (parameterised); the one raw query uses a tagged template.

The assistant never invents data: it classifies the question, resolves a subject by code/name/alias, and answers
only from database rows. Unanswered questions are logged and shown on the admin analytics page.

## Scripts

`dev`, `build` (generates the Prisma client first), `lint`, `typecheck`, `db:migrate`, `db:deploy`, `db:seed`.
