import type { Metadata } from "next";
import { NoticeList } from "@/components/lists";
import { PageHeader, Section } from "@/components/page";
import { requireStudent } from "@/lib/session";
import { noticesFor } from "@/lib/data/student";

export const metadata: Metadata = { title: "Notices" };

export default async function StudentNotices() {
  await requireStudent();
  const notices = await noticesFor("STUDENT", 50);
  return (
    <>
      <PageHeader title="Notices" description="Official announcements from the college." />
      <Section title="Latest">
        <NoticeList notices={notices} />
      </Section>
    </>
  );
}
