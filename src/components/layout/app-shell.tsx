import { Suspense } from "react";
import { GraduationCapIcon } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInset,
  SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/session";
import { NAV } from "./nav";
import { NavLinks } from "./nav-links";
import { SignOutButton } from "./sign-out-button";

async function Shell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="flex-row items-center gap-2 px-4 py-4">
          <GraduationCapIcon className="size-5" />
          <span className="font-heading text-lg font-semibold">Smart College</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <NavLinks items={NAV[user.role]} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="gap-3 p-4">
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground capitalize">{user.role.toLowerCase()}</p>
          </div>
          <SignOutButton />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger />
          <span className="font-heading font-semibold">Smart College</span>
        </header>
        <div className="mx-auto w-full max-w-6xl flex-1 space-y-8 p-6 md:p-10">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function ShellFallback() {
  return (
    <div className="space-y-4 p-10">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

// One Suspense boundary covers the session read and every page below it (Cache Components requirement).
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
