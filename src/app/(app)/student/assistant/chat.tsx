"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { askAssistant } from "./actions";

type Msg = { id: number; from: "user" | "bot"; text: string };

const SUGGESTIONS = ["When is the DBMS exam?", "Show me tomorrow's timetable", "What is my attendance?", "Any new notices?"];

export function Chat() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: 0, from: "bot", text: "Hi! Ask me about exams, your timetable, syllabus, attendance or notices. I only answer from official college records." },
  ]);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  function send(text: string) {
    const q = text.trim();
    if (!q || pending) return;
    setInput("");
    setMessages((m) => [...m, { id: m.length, from: "user", text: q }]);
    start(async () => {
      const res = await askAssistant(q);
      setMessages((m) => [...m, { id: m.length, from: "bot", text: res.ok ? res.answer : res.error }]);
    });
  }

  return (
    <div className="flex h-[70vh] flex-col border">
      <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}>
            <p
              className={cn(
                "max-w-[85%] px-4 py-2 text-sm whitespace-pre-line",
                m.from === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {m.text}
            </p>
          </div>
        ))}
        {pending && <p className="text-sm text-muted-foreground">Looking that up…</p>}
        <div ref={endRef} />
      </div>
      <div className="space-y-3 border-t p-4">
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <Button key={s} variant="outline" size="xs" className="normal-case tracking-normal" onClick={() => send(s)} disabled={pending}>
              {s}
            </Button>
          ))}
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question…" maxLength={300} aria-label="Your question" />
          <Button type="submit" size="icon" disabled={pending || !input.trim()} aria-label="Send">
            <SendIcon />
          </Button>
        </form>
      </div>
    </div>
  );
}
