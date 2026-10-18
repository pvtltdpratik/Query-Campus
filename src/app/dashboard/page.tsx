import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/session";

async function Redirector() {
  const user = await getCurrentUser();
  return redirect(user ? homeFor(user.role) : "/login");
}

// Role-aware landing: sends each signed-in user to their own portal.
export default function DashboardRedirect() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted-foreground">Loading…</p>}>
      <Redirector />
    </Suspense>
  );
}
