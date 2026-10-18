import type { Metadata } from "next";
import { SimpleBarChart } from "@/components/charts";
import { PageHeader, Section } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireStudent } from "@/lib/session";
import { attendanceSummary } from "@/lib/data/student";

export const metadata: Metadata = { title: "Attendance" };

export default async function StudentAttendance() {
  const { student } = await requireStudent();
  const rows = await attendanceSummary(student.id);

  return (
    <>
      <PageHeader title="Attendance" description="Present and late count as attended. 75% is required." />
      <Section title="By subject">
        <SimpleBarChart data={rows.map((r) => ({ name: r.code, value: r.percent }))} unit="%" max={100} threshold={75} />
      </Section>
      <Section title="Details">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead className="text-right">Attended</TableHead>
              <TableHead className="text-right">Held</TableHead>
              <TableHead className="text-right">Percent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.subjectId}>
                <TableCell>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.code}</div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.attended}</TableCell>
                <TableCell className="text-right tabular-nums">{r.total}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={r.percent < 75 ? "default" : "secondary"}>{r.percent}%</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
    </>
  );
}
