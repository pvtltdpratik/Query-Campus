# Smart College ERP & AI Assistance System

A college management portal with separate **Student**, **Faculty** and **Admin** experiences and a natural-language
assistant that answers questions ("When is the DBMS exam?", "Show me tomorrow's timetable") straight from the
college database.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS + shadcn/ui · Prisma 7 · PostgreSQL (AWS RDS) ·
NextAuth (credentials) · Recharts · Zod

## Features

- **Student portal:** dashboard (next exam, today's classes, attendance, alerts), exam schedule, weekly timetable,
  attendance by subject, notices, and the query assistant.
- **Faculty portal:** dashboard for their subjects and classes, and attendance marking (only for subjects assigned to them).
- **Admin portal:** create, edit and delete subjects, exams, timetable slots, students and notices, plus live
  analytics (users, active users, most common and unanswered assistant questions).
- **Smart alerts:** changing an exam's date, time or venue automatically alerts the affected students; exams within
  3 days show as reminders.
- **Assistant:** classifies the question (exam, timetable, syllabus, attendance, faculty, notices), recognises the
  subject by code, name or alias (for example "DBMS"), and answers only from database rows. It never invents dates.

## Prerequisites

| Requirement | Notes |
| --- | --- |
| [Node.js](https://nodejs.org) 20.9 or newer | Required by Next.js 16. Check with `node -v`. |
| npm 10 or newer | Comes with Node.js. |
| [Git](https://git-scm.com) | To clone the repository. |
| A PostgreSQL database | The project targets **AWS RDS PostgreSQL**. Any PostgreSQL 14+ that accepts TLS connections also works. |
| Network access to the database | For RDS, the instance must be publicly reachable (or you must be on its VPC/VPN) and its security group must allow inbound TCP 5432 from your IP address. |
| An empty database | Create one on the server, for example `samruddhi`. Migrations create all tables. |

## Setup guide

### 1. Clone and install

```bash
git clone https://github.com/pvtltdpratik/Query-Campus.git
cd Query-Campus
npm install
```

`npm install` also generates the Prisma client into `src/generated/prisma` (it is git-ignored).

### 2. Configure environment variables

Copy the example file and fill in the values. `.env` is git-ignored, so your secrets are never committed.

```bash
cp .env.example .env
```

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | `postgres://USER:PASSWORD@HOST:5432/DBNAME`. URL-encode special characters in the password (for example `@` becomes `%40`). |
| `NEXTAUTH_SECRET` | Yes | Random secret used to sign sessions. Generate one with `openssl rand -base64 32`. |
| `NEXTAUTH_URL` | Yes | Public URL of the app, `http://localhost:3000` for local development. |
| `SEED_PASSWORD` | For seeding | Password (8+ characters) given to every demo user created by the seed. Choose your own. |
| `DATABASE_CA_CERT` | No | Contents of the [RDS CA bundle](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html). When set, the server certificate is fully verified. |
| `COLLEGE_TIMEZONE` | No | IANA timezone used to display dates and resolve "today" and "tomorrow". Defaults to `Asia/Kolkata`. |

AWS RDS refuses unencrypted connections. The app (`src/lib/db.ts`) and the Prisma CLI (`prisma.config.ts`) enable TLS
automatically, so you do not need to add `sslmode` to `DATABASE_URL`.

### 3. Create the database tables

```bash
npm run db:migrate
```

This applies the migrations in `prisma/migrations` to your database.

### 4. Load demo data (optional but recommended)

```bash
npm run db:seed
```

The seed creates one department, three faculty, five subjects, three students, an exam schedule, a weekly
timetable, attendance records and sample notices. It is safe to run again; existing users are not duplicated.

### 5. Start the app

```bash
npm run dev
```

Open <http://localhost:3000> and sign in at `/login`.

### 6. Production build (optional)

```bash
npm run build
npm run start
```

For deployments, apply migrations with `npm run db:deploy` instead of `db:migrate`.

## Demo accounts

Created by `npm run db:seed`. Every account uses the password you set as `SEED_PASSWORD` in `.env`.

| Role | Email |
| --- | --- |
| Admin | `admin@college.test` |
| Faculty | `anita.rao@college.test` |
| Faculty | `vikram.shah@college.test` |
| Faculty | `meera.iyer@college.test` |
| Student | `aarav.patil@college.test` |
| Student | `diya.menon@college.test` |
| Student | `rohan.desai@college.test` |

These are demo accounts only. Remove them or change their passwords before using a database for real data.

## Try the assistant

Sign in as a student, open **Ask Assistant** and try:

- "When is the DBMS exam?"
- "Show me tomorrow's timetable"
- "What is the syllabus of Operating Systems?"
- "What is my attendance?"
- "Who teaches Computer Networks?"
- "Any new notices?"

Then sign in as the admin, change an exam's venue under **Exams**, and watch the alert appear on the student dashboard.
Questions the assistant could not answer are listed on the admin **Analytics** page.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run build` | Generate the Prisma client and build for production. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Run the TypeScript compiler without emitting files. |
| `npm run db:migrate` | Create and apply migrations in development. |
| `npm run db:deploy` | Apply existing migrations (production). |
| `npm run db:seed` | Load the demo data. |
| `npm run db:generate` | Regenerate the Prisma client. |

## Architecture

| Area | Where |
| --- | --- |
| Schema, migrations, seed | `prisma/` |
| DB client (pg adapter + TLS) | `src/lib/db.ts` |
| Auth config, password hashing | `src/lib/auth.ts`, `src/lib/password.ts` |
| Server-side role guards | `src/lib/session.ts` |
| Optimistic route redirect | `src/proxy.ts` |
| Assistant: intent and entity parsing, database answers | `src/lib/assistant/` |
| Student, faculty and admin portals | `src/app/(app)/{student,faculty,admin}` |
| Admin CRUD server actions (Zod-validated) | `src/app/(app)/admin/actions.ts` |

**Security model:** the proxy only does a cheap cookie and role redirect. Every page and server action re-checks the
user against the database (`requireRole` / `assertRole`), so a disabled account or changed role takes effect
immediately. All queries go through Prisma (parameterised), and the single raw query uses a tagged template.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `no pg_hba.conf entry ... no encryption` | The connection is not using TLS. Make sure you are running the project's scripts (they enable it) and not a separate client without SSL. |
| Connection timeout to RDS | Add your current IP to the RDS security group's inbound rules (TCP 5432) and confirm the instance is publicly accessible. |
| `Cannot find module '@/generated/prisma/client'` | Run `npm run db:generate`. |
| `Could not load schema from prisma/schema.prisma` | Run the command from the project root, where `prisma.config.ts` lives. |
| Login always says "Invalid email or password" | Run `npm run db:seed`, and use the `SEED_PASSWORD` value from your `.env`. |
| `NEXTAUTH_SECRET` or session errors | Make sure `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are set in `.env`, then restart the dev server. |
