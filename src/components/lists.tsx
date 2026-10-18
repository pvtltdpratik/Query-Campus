import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatClock, formatDate, formatShortDate, formatTime, humanDuration, weekdayName } from "@/lib/datetime";
import { Empty } from "@/components/page";

type ExamRow = {
  id: string;
  type: string;
  startsAt: Date;
  durationMins: number;
  room: string;
  subject: { code: string; name: string };
};

export function ExamTable({ exams }: { exams: ExamRow[] }) {
  if (exams.length === 0) return <Empty>No upcoming exams.</Empty>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Venue</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {exams.map((e) => (
          <TableRow key={e.id}>
            <TableCell>
              <div className="font-medium">{e.subject.name}</div>
              <div className="text-xs text-muted-foreground">
                {e.subject.code} · <span className="capitalize">{e.type.toLowerCase()}</span>
              </div>
            </TableCell>
            <TableCell>{formatDate(e.startsAt)}</TableCell>
            <TableCell>
              {formatTime(e.startsAt)} <span className="text-muted-foreground">({humanDuration(e.durationMins)})</span>
            </TableCell>
            <TableCell>{e.room}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

type SlotRow = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
  subject: { code: string; name: string };
};

export function SlotList({ slots, showDay = false }: { slots: SlotRow[]; showDay?: boolean }) {
  if (slots.length === 0) return <Empty>No classes scheduled.</Empty>;
  return (
    <ul className="divide-y">
      {slots.map((s) => (
        <li key={s.id} className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="font-medium">{s.subject.name}</p>
            <p className="text-xs text-muted-foreground">
              {s.subject.code} · {s.room}
              {showDay && ` · ${weekdayName(s.dayOfWeek)}`}
            </p>
          </div>
          <p className="text-sm whitespace-nowrap tabular-nums">
            {formatClock(s.startTime)} – {formatClock(s.endTime)}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function NoticeList({ notices }: { notices: { id: string; title: string; body: string; publishedAt: Date }[] }) {
  if (notices.length === 0) return <Empty>No active notices.</Empty>;
  return (
    <ul className="divide-y">
      {notices.map((n) => (
        <li key={n.id} className="space-y-1 py-3">
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-medium">{n.title}</p>
            <span className="text-xs whitespace-nowrap text-muted-foreground">{formatShortDate(n.publishedAt)}</span>
          </div>
          <p className="text-sm text-muted-foreground">{n.body}</p>
        </li>
      ))}
    </ul>
  );
}

const ALERT_LABEL: Record<string, string> = {
  EXAM_UPDATE: "Exam update",
  VENUE_CHANGE: "Venue change",
  DEADLINE: "Reminder",
  GENERAL: "Alert",
};

export function AlertList({ alerts }: { alerts: { id: string; type: string; message: string; at: Date }[] }) {
  if (alerts.length === 0) return <Empty>You&apos;re all caught up.</Empty>;
  return (
    <ul className="divide-y">
      {alerts.map((a) => (
        <li key={a.id} className="flex items-start gap-3 py-3">
          <Badge variant={a.type === "VENUE_CHANGE" || a.type === "EXAM_UPDATE" ? "default" : "secondary"} className="mt-0.5 shrink-0">
            {ALERT_LABEL[a.type] ?? "Alert"}
          </Badge>
          <p className="text-sm">{a.message}</p>
        </li>
      ))}
    </ul>
  );
}
