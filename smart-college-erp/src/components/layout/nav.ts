import type { Role } from "@/generated/prisma/client";

export type NavItem = { href: string; label: string; icon: string };

export const NAV: Record<Role, NavItem[]> = {
  STUDENT: [
    { href: "/student", label: "Dashboard", icon: "layout" },
    { href: "/student/assistant", label: "Ask Assistant", icon: "bot" },
    { href: "/student/exams", label: "Exams", icon: "file" },
    { href: "/student/timetable", label: "Timetable", icon: "calendar" },
    { href: "/student/attendance", label: "Attendance", icon: "check" },
    { href: "/student/notices", label: "Notices", icon: "bell" },
  ],
  FACULTY: [
    { href: "/faculty", label: "Dashboard", icon: "layout" },
    { href: "/faculty/attendance", label: "Attendance", icon: "check" },
  ],
  ADMIN: [
    { href: "/admin", label: "Analytics", icon: "chart" },
    { href: "/admin/subjects", label: "Subjects", icon: "book" },
    { href: "/admin/exams", label: "Exams", icon: "file" },
    { href: "/admin/timetable", label: "Timetable", icon: "calendar" },
    { href: "/admin/students", label: "Students", icon: "users" },
    { href: "/admin/notices", label: "Notices", icon: "bell" },
  ],
};
