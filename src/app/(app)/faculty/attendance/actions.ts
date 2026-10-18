"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/session";

const STATUSES = ["PRESENT", "ABSENT", "LATE"] as const;

const schema = z.object({
  subjectId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
});

export type SaveResult = { ok: boolean; message: string };

export async function saveAttendance(_prev: SaveResult | null, formData: FormData): Promise<SaveResult> {
  const user = await assertRole("FACULTY");
  const parsed = schema.safeParse({ subjectId: formData.get("subjectId"), date: formData.get("date") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid request" };
  const { subjectId, date } = parsed.data;

  const day = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(day.getTime())) return { ok: false, message: "Invalid date" };
  if (day.getTime() > Date.now()) return { ok: false, message: "Attendance cannot be marked for a future date" };

  // Ownership check on the server: faculty can only mark attendance for their own subjects.
  const subject = await db.subject.findFirst({ where: { id: subjectId, faculty: { userId: user.id } } });
  if (!subject) return { ok: false, message: "You are not assigned to this subject" };

  const students = await db.student.findMany({
    where: { departmentId: subject.departmentId, semester: subject.semester },
    select: { id: true },
  });

  const writes = students.flatMap((s) => {
    const status = z.enum(STATUSES).safeParse(formData.get(`status_${s.id}`));
    if (!status.success) return [];
    return [
      db.attendance.upsert({
        where: { studentId_subjectId_date: { studentId: s.id, subjectId, date: day } },
        update: { status: status.data },
        create: { studentId: s.id, subjectId, date: day, status: status.data },
      }),
    ];
  });
  if (writes.length === 0) return { ok: false, message: "No attendance entries submitted" };

  await db.$transaction(writes);
  revalidatePath("/faculty/attendance");
  return { ok: true, message: `Saved attendance for ${writes.length} students` };
}
