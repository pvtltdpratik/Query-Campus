import type { Metadata } from "next";
import { Empty, PageHeader } from "@/components/page";
import { DeleteButton, FormDialog, type Field } from "@/components/admin/form-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { formatDate, formatTime, toLocalInput } from "@/lib/datetime";
import { requireRole } from "@/lib/session";
import { createExam, deleteExam, updateExam } from "../actions";

export const metadata: Metadata = { title: "Exam schedule" };

const TYPES = ["MIDTERM", "FINAL", "PRACTICAL", "INTERNAL"].map((t) => ({ value: t, label: t[0] + t.slice(1).toLowerCase() }));

export default async function AdminExams() {
  await requireRole("ADMIN");
  const [exams, subjects] = await Promise.all([
    db.exam.findMany({ include: { subject: true }, orderBy: { startsAt: "asc" } }),
    db.subject.findMany({ orderBy: { code: "asc" } }),
  ]);

  const fields = (e?: (typeof exams)[number]): Field[] => [
    { name: "subjectId", label: "Subject", type: "select", required: true, defaultValue: e?.subjectId, options: subjects.map((s) => ({ value: s.id, label: `${s.code} – ${s.name}` })) },
    { name: "type", label: "Type", type: "select", required: true, defaultValue: e?.type ?? "FINAL", options: TYPES },
    { name: "startsAt", label: "Date and time", type: "datetime-local", required: true, defaultValue: e ? toLocalInput(e.startsAt) : undefined },
    { name: "durationMins", label: "Duration (minutes)", type: "number", required: true, defaultValue: e?.durationMins ?? 180 },
    { name: "room", label: "Room / hall", required: true, defaultValue: e?.room, placeholder: "Hall 3" },
  ];

  return (
    <>
      <PageHeader
        title="Exam schedule"
        description="Changing a date, time or venue automatically alerts affected students."
        action={<FormDialog trigger="create" title="Schedule exam" action={createExam} fields={fields()} submitLabel="Schedule" />}
      />
      {exams.length === 0 ? (
        <Empty>No exams scheduled.</Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Room</TableHead>
              <TableHead className="w-24" />
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
                <TableCell>{formatTime(e.startsAt)}</TableCell>
                <TableCell>{e.room}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <FormDialog trigger="edit" title={`Edit ${e.subject.code} exam`} action={updateExam} fields={fields(e)} hidden={{ id: e.id }} />
                    <DeleteButton action={deleteExam} id={e.id} label={`${e.subject.code} exam`} />
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
