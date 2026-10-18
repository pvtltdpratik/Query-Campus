import type { Metadata } from "next";
import { SimpleBarChart } from "@/components/charts";
import { Empty, PageHeader, Section, StatCard } from "@/components/page";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { COLLEGE_TZ, addDays } from "@/lib/datetime";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "Analytics" };

type DayRow = { day: Date; n: number };

export default async function AdminAnalytics() {
  await requireRole("ADMIN");
  const now = new Date();
  const dayAgo = addDays(now, -1);
  const weekAgo = addDays(now, -7);

  const [users, students, faculty, subjects, exams, notices, active24h, active7d, queryTotal, queryUnanswered, byIntent, topQueries, missed, perDay] =
    await Promise.all([
      db.user.count(),
      db.student.count(),
      db.faculty.count(),
      db.subject.count(),
      db.exam.count({ where: { startsAt: { gte: now } } }),
      db.notice.count(),
      db.user.count({ where: { lastLoginAt: { gte: dayAgo } } }),
      db.user.count({ where: { lastLoginAt: { gte: weekAgo } } }),
      db.queryLog.count({ where: { createdAt: { gte: weekAgo } } }),
      db.queryLog.count({ where: { createdAt: { gte: weekAgo }, answered: false } }),
      db.queryLog.groupBy({ by: ["intent"], where: { createdAt: { gte: weekAgo } }, _count: { _all: true }, orderBy: { _count: { intent: "desc" } } }),
      db.queryLog.groupBy({ by: ["query"], where: { createdAt: { gte: weekAgo } }, _count: { _all: true }, orderBy: { _count: { query: "desc" } }, take: 8 }),
      db.queryLog.findMany({ where: { answered: false, createdAt: { gte: weekAgo } }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, query: true } }),
      // Tagged-template $queryRaw is parameterised; values are never concatenated into SQL.
      db.$queryRaw<DayRow[]>`
        SELECT date_trunc('day', "createdAt" AT TIME ZONE ${COLLEGE_TZ}) AS day, count(*)::int AS n
        FROM "QueryLog" WHERE "createdAt" >= ${weekAgo}
        GROUP BY 1 ORDER BY 1`,
    ]);

  const dayLabel = (d: Date) => new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(d);

  return (
    <>
      <PageHeader title="System analytics" description="Live overview of records, users and what students are asking." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={users} hint={`${students} students · ${faculty} faculty`} />
        <StatCard label="Active users" value={active24h} hint={`${active7d} in the last 7 days`} />
        <StatCard label="Subjects" value={subjects} hint={`${exams} upcoming exams · ${notices} notices`} />
        <StatCard
          label="Assistant queries (7d)"
          value={queryTotal}
          hint={queryTotal ? `${Math.round(((queryTotal - queryUnanswered) / queryTotal) * 100)}% answered` : "No queries yet"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Queries per day" description="Last 7 days">
          {perDay.length === 0 ? <Empty>No queries yet.</Empty> : <SimpleBarChart data={perDay.map((r) => ({ name: dayLabel(r.day), value: r.n }))} />}
        </Section>
        <Section title="Queries by type" description="Last 7 days">
          {byIntent.length === 0 ? <Empty>No queries yet.</Empty> : <SimpleBarChart data={byIntent.map((r) => ({ name: r.intent, value: r._count._all }))} />}
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Most common questions">
          {topQueries.length === 0 ? (
            <Empty>No queries yet.</Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead className="text-right">Times asked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topQueries.map((q) => (
                  <TableRow key={q.query}>
                    <TableCell className="whitespace-normal">{q.query}</TableCell>
                    <TableCell className="text-right tabular-nums">{q._count._all}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>
        <Section title="Unanswered questions" description="Gaps in the data or phrasing the assistant missed">
          {missed.length === 0 ? (
            <Empty>Everything was answered.</Empty>
          ) : (
            <ul className="divide-y text-sm">
              {missed.map((m) => (
                <li key={m.id} className="py-2">
                  {m.query}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
