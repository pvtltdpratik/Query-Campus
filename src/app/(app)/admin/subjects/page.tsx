import type { Metadata } from "next";
import { Empty, PageHeader } from "@/components/page";
import { DeleteButton, FormDialog, type Field } from "@/components/admin/form-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { createSubject, deleteSubject, updateSubject } from "../actions";

export const metadata: Metadata = { title: "Subjects" };

export default async function AdminSubjects() {
  await requireRole("ADMIN");
  const [subjects, departments, faculty] = await Promise.all([
    db.subject.findMany({ include: { department: true, faculty: { include: { user: true } } }, orderBy: [{ semester: "asc" }, { code: "asc" }] }),
    db.department.findMany({ orderBy: { code: "asc" } }),
    db.faculty.findMany({ include: { user: true }, orderBy: { employeeId: "asc" } }),
  ]);

  const fields = (s?: (typeof subjects)[number]): Field[] => [
    { name: "code", label: "Subject code", required: true, defaultValue: s?.code, placeholder: "CS301" },
    { name: "name", label: "Name", required: true, defaultValue: s?.name },
    { name: "aliases", label: "Aliases", defaultValue: s?.aliases.join(", "), placeholder: "dbms, database", hint: "Comma-separated short names students use. Lets the assistant recognise “DBMS”." },
    { name: "departmentId", label: "Department", type: "select", required: true, defaultValue: s?.departmentId, options: departments.map((d) => ({ value: d.id, label: `${d.code} – ${d.name}` })) },
    { name: "semester", label: "Semester", type: "number", required: true, defaultValue: s?.semester ?? 1 },
    { name: "credits", label: "Credits", type: "number", required: true, defaultValue: s?.credits ?? 3 },
    { name: "facultyId", label: "Faculty", type: "select", defaultValue: s?.facultyId ?? "", options: faculty.map((f) => ({ value: f.id, label: `${f.user.name} (${f.employeeId})` })) },
    { name: "syllabus", label: "Syllabus", type: "textarea", defaultValue: s?.syllabus ?? "", hint: "Write “Unit 1: …” entries; the assistant lists them as bullets." },
  ];

  return (
    <>
      <PageHeader title="Subjects" description="Courses, codes and syllabus content." action={<FormDialog trigger="create" title="Add subject" action={createSubject} fields={fields()} submitLabel="Create" />} />
      {subjects.length === 0 ? (
        <Empty>No subjects yet.</Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Sem</TableHead>
              <TableHead>Faculty</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.code}</TableCell>
                <TableCell>
                  {s.name}
                  <div className="text-xs text-muted-foreground">{s.department.code}</div>
                </TableCell>
                <TableCell>{s.semester}</TableCell>
                <TableCell>{s.faculty?.user.name ?? "–"}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <FormDialog trigger="edit" title={`Edit ${s.code}`} action={updateSubject} fields={fields(s)} hidden={{ id: s.id }} />
                    <DeleteButton action={deleteSubject} id={s.id} label={s.code} />
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
