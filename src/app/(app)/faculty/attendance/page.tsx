import type { Metadata } from "next";
import Link from "next/link";
import { Empty, PageHeader, Section } from "@/components/page";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireFaculty } from "@/lib/session";
import { cn } from "@/lib/utils";
import { AttendanceForm } from "./attendance-form";

export const metadata: Metadata = { title: "Mark attendance" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function FacultyAttendance({ searchParams }: { searchParams: Promise<{ subject?: string; date?: string }> }) {
  const { faculty } = await requireFaculty();
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const date = sp.date && DATE_RE.test(sp.date) && sp.date <= today ? sp.date : today;

  const subjects = await db.subject.findMany({ where: { facultyId: faculty.id }, orderBy: { code: "asc" } });
  const subject = subjects.find((s) => s.id === sp.subject) ?? null;

  let rows: { id: string; rollNo: string; name: string; status: "PRESENT" | "ABSENT" | "LATE" }[] = [];
  if (subject) {
    const students = await db.student.findMany({
      where: { departmentId: subject.departmentId, semester: subject.semester },
      include: { user: { select: { name: true } } },
      orderBy: { rollNo: "asc" },
    });
    const existing = await db.attendance.findMany({
      where: { subjectId: subject.id, date: new Date(`${date}T00:00:00.000Z`) },
    });
    const byStudent = new Map(existing.map((a) => [a.studentId, a.status]));
    rows = students.map((s) => ({ id: s.id, rollNo: s.rollNo, name: s.user.name, status: byStudent.get(s.id) ?? "PRESENT" }));
  }

  return (
    <>
      <PageHeader title="Mark attendance" description="Pick one of your subjects, then record who attended." />
      <Section title="Subject">
        {subjects.length === 0 ? (
          <Empty>No subjects are assigned to you.</Empty>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <Link
                key={s.id}
                href={`/faculty/attendance?subject=${s.id}&date=${date}`}
                className={cn(buttonVariants({ variant: s.id === subject?.id ? "default" : "outline", size: "sm" }))}
              >
                {s.code}
              </Link>
            ))}
          </div>
        )}
      </Section>
      {subject && (
        <Section title={`${subject.name} · ${date}`} description="Existing entries for this date are pre-filled and can be corrected.">
          <form className="mb-6 flex items-end gap-3" action="/faculty/attendance">
            <input type="hidden" name="subject" value={subject.id} />
            <label className="space-y-1 text-xs font-semibold tracking-wide uppercase">
              Date
              <input type="date" name="date" defaultValue={date} max={today} className="mt-1 block h-9 border bg-background px-2 text-sm font-normal normal-case" />
            </label>
            <button type="submit" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Load
            </button>
          </form>
          {rows.length === 0 ? <Empty>No students enrolled for this subject.</Empty> : <AttendanceForm key={`${subject.id}-${date}`} subjectId={subject.id} date={date} rows={rows} />}
        </Section>
      )}
    </>
  );
}
