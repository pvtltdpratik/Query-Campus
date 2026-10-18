import type { Metadata } from "next";
import { Empty, PageHeader } from "@/components/page";
import { DeleteButton, FormDialog, type Field } from "@/components/admin/form-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { formatClock, weekdayName } from "@/lib/datetime";
import { requireRole } from "@/lib/session";
import { createSlot, deleteSlot, updateSlot } from "../actions";

export const metadata: Metadata = { title: "Timetable" };

const DAYS = [1, 2, 3, 4, 5, 6, 7].map((d) => ({ value: String(d), label: weekdayName(d) }));

export default async function AdminTimetable() {
  await requireRole("ADMIN");
  const [slots, subjects] = await Promise.all([
    db.timetableEntry.findMany({ include: { subject: true }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] }),
    db.subject.findMany({ orderBy: { code: "asc" } }),
  ]);

  const fields = (s?: (typeof slots)[number]): Field[] => [
    { name: "subjectId", label: "Subject", type: "select", required: true, defaultValue: s?.subjectId, options: subjects.map((x) => ({ value: x.id, label: `${x.code} – ${x.name}` })) },
    { name: "dayOfWeek", label: "Day", type: "select", required: true, defaultValue: String(s?.dayOfWeek ?? 1), options: DAYS },
    { name: "startTime", label: "Starts", type: "time", required: true, defaultValue: s?.startTime ?? "09:00" },
    { name: "endTime", label: "Ends", type: "time", required: true, defaultValue: s?.endTime ?? "10:00" },
    { name: "room", label: "Room", required: true, defaultValue: s?.room },
    { name: "section", label: "Section", required: true, defaultValue: s?.section ?? "A" },
  ];

  return (
    <>
      <PageHeader title="Timetable" description="Weekly class slots by section." action={<FormDialog trigger="create" title="Add class" action={createSlot} fields={fields()} submitLabel="Add" />} />
      {slots.length === 0 ? (
        <Empty>No classes scheduled.</Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Sec</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {slots.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{weekdayName(s.dayOfWeek)}</TableCell>
                <TableCell className="tabular-nums">
                  {formatClock(s.startTime)} – {formatClock(s.endTime)}
                </TableCell>
                <TableCell>
                  {s.subject.name} <span className="text-xs text-muted-foreground">{s.subject.code}</span>
                </TableCell>
                <TableCell>{s.room}</TableCell>
                <TableCell>{s.section}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <FormDialog trigger="edit" title="Edit class" action={updateSlot} fields={fields(s)} hidden={{ id: s.id }} />
                    <DeleteButton action={deleteSlot} id={s.id} label={`${s.subject.code} class`} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
