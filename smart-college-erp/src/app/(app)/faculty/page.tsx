import type { Metadata } from "next";
import Link from "next/link";
import { ExamTable, NoticeList, SlotList } from "@/components/lists";
import { PageHeader, Section, StatCard } from "@/components/page";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { isoWeekday } from "@/lib/datetime";
import { noticesFor } from "@/lib/data/student";
import { requireFaculty } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Faculty dashboard" };

export default async function FacultyDashboard() {
  const { user, faculty } = await requireFaculty();
  const mine = { facultyId: faculty.id };
  const [subjects, today, exams, notices] = await Promise.all([
    db.subject.findMany({ where: mine, orderBy: { code: "asc" } }),
    db.timetableEntry.findMany({
      where: { dayOfWeek: isoWeekday(new Date()), subject: mine },
      include: { subject: { select: { code: true, name: true } } },
      orderBy: { startTime: "asc" },
    }),
    db.exam.findMany({
      where: { startsAt: { gte: new Date() }, subject: mine },
      include: { subject: { select: { code: true, name: true } } },
      orderBy: { startsAt: "asc" },
      take: 5,
    }),
    noticesFor("FACULTY", 4),
  ]);

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name}`}
        description={`${faculty.designation} · ${faculty.department.name}`}
        action={
          <Link href="/faculty/attendance" className={cn(buttonVariants())}>
            Mark attendance
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="My subjects" value={subjects.length} />
        <StatCard label="Classes today" value={today.length} />
        <StatCard label="Upcoming exams" value={exams.length} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Today's classes">
          <SlotList slots={today} />
        </Section>
        <Section title="Notices">
          <NoticeList notices={notices} />
        </Section>
      </div>
      <Section title="Upcoming exams for my subjects">
        <ExamTable exams={exams} />
      </Section>
    </>
  );
}
