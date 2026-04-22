"use client";

import Image from "next/image";
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

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-panel mx-auto w-full max-w-lg rounded-[2rem] p-6 md:p-8"
    >
      <Image src="/brand/almi-latest.png" alt="Almiworld" width={160} height={60} className="h-auto w-[130px]" />
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
        <Input name="email" type="email" placeholder="Email address" required />
        <Input name="password" type="password" placeholder="Password" required />
      </div>

      {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <Button type="submit" disabled={loading} className="mt-6 w-full">
        {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
      </Button>
    </form>
  );
}
