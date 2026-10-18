import type { Metadata } from "next";
import Link from "next/link";
import { SimpleBarChart } from "@/components/charts";
import { AlertList, ExamTable, NoticeList, SlotList } from "@/components/lists";
import { PageHeader, Section, StatCard } from "@/components/page";
import { buttonVariants } from "@/components/ui/button";
import { formatShortDate, formatTime } from "@/lib/datetime";
import { requireStudent } from "@/lib/session";
import { alertsFor, attendanceSummary, noticesFor, timetableForDay, todayDow, upcomingExams } from "@/lib/data/student";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Student dashboard" };

export default async function StudentDashboard() {
  const { user, student } = await requireStudent();
  const [exams, today, attendance, notices, alerts] = await Promise.all([
    upcomingExams(student, 5),
    timetableForDay(student, todayDow()),
    attendanceSummary(student.id),
    noticesFor("STUDENT", 4),
    alertsFor(student, user.id),
  ]);

  const total = attendance.reduce((n, a) => n + a.total, 0);
  const attended = attendance.reduce((n, a) => n + a.attended, 0);
  const overall = total ? Math.round((attended / total) * 100) : null;
  const next = exams[0];

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description={`${student.department.name} · Semester ${student.semester} · Roll ${student.rollNo}`}
        action={
          <Link href="/student/assistant" className={cn(buttonVariants())}>
            Ask the assistant
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Next exam"
          value={next ? next.subject.code : "None"}
          hint={next ? `${formatShortDate(next.startsAt)}, ${formatTime(next.startsAt)} · ${next.room}` : "Nothing scheduled"}
        />
        <StatCard label="Classes today" value={today.length} hint={today[0] ? `First class: ${today[0].subject.name}` : "Enjoy the day off"} />
        <StatCard label="Overall attendance" value={overall === null ? "–" : `${overall}%`} hint={overall !== null && overall < 75 ? "Below the 75% requirement" : "Meets the 75% requirement"} />
        <StatCard label="Active alerts" value={alerts.length} hint="Last 14 days" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Alerts" description="Exam updates, venue changes and reminders">
          <AlertList alerts={alerts} />
        </Section>
        <Section title="Today's classes">
          <SlotList slots={today} />
        </Section>
      </div>

      <Section title="Upcoming exams">
        <ExamTable exams={exams} />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Attendance by subject" description="Red bars are below 75%">
          <SimpleBarChart data={attendance.map((a) => ({ name: a.code, value: a.percent }))} unit="%" max={100} threshold={75} />
        </Section>
        <Section title="Notices">
          <NoticeList notices={notices} />
        </Section>
      </div>
    </>
  );
}
