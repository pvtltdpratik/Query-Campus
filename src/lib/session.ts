import "server-only";
import { cache } from "react";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/client";

export type CurrentUser = { id: string; name: string; email: string; role: Role };

export const homeFor = (role: Role) => `/${role.toLowerCase()}`;

/**
 * Data-access-layer guard. The JWT only proves who signed in; we re-read the user so a
 * deactivated account or a changed role takes effect immediately, not at token expiry.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  if (!user || !user.active) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Use at the top of every page, route handler and server action that is role-restricted. */
export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

/** For server actions / API handlers: throws instead of redirecting. */
export async function assertRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !roles.includes(user.role)) throw new Error("Not authorized");
  return user;
}

export async function requireStudent() {
  const user = await requireRole("STUDENT");
  const student = await db.student.findUnique({ where: { userId: user.id }, include: { department: true } });
  if (!student) notFound();
  return { user, student };
}

export async function requireFaculty() {
  const user = await requireRole("FACULTY");
  const faculty = await db.faculty.findUnique({ where: { userId: user.id }, include: { department: true } });
  if (!faculty) notFound();
  return { user, faculty };
}
