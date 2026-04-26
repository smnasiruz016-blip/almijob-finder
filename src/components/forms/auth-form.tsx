"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const payload =
      mode === "login"
        ? {
            email: formData.get("email"),
            password: formData.get("password")
          }
        : {
            name: formData.get("name"),
            email: formData.get("email"),
            password: formData.get("password")
          };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      // Refresh server state then navigate to dashboard
      router.refresh();
      router.push("/dashboard");
    } catch {
      setError("A network error occurred. Please check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-panel mx-auto w-full max-w-lg rounded-[2rem] p-6 md:p-8"
    >
      <div className="flex items-center justify-between gap-3">
        <a
          href="https://www.almiworld.com"
          className="rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-100"
          aria-label="Go to Almiworld home"
        >
          <Image src="/brand/almi-latest.png" alt="Almiworld" width={160} height={60} className="h-auto w-[130px]" />
        </a>
        <a
          href="https://www.almiworld.com"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Home
        </a>
      </div>
      <div className="space-y-2">
        <span className="eyebrow mt-5">{mode === "login" ? "Welcome back" : "Create account"}</span>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-slate-950">
          {mode === "login" ? "Log in to your dashboard" : "Start matching smarter"}
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          {mode === "login"
            ? "Access saved jobs, past searches, resume insights, and alerts."
            : "Create an account to upload your resume, search openings, and save alerts."}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {mode === "signup" && <Input name="name" placeholder="Full name" required />}
        <Input name="email" type="email" placeholder="Email address" autoComplete="email" required />
        <Input name="password" type="password" placeholder="Password" autoComplete={mode === "login" ? "current-password" : "new-password"} required />
      </div>

      {error && (
        <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      <Button type="submit" disabled={loading} className="mt-6 w-full">
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {mode === "login" ? "Logging in..." : "Creating account..."}
          </span>
        ) : mode === "login" ? "Log in" : "Create account"}
      </Button>
      <p className="mt-4 text-center text-sm text-slate-500">
        {mode === "login" ? "Need an account?" : "Already have an account?"}{" "}
        <Link href={mode === "login" ? "/signup" : "/login"} className="font-medium text-teal-700 hover:text-teal-800">
          {mode === "login" ? "Start free" : "Log in"}
        </Link>
      </p>
    </form>
  );
}
