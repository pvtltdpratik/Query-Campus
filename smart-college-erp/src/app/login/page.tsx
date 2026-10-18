import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2">
          <h1 className="font-heading text-3xl font-semibold">Sign in</h1>
          <p className="text-sm text-muted-foreground">Use your college email and password.</p>
        </div>
        {/* useSearchParams in the form needs a Suspense boundary */}
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
