import type { Metadata } from "next";
import { ExamTable } from "@/components/lists";
import { PageHeader, Section } from "@/components/page";
import { requireStudent } from "@/lib/session";
import { upcomingExams } from "@/lib/data/student";

export const metadata: Metadata = { title: "Exam schedule" };

export default async function StudentExams() {
  const { student } = await requireStudent();
  const exams = await upcomingExams(student, 50);
  return (
    <>
      <PageHeader title="Exam schedule" description="Dates, times and halls for your semester." />
      <Section title="Upcoming exams">
        <ExamTable exams={exams} />
      </Section>
    </>
  );
}
