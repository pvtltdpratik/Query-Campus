"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { fromLocalInput, formatDateTime } from "@/lib/datetime";
import { hashPassword } from "@/lib/password";
import { assertRole } from "@/lib/session";

type Result = { ok: boolean; message: string };
const ok = (message: string): Result => ({ ok: true, message });
const fail = (message: string): Result => ({ ok: false, message });

// Every action is its own trust boundary: re-check the role, validate input, then touch the DB via Prisma
// (parameterised queries). Never rely on the page that rendered the form.
async function guard<T>(schema: z.ZodType<T>, formData: FormData): Promise<{ data: T } | { error: Result }> {
  await assertRole("ADMIN");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: fail(parsed.error.issues[0]?.message ?? "Invalid input") };
  return { data: parsed.data };
}

function dbError(e: unknown): Result {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return fail("A record with the same unique value already exists");
    if (e.code === "P2025") return fail("That record no longer exists");
    if (e.code === "P2003") return fail("This record is still referenced by other data");
  }
  return fail("Could not save changes. Please try again.");
}

const id = z.string().min(1).max(40);
const text = (label: string, max = 200) => z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);
const int = (label: string, min: number, max: number) =>
  z.coerce.number({ error: `${label} must be a number` }).int(`${label} must be a whole number`).min(min, `${label} must be at least ${min}`).max(max, `${label} must be at most ${max}`);
const optionalId = z.string().max(40).transform((v) => v || null).nullable();
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM time");

const deleteSchema = z.object({ id });

/* ------------------------------ Subjects ------------------------------ */

const subjectSchema = z.object({
  code: text("Code", 20).transform((v) => v.toUpperCase()),
  name: text("Name", 120),
  aliases: z.string().max(200).default("").transform((v) => v.split(",").map((a) => a.trim().toLowerCase()).filter(Boolean)),
  departmentId: id,
  semester: int("Semester", 1, 12),
  credits: int("Credits", 1, 10),
  facultyId: optionalId,
  syllabus: z.string().trim().max(4000).transform((v) => v || null),
});

export async function createSubject(_p: Result | null, fd: FormData): Promise<Result> {
  const r = await guard(subjectSchema, fd);
  if ("error" in r) return r.error;
  try {
    await db.subject.create({ data: r.data });
  } catch (e) {
    return dbError(e);
  }
  revalidatePath("/admin/subjects");
  return ok("Subject created");
}

export async function updateSubject(_p: Result | null, fd: FormData): Promise<Result> {
  const r = await guard(subjectSchema.extend({ id }), fd);
  if ("error" in r) return r.error;
  const { id: subjectId, ...data } = r.data;
  try {
    await db.subject.update({ where: { id: subjectId }, data });
  } catch (e) {
    return dbError(e);
  }
  revalidatePath("/admin/subjects");
  return ok("Subject updated");
}

export async function deleteSubject(_p: Result | null, fd: FormData): Promise<Result> {
  const r = await guard(deleteSchema, fd);
  if ("error" in r) return r.error;
  try {
    await db.subject.delete({ where: { id: r.data.id } });
  } catch (e) {
    return dbError(e);
  }
  revalidatePath("/admin/subjects");
  return ok("Subject deleted along with its exams, timetable and attendance");
}

/* -------------------------------- Exams -------------------------------- */

const examSchema = z.object({
  subjectId: id,
  type: z.enum(["MIDTERM", "FINAL", "PRACTICAL", "INTERNAL"]),
  startsAt: z.string().transform((v, ctx) => {
    const d = fromLocalInput(v);
    if (!d) ctx.addIssue({ code: "custom", message: "Enter a valid date and time" });
    return d as Date;
  }),
  durationMins: int("Duration", 15, 600),
  room: text("Room", 60),
});

export async function createExam(_p: Result | null, fd: FormData): Promise<Result> {
  const r = await guard(examSchema, fd);
  if ("error" in r) return r.error;
  try {
    const exam = await db.exam.create({ data: r.data, include: { subject: true } });
    await db.alert.create({
      data: {
        type: "EXAM_UPDATE",
        message: `${exam.subject.name} exam scheduled for ${formatDateTime(exam.startsAt)} in ${exam.room}.`,
        departmentId: exam.subject.departmentId,
        semester: exam.subject.semester,
      },
    });
  } catch (e) {
    return dbError(e);
  }
  revalidatePath("/admin/exams");
  return ok("Exam scheduled");
}

export async function updateExam(_p: Result | null, fd: FormData): Promise<Result> {
  const r = await guard(examSchema.extend({ id }), fd);
  if ("error" in r) return r.error;
  const { id: examId, ...data } = r.data;
  try {
    const before = await db.exam.findUnique({ where: { id: examId } });
    if (!before) return fail("That exam no longer exists");
    const exam = await db.exam.update({ where: { id: examId }, data, include: { subject: true } });

    // Smart alerts: tell affected students when the venue or time changes.
    const roomChanged = before.room !== exam.room;
    const timeChanged = before.startsAt.getTime() !== exam.startsAt.getTime();
    if (roomChanged || timeChanged) {
      const parts = [
        timeChanged ? `rescheduled to ${formatDateTime(exam.startsAt)}` : null,
        roomChanged ? `venue changed from ${before.room} to ${exam.room}` : null,
      ].filter(Boolean);
      await db.alert.create({
        data: {
          type: roomChanged ? "VENUE_CHANGE" : "EXAM_UPDATE",
          message: `${exam.subject.name} exam ${parts.join(" and ")}.`,
          departmentId: exam.subject.departmentId,
          semester: exam.subject.semester,
        },
      });
    }
  } catch (e) {
    return dbError(e);
  }
  revalidatePath("/admin/exams");
  return ok("Exam updated");
}

export async function deleteExam(_p: Result | null, fd: FormData): Promise<Result> {
  const r = await guard(deleteSchema, fd);
  if ("error" in r) return r.error;
  try {
    await db.exam.delete({ where: { id: r.data.id } });
  } catch (e) {
    return dbError(e);
  }
  revalidatePath("/admin/exams");
  return ok("Exam removed");
}

/* ------------------------------ Timetable ------------------------------ */

const slotSchema = z
  .object({
    subjectId: id,
    dayOfWeek: int("Day", 1, 7),
    startTime: hhmm,
    endTime: hhmm,
    room: text("Room", 60),
    section: text("Section", 10),
  })
  .refine((s) => s.startTime < s.endTime, { message: "End time must be after start time", path: ["endTime"] });

export async function createSlot(_p: Result | null, fd: FormData): Promise<Result> {
  const r = await guard(slotSchema, fd);
  if ("error" in r) return r.error;
  try {
    await db.timetableEntry.create({ data: r.data });
  } catch (e) {
    return dbError(e);
  }
  revalidatePath("/admin/timetable");
  return ok("Class added");
}

export async function updateSlot(_p: Result | null, fd: FormData): Promise<Result> {
  const schema = z.object({ id }).and(slotSchema);
  const r = await guard(schema, fd);
  if ("error" in r) return r.error;
  const { id: slotId, ...data } = r.data;
  try {
    await db.timetableEntry.update({ where: { id: slotId }, data });
  } catch (e) {
    return dbError(e);
  }
  revalidatePath("/admin/timetable");
  return ok("Class updated");
}

export async function deleteSlot(_p: Result | null, fd: FormData): Promise<Result> {
  const r = await guard(deleteSchema, fd);
  if ("error" in r) return r.error;
  try {
    await db.timetableEntry.delete({ where: { id: r.data.id } });
  } catch (e) {
    return dbError(e);
  }
  revalidatePath("/admin/timetable");
  return ok("Class removed");
}

/* ------------------------------ Students ------------------------------ */

const studentBase = z.object({
  name: text("Name", 100),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  rollNo: text("Roll number", 30),
  departmentId: id,
  semester: int("Semester", 1, 12),
  section: text("Section", 10),
});

export async function createStudent(_p: Result | null, fd: FormData): Promise<Result> {
  const r = await guard(studentBase.extend({ password: z.string().min(8, "Password must be at least 8 characters").max(100) }), fd);
  if ("error" in r) return r.error;
  const { password, name, email, ...profile } = r.data;
  try {
    await db.user.create({
      data: { name, email, role: "STUDENT", passwordHash: hashPassword(password), student: { create: profile } },
    });
  } catch (e) {
    return dbError(e);
  }
  revalidatePath("/admin/students");
  return ok("Student created");
}

export async function updateStudent(_p: Result | null, fd: FormData): Promise<Result> {
  const r = await guard(studentBase.extend({ id, active: z.string().optional().transform((v) => v === "on") }), fd);
  if ("error" in r) return r.error;
  const { id: studentId, name, email, active, ...profile } = r.data;
  try {
    const student = await db.student.update({ where: { id: studentId }, data: profile });
    await db.user.update({ where: { id: student.userId }, data: { name, email, active } });
  } catch (e) {
    return dbError(e);
  }
  revalidatePath("/admin/students");
  return ok("Student updated");
}

export async function deleteStudent(_p: Result | null, fd: FormData): Promise<Result> {
  const r = await guard(deleteSchema, fd);
  if ("error" in r) return r.error;
  try {
    const student = await db.student.findUnique({ where: { id: r.data.id } });
    if (!student) return fail("That student no longer exists");
    await db.user.delete({ where: { id: student.userId } }); // cascades to the student profile and attendance
  } catch (e) {
    return dbError(e);
  }
  revalidatePath("/admin/students");
  return ok("Student removed");
}

/* ------------------------------- Notices ------------------------------- */

const noticeSchema = z.object({
  title: text("Title", 150),
  body: text("Message", 2000),
  audience: z.enum(["", "STUDENT", "FACULTY", "ADMIN"]).transform((v) => (v === "" ? null : v)),
  expiresAt: z
    .string()
    .transform((v, ctx) => {
      if (!v) return null;
      const d = new Date(`${v}T23:59:59.999Z`);
      if (Number.isNaN(d.getTime())) ctx.addIssue({ code: "custom", message: "Invalid expiry date" });
      return d;
    }),
});

export async function createNotice(_p: Result | null, fd: FormData): Promise<Result> {
  const r = await guard(noticeSchema, fd);
  if ("error" in r) return r.error;
  const admin = await assertRole("ADMIN");
  try {
    await db.notice.create({ data: { ...r.data, authorId: admin.id } });
  } catch (e) {
    return dbError(e);
  }
  revalidatePath("/admin/notices");
  return ok("Notice published");
}

export async function updateNotice(_p: Result | null, fd: FormData): Promise<Result> {
  const r = await guard(noticeSchema.extend({ id }), fd);
  if ("error" in r) return r.error;
  const { id: noticeId, ...data } = r.data;
  try {
    await db.notice.update({ where: { id: noticeId }, data });
  } catch (e) {
    return dbError(e);
  }
  revalidatePath("/admin/notices");
  return ok("Notice updated");
}

export async function deleteNotice(_p: Result | null, fd: FormData): Promise<Result> {
  const r = await guard(deleteSchema, fd);
  if ("error" in r) return r.error;
  try {
    await db.notice.delete({ where: { id: r.data.id } });
  } catch (e) {
    return dbError(e);
  }
  revalidatePath("/admin/notices");
  return ok("Notice deleted");
}
