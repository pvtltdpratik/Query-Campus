import type { Metadata } from "next";
import { SlotList } from "@/components/lists";
import { PageHeader, Section } from "@/components/page";
import { weekdayName } from "@/lib/datetime";
import { requireStudent } from "@/lib/session";
import { todayDow, weekTimetable } from "@/lib/data/student";

export const metadata: Metadata = { title: "Timetable" };

export default async function StudentTimetable() {
  const { student } = await requireStudent();
  const slots = await weekTimetable(student);
  const today = todayDow();
  const days = [1, 2, 3, 4, 5, 6, 7].filter((d) => slots.some((s) => s.dayOfWeek === d));

  return (
    <>
      <PageHeader title="Weekly timetable" description={`Section ${student.section}, Semester ${student.semester}`} />
      <div className="grid gap-6 md:grid-cols-2">
        {days.map((d) => (
          <Section key={d} title={d === today ? `${weekdayName(d)} (today)` : weekdayName(d)}>
            <SlotList slots={slots.filter((s) => s.dayOfWeek === d)} />
          </Section>
        ))}
      </div>
    </>
  );
}
