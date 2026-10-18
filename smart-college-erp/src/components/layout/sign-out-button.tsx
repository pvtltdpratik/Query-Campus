"use client";

import { LogOutIcon } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button variant="outline" size="sm" className="w-full" onClick={() => signOut({ callbackUrl: "/login" })}>
      <LogOutIcon data-icon="inline-start" /> Sign out
    </Button>
  );
}
