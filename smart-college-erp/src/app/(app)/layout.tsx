import { AppShell } from "@/components/layout/app-shell";

// Every page in this group depends on the signed-in user and live database rows, so none of it can be
// prerendered into a static shell. Opt the group out of instant-navigation validation; the loading.tsx
// files in each portal still show a skeleton while a page's queries stream in.
export const instant = false;

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
