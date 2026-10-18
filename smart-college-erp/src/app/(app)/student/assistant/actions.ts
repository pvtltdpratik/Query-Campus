"use server";

import { z } from "zod";
import { answerQuery } from "@/lib/assistant/answer";
import { assertRole } from "@/lib/session";

const schema = z.object({ message: z.string().trim().min(1, "Type a question").max(300, "Keep it under 300 characters") });

export type AskResult = { ok: true; answer: string } | { ok: false; error: string };

export async function askAssistant(message: string): Promise<AskResult> {
  // Students are the primary audience; faculty and admins may use it too, scoped by their role in answerQuery.
  const user = await assertRole("STUDENT", "FACULTY", "ADMIN");
  const parsed = schema.safeParse({ message });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid question" };
  try {
    const reply = await answerQuery(user, parsed.data.message);
    return { ok: true, answer: reply.answer };
  } catch {
    return { ok: false, error: "Something went wrong while looking that up. Please try again." };
  }
}
