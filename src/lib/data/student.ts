import "server-only";
import { db } from "@/lib/db";
import { addDays, isoWeekday } from "@/lib/datetime";
import type { Role } from "@/generated/prisma/client";

type StudentScope = { id: string; departmentId: string; semester: number; section: string };

const subjectScope = (s: StudentScope) => ({ departmentId: s.departmentId, semester: s.semester });

export function upcomingExams(s: StudentScope, take = 10) {
  return db.exam.findMany({
    where: { startsAt: { gte: new Date() }, subject: subjectScope(s) },
    include: { subject: { select: { code: true, name: true } } },
    orderBy: { startsAt: "asc" },
    take,
  });
}

export function timetableForDay(s: StudentScope, dayOfWeek: number) {
  return db.timetableEntry.findMany({
    where: { dayOfWeek, section: s.section, subject: subjectScope(s) },
    include: { subject: { select: { code: true, name: true } } },
    orderBy: { startTime: "asc" },
  });
}

export function weekTimetable(s: StudentScope) {
  return db.timetableEntry.findMany({
    where: { section: s.section, subject: subjectScope(s) },
    include: { subject: { select: { code: true, name: true } } },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

export type AttendanceRow = { subjectId: string; code: string; name: string; attended: number; total: number; percent: number };

export async function attendanceSummary(studentId: string): Promise<AttendanceRow[]> {
  const grouped = await db.attendance.groupBy({
    by: ["subjectId", "status"],
    where: { studentId },
    _count: { _all: true },
  });
  const subjects = await db.subject.findMany({
    where: { id: { in: [...new Set(grouped.map((g) => g.subjectId))] } },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });
  return subjects.map((sub) => {
    const mine = grouped.filter((g) => g.subjectId === sub.id);
    const total = mine.reduce((n, g) => n + g._count._all, 0);
    const attended = mine.filter((g) => g.status !== "ABSENT").reduce((n, g) => n + g._count._all, 0);
    return { subjectId: sub.id, code: sub.code, name: sub.name, attended, total, percent: total ? Math.round((attended / total) * 100) : 0 };
  });
}

export function noticesFor(role: Role, take = 10) {
  const now = new Date();
  return db.notice.findMany({
    where: { OR: [{ audience: null }, { audience: role }], AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }] },
    orderBy: { publishedAt: "desc" },
    take,
  });
}

export type StudentAlert = { id: string; type: string; message: string; at: Date };

/** Stored alerts (venue/date changes) plus alerts derived live from the exam schedule. */
export async function alertsFor(s: StudentScope, userId: string): Promise<StudentAlert[]> {
  const since = addDays(new Date(), -14);
  const [stored, soon] = await Promise.all([
    db.alert.findMany({
      where: {
        createdAt: { gte: since },
        AND: [
          { OR: [{ departmentId: null }, { departmentId: s.departmentId }] },
          { OR: [{ semester: null }, { semester: s.semester }] },
          { OR: [{ userId: null }, { userId }] },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.exam.findMany({
      where: { startsAt: { gte: new Date(), lte: addDays(new Date(), 3) }, subject: subjectScope(s) },
      include: { subject: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
    }),
  ]);
  const derived: StudentAlert[] = soon.map((e) => ({
    id: `soon-${e.id}`,
    type: "DEADLINE",
    message: `${e.subject.name} exam is coming up within 3 days (room ${e.room}).`,
    at: e.startsAt,
  }));
  return [...derived, ...stored.map((a) => ({ id: a.id, type: a.type, message: a.message, at: a.createdAt }))];
}

export const todayDow = () => isoWeekday(new Date());
