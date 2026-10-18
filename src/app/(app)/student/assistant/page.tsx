import type { Metadata } from "next";
import { PageHeader } from "@/components/page";
import { requireStudent } from "@/lib/session";
import { Chat } from "./chat";

export const metadata: Metadata = { title: "Ask the assistant" };

export default async function AssistantPage() {
  await requireStudent();
  return (
    <>
      <PageHeader title="Ask the assistant" description="Answers come straight from the college database, never guesses." />
      <Chat />
    </>
  );
}
