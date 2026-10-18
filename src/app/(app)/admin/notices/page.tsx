import type { Metadata } from "next";
import { Empty, PageHeader } from "@/components/page";
import { DeleteButton, FormDialog, type Field } from "@/components/admin/form-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { formatShortDate } from "@/lib/datetime";
import { requireRole } from "@/lib/session";
import { createNotice, deleteNotice, updateNotice } from "../actions";

export const metadata: Metadata = { title: "Notices" };

const AUDIENCES = [
  { value: "", label: "Everyone" },
  { value: "STUDENT", label: "Students" },
  { value: "FACULTY", label: "Faculty" },
];

export default async function AdminNotices() {
  await requireRole("ADMIN");
  const notices = await db.notice.findMany({ orderBy: { publishedAt: "desc" }, take: 100 });

  const fields = (n?: (typeof notices)[number]): Field[] => [
    { name: "title", label: "Title", required: true, defaultValue: n?.title },
    { name: "body", label: "Message", type: "textarea", required: true, defaultValue: n?.body },
    { name: "audience", label: "Audience", type: "select", required: true, defaultValue: n?.audience ?? "", options: AUDIENCES },
    { name: "expiresAt", label: "Expires on", type: "date", defaultValue: n?.expiresAt?.toISOString().slice(0, 10), hint: "Optional. Leave empty to keep it visible." },
  ];

  return (
    <>
      <PageHeader title="Notices" description="Announcements shown on dashboards and answered by the assistant." action={<FormDialog trigger="create" title="New notice" action={createNotice} fields={fields()} submitLabel="Publish" />} />
      {notices.length === 0 ? (
        <Empty>No notices yet.</Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Audience</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {notices.map((n) => (
              <TableRow key={n.id}>
                <TableCell className="whitespace-normal">
                  <div className="font-medium">{n.title}</div>
                  <div className="line-clamp-1 text-xs text-muted-foreground">{n.body}</div>
                </TableCell>
                <TableCell className="capitalize">{n.audience ? n.audience.toLowerCase() : "everyone"}</TableCell>
                <TableCell>{formatShortDate(n.publishedAt)}</TableCell>
                <TableCell>{n.expiresAt ? formatShortDate(n.expiresAt) : "–"}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <FormDialog trigger="edit" title="Edit notice" action={updateNotice} fields={fields(n)} hidden={{ id: n.id }} />
                    <DeleteButton action={deleteNotice} id={n.id} label={n.title} />
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
