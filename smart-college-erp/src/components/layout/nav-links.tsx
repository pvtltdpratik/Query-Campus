"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellIcon, BookOpenIcon, BotMessageSquareIcon, CalendarDaysIcon, ChartColumnIcon, CheckCheckIcon,
  FileTextIcon, LayoutDashboardIcon, UsersIcon, type LucideIcon,
} from "lucide-react";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import type { NavItem } from "./nav";

const ICONS: Record<string, LucideIcon> = {
  layout: LayoutDashboardIcon, bot: BotMessageSquareIcon, file: FileTextIcon, calendar: CalendarDaysIcon,
  check: CheckCheckIcon, bell: BellIcon, chart: ChartColumnIcon, book: BookOpenIcon, users: UsersIcon,
};

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <SidebarMenu>
      {items.map((item, i) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboardIcon;
        // The first item is the portal root, so only match it exactly.
        const active = i === 0 ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton isActive={active} render={<Link href={item.href} />}>
              <Icon />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
