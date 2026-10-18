import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/session";
import {
  addDays, formatClock, formatDate, formatShortDate, formatTime, humanDuration, isoWeekday, weekdayName,
} from "@/lib/datetime";
import { detectDay, detectIntent, matchSubject, wantsAll, type Intent, type SubjectRef } from "./parse";

export type AssistantReply = { intent: Intent; answer: string; answered: boolean };

type Scope = { departmentId: string; semester: number; section: string } | null;

const HELP = [
  "I answer from the official college database. Try asking:",
  "• When is the DBMS exam?",
  "• Show me tomorrow's timetable",
  "• What is the syllabus of Operating Systems?",
  "• What is my attendance in CS302?",
  "• Who teaches Computer Networks?",
  "• Any new notices?",
].join("\n");

const NOT_FOUND = "I couldn't find that in the college records. Try including a subject name or code (for example “DBMS” or “CS301”), or ask for help to see what I can answer.";

/** Resolve the caller's department/semester so answers are limited to their own courses. */
async function scopeFor(user: CurrentUser): Promise<Scope> {
  if (user.role !== "STUDENT") return null;
  const s = await db.student.findUnique({ where: { userId: user.id } });
  return s ? { departmentId: s.departmentId, semester: s.semester, section: s.section } : null;
}

async function loadSubjects(scope: Scope): Promise<(SubjectRef & { semester: number })[]> {
  return db.subject.findMany({
    where: scope ? { departmentId: scope.departmentId, semester: scope.semester } : {},
    select: { id: true, code: true, name: true, aliases: true, semester: true },
  });
}

export async function answerQuery(user: CurrentUser, text: string): Promise<AssistantReply> {
  const scope = await scopeFor(user);
  const subjects = await loadSubjects(scope);
  const intent = detectIntent(text);
  const subject = matchSubject(text, subjects);

  let reply: AssistantReply;
  switch (intent) {
    case "exam": reply = await examAnswer(intent, subject, text, scope); break;
    case "timetable": reply = await timetableAnswer(intent, subject, text, scope); break;
    case "syllabus": reply = await syllabusAnswer(intent, subject); break;
    case "attendance": reply = await attendanceAnswer(intent, user, subject); break;
    case "faculty": reply = await facultyAnswer(intent, subject); break;
    case "notice": reply = await noticeAnswer(intent, user); break;
    case "help": reply = { intent, answer: HELP, answered: true }; break;
    default:
      // No explicit intent but a subject was named: give the most useful summary.
      reply = subject
        ? await examAnswer("exam", subject, text, scope)
        : { intent: "unknown", answer: `${NOT_FOUND}\n\n${HELP}`, answered: false };
  }

  // Log for analytics; never let a logging failure break the answer.
  await db.queryLog
    .create({ data: { userId: user.id, query: text.slice(0, 500), intent: reply.intent, answered: reply.answered } })
    .catch(() => undefined);
  return reply;
}

async function examAnswer(intent: Intent, subject: SubjectRef | null, text: string, scope: Scope): Promise<AssistantReply> {
  const now = new Date();
  if (subject) {
    const exams = await db.exam.findMany({
      where: { subjectId: subject.id, startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: wantsAll(text) ? 5 : 1,
    });
    if (exams.length === 0) {
      return { intent, answer: `No upcoming exam is scheduled for ${subject.name} (${subject.code}) in the records yet.`, answered: true };
    }
    const lines = exams.map(
      (e) =>
        `The ${subject.name} (${subject.code}) ${e.type.toLowerCase()} exam is scheduled for ${formatDate(e.startsAt)} at ${formatTime(e.startsAt)} in ${e.room} (${humanDuration(e.durationMins)}).`,
    );
    return { intent, answer: lines.join("\n"), answered: true };
  }

  const exams = await db.exam.findMany({
    where: { startsAt: { gte: now }, ...(scope ? { subject: { departmentId: scope.departmentId, semester: scope.semester } } : {}) },
    include: { subject: true },
    orderBy: { startsAt: "asc" },
    take: 8,
  });
  if (exams.length === 0) return { intent, answer: "There are no upcoming exams in the schedule.", answered: true };
  const lines = exams.map((e) => `• ${e.subject.name} (${e.subject.code}) – ${formatShortDate(e.startsAt)}, ${formatTime(e.startsAt)}, ${e.room}`);
  return { intent, answer: `Upcoming exams:\n${lines.join("\n")}`, answered: true };
}

async function timetableAnswer(intent: Intent, subject: SubjectRef | null, text: string, scope: Scope): Promise<AssistantReply> {
  const now = new Date();
  const todayDow = isoWeekday(now);
  const day = detectDay(text, todayDow);
  const subjectFilter = scope ? { departmentId: scope.departmentId, semester: scope.semester } : {};

  if (subject && !day) {
    const rows = await db.timetableEntry.findMany({
      where: { subjectId: subject.id, ...(scope ? { section: scope.section } : {}) },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    if (rows.length === 0) return { intent, answer: `${subject.name} has no timetable slots in the records.`, answered: true };
    const lines = rows.map((r) => `• ${weekdayName(r.dayOfWeek)} ${formatClock(r.startTime)}–${formatClock(r.endTime)}, ${r.room}`);
    return { intent, answer: `${subject.name} (${subject.code}) classes:\n${lines.join("\n")}`, answered: true };
  }

  const target = day ?? { dayOfWeek: todayDow, label: "today", offsetDays: 0 };
  const rows = await db.timetableEntry.findMany({
    where: { dayOfWeek: target.dayOfWeek, ...(scope ? { section: scope.section } : {}), subject: { ...subjectFilter, ...(subject ? { id: subject.id } : {}) } },
    include: { subject: true },
    orderBy: { startTime: "asc" },
  });
  const when = target.offsetDays !== null ? `${target.label} (${formatDate(addDays(now, target.offsetDays))})` : weekdayName(target.dayOfWeek);
  if (rows.length === 0) return { intent, answer: `No classes are scheduled for ${when}.`, answered: true };
  const lines = rows.map((r) => `• ${formatClock(r.startTime)}–${formatClock(r.endTime)}  ${r.subject.name} (${r.subject.code}), ${r.room}`);
  return { intent, answer: `Timetable for ${when}:\n${lines.join("\n")}`, answered: true };
}

async function syllabusAnswer(intent: Intent, subject: SubjectRef | null): Promise<AssistantReply> {
  if (!subject) return { intent, answer: "Which subject's syllabus do you need? Mention a subject name or code, for example “syllabus of DBMS”.", answered: false };
  const row = await db.subject.findUnique({ where: { id: subject.id }, select: { syllabus: true, credits: true } });
  if (!row?.syllabus) return { intent, answer: `The syllabus for ${subject.name} (${subject.code}) has not been published yet.`, answered: true };
  return { intent, answer: `${subject.name} (${subject.code}, ${row.credits} credits)\n${row.syllabus.replace(/\s*(Unit \d+:)/g, "\n• $1").trim()}`, answered: true };
}

async function attendanceAnswer(intent: Intent, user: CurrentUser, subject: SubjectRef | null): Promise<AssistantReply> {
  if (user.role !== "STUDENT") return { intent, answer: "Attendance summaries are available to students for their own records. Faculty can mark attendance from the Faculty portal.", answered: true };
  const student = await db.student.findUnique({ where: { userId: user.id } });
  if (!student) return { intent, answer: NOT_FOUND, answered: false };

  const rows = await db.attendance.groupBy({
    by: ["subjectId", "status"],
    where: { studentId: student.id, ...(subject ? { subjectId: subject.id } : {}) },
    _count: { _all: true },
  });
  if (rows.length === 0) return { intent, answer: "No attendance has been recorded for you yet.", answered: true };

  const subs = await db.subject.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.subjectId))] } }, select: { id: true, code: true, name: true } });
  const lines = subs.map((s) => {
    const mine = rows.filter((r) => r.subjectId === s.id);
    const total = mine.reduce((n, r) => n + r._count._all, 0);
    const attended = mine.filter((r) => r.status !== "ABSENT").reduce((n, r) => n + r._count._all, 0);
    const pct = Math.round((attended / total) * 100);
    return `• ${s.name} (${s.code}): ${pct}% (${attended}/${total})${pct < 75 ? " – below 75%" : ""}`;
  });
  return { intent, answer: `Your attendance:\n${lines.join("\n")}`, answered: true };
}

async function facultyAnswer(intent: Intent, subject: SubjectRef | null): Promise<AssistantReply> {
  if (!subject) return { intent, answer: "Which subject? For example “who teaches DBMS”.", answered: false };
  const row = await db.subject.findUnique({ where: { id: subject.id }, include: { faculty: { include: { user: true } } } });
  if (!row?.faculty) return { intent, answer: `No faculty is assigned to ${subject.name} (${subject.code}) yet.`, answered: true };
  const f = row.faculty;
  return { intent, answer: `${subject.name} (${subject.code}) is taught by ${f.user.name} (${f.designation})${f.cabin ? `, cabin ${f.cabin}` : ""}.`, answered: true };
}

async function noticeAnswer(intent: Intent, user: CurrentUser): Promise<AssistantReply> {
  const now = new Date();
  const notices = await db.notice.findMany({
    where: { OR: [{ audience: null }, { audience: user.role }], AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }] },
    orderBy: { publishedAt: "desc" },
    take: 5,
  });
  if (notices.length === 0) return { intent, answer: "There are no active notices right now.", answered: true };
  return { intent, answer: `Latest notices:\n${notices.map((n) => `• ${n.title} (${formatShortDate(n.publishedAt)})\n  ${n.body}`).join("\n")}`, answered: true };
}
