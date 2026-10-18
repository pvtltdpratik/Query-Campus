"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { saveAttendance, type SaveResult } from "./actions";

type Row = { id: string; rollNo: string; name: string; status: "PRESENT" | "ABSENT" | "LATE" };

export function AttendanceForm({ subjectId, date, rows }: { subjectId: string; date: string; rows: Row[] }) {
  const [, action, pending] = useActionState<SaveResult | null, FormData>(async (prev, fd) => {
    const result = await saveAttendance(prev, fd);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
    return result;
  }, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="date" value={date} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Roll no.</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="tabular-nums">{r.rollNo}</TableCell>
              <TableCell>{r.name}</TableCell>
              <TableCell>
                <select
                  name={`status_${r.id}`}
                  defaultValue={r.status}
                  aria-label={`Status for ${r.name}`}
                  className="h-9 border bg-background px-2 text-sm"
                >
                  <option value="PRESENT">Present</option>
                  <option value="LATE">Late</option>
                  <option value="ABSENT">Absent</option>
                </select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save attendance"}
      </Button>
    </form>
  );
}
