import type { Metadata } from "next";
import { Empty, PageHeader } from "@/components/page";
import { DeleteButton, FormDialog, type Field } from "@/components/admin/form-dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { createStudent, deleteStudent, updateStudent } from "../actions";

export const metadata: Metadata = { title: "Students" };

export default async function AdminStudents() {
  await requireRole("ADMIN");
  const [students, departments] = await Promise.all([
    db.student.findMany({ include: { user: true, department: true }, orderBy: { rollNo: "asc" } }),
    db.department.findMany({ orderBy: { code: "asc" } }),
  ]);
  const deptOptions = departments.map((d) => ({ value: d.id, label: `${d.code} – ${d.name}` }));

  const base = (s?: (typeof students)[number]): Field[] => [
    { name: "name", label: "Full name", required: true, defaultValue: s?.user.name },
    { name: "email", label: "Email", type: "email", required: true, defaultValue: s?.user.email },
    { name: "rollNo", label: "Roll number", required: true, defaultValue: s?.rollNo },
    { name: "departmentId", label: "Department", type: "select", required: true, defaultValue: s?.departmentId, options: deptOptions },
    { name: "semester", label: "Semester", type: "number", required: true, defaultValue: s?.semester ?? 1 },
    { name: "section", label: "Section", required: true, defaultValue: s?.section ?? "A" },
  ];
  const createFields: Field[] = [
    ...base(),
    { name: "password", label: "Initial password", type: "password", required: true, hint: "At least 8 characters. Share it with the student securely." },
  ];

  return (
    <>
      <PageHeader title="Students" description="Student accounts and academic placement." action={<FormDialog trigger="create" title="Add student" action={createStudent} fields={createFields} submitLabel="Create" />} />
      {students.length === 0 ? (
        <Empty>No students yet.</Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Roll no.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Dept</TableHead>
              <TableHead>Sem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="tabular-nums">{s.rollNo}</TableCell>
                <TableCell>
                  <div className="font-medium">{s.user.name}</div>
                  <div className="text-xs text-muted-foreground">{s.user.email}</div>
                </TableCell>
                <TableCell>{s.department.code}</TableCell>
                <TableCell>
                  {s.semester}-{s.section}
                </TableCell>
                <TableCell>
                  <Badge variant={s.user.active ? "secondary" : "default"}>{s.user.active ? "Active" : "Disabled"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <FormDialog
                      trigger="edit"
                      title={`Edit ${s.rollNo}`}
                      action={updateStudent}
                      fields={[...base(s), { name: "active", label: "Account active", type: "checkbox", defaultValue: s.user.active }]}
                      hidden={{ id: s.id }}
                    />
                    <DeleteButton action={deleteStudent} id={s.id} label={s.user.name} />
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
