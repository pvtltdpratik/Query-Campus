"use client";

import { useActionState, useState } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ActionResult = { ok: boolean; message: string };
export type ServerAction = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

export type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "email" | "password" | "textarea" | "select" | "datetime-local" | "date" | "time" | "checkbox";
  options?: { value: string; label: string }[];
  defaultValue?: string | number | boolean;
  required?: boolean;
  placeholder?: string;
  hint?: string;
};

const selectClass = "h-10 w-full border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring";

export function FormDialog({
  title,
  description,
  trigger,
  action,
  fields,
  hidden,
  submitLabel = "Save",
}: {
  title: string;
  description?: string;
  trigger: "create" | "edit";
  action: ServerAction;
  fields: Field[];
  hidden?: Record<string, string>;
  submitLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [, formAction, pending] = useActionState<ActionResult | null, FormData>(async (prev, fd) => {
    const result = await action(prev, fd);
    if (result.ok) {
      toast.success(result.message);
      setOpen(false);
    } else {
      toast.error(result.message);
    }
    return result;
  }, null);

  return (
    <>
      {trigger === "create" ? (
        <Button onClick={() => setOpen(true)}>
          <PlusIcon data-icon="inline-start" /> {title}
        </Button>
      ) : (
        <Button variant="ghost" size="icon-xs" onClick={() => setOpen(true)} aria-label={title}>
          <PencilIcon />
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            {Object.entries(hidden ?? {}).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            {fields.map((f) => (
              <div key={f.name} className={f.type === "checkbox" ? "flex items-center gap-2" : "space-y-1.5"}>
                {f.type === "checkbox" ? (
                  <>
                    <input id={f.name} name={f.name} type="checkbox" defaultChecked={Boolean(f.defaultValue)} className="size-4" />
                    <Label htmlFor={f.name}>{f.label}</Label>
                  </>
                ) : (
                  <>
                    <Label htmlFor={f.name}>{f.label}</Label>
                    {f.type === "textarea" ? (
                      <Textarea id={f.name} name={f.name} defaultValue={String(f.defaultValue ?? "")} required={f.required} rows={5} placeholder={f.placeholder} />
                    ) : f.type === "select" ? (
                      <select id={f.name} name={f.name} defaultValue={String(f.defaultValue ?? "")} required={f.required} className={selectClass}>
                        {!f.required && <option value="">None</option>}
                        {f.required && f.defaultValue === undefined && <option value="" disabled>Select…</option>}
                        {f.options?.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input id={f.name} name={f.name} type={f.type ?? "text"} defaultValue={f.defaultValue === undefined ? undefined : String(f.defaultValue)} required={f.required} placeholder={f.placeholder} autoComplete="off" />
                    )}
                  </>
                )}
                {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : submitLabel}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DeleteButton({ action, id, label }: { action: ServerAction; id: string; label: string }) {
  const [, formAction, pending] = useActionState<ActionResult | null, FormData>(async (prev, fd) => {
    const result = await action(prev, fd);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
    return result;
  }, null);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(`Delete ${label}? This cannot be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="icon-xs" disabled={pending} aria-label={`Delete ${label}`}>
        <Trash2Icon />
      </Button>
    </form>
  );
}
