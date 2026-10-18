import Link from "next/link";
import { BotMessageSquare, CalendarDays, GraduationCap, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const features = [
  { icon: BotMessageSquare, title: "Ask anything", text: "Plain-English questions about exams, timetables and syllabus, answered from official college records." },
  { icon: CalendarDays, title: "Always up to date", text: "Exam schedules, venue changes and notices appear the moment administrators publish them." },
  { icon: GraduationCap, title: "Built for students", text: "A single dashboard for attendance, upcoming exams, classes and announcements." },
  { icon: ShieldCheck, title: "Role-based access", text: "Separate student, faculty and admin experiences, enforced on the server." },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-12 px-6 py-20">
      <div className="space-y-6">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Smart College ERP</p>
        <h1 className="max-w-2xl font-heading text-4xl leading-tight font-semibold sm:text-5xl">
          Your campus, one question away.
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Check exam dates, today&apos;s timetable or your attendance, and let administrators manage it all from one place.
        </p>
        <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
          Sign in
        </Link>
      </div>
      <ul className="grid gap-6 sm:grid-cols-2">
        {features.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-4 border-t pt-4">
            <Icon className="mt-1 size-5 shrink-0 text-muted-foreground" />
            <div>
              <h2 className="font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
