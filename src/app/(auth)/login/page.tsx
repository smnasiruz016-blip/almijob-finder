import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/forms/auth-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="page-shell py-16">
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <section className="glass-panel rounded-[2rem] p-8">
          <Image src="/brand/almi-latest.png" alt="Almiworld" width={180} height={70} className="h-auto w-[150px]" />
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-bold text-slate-950">
            Welcome back
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Pick up where you left off with saved searches, resume insights, and ranked job matches.
          </p>
          <ul className="mt-5 space-y-2 text-sm leading-7 text-slate-600">
            <li>- Search worldwide or by country, state, and city</li>
            <li>- Track saved jobs and daily usage</li>
            <li>- Use resume feedback before applying</li>
          </ul>
        </section>
        <div>
          <AuthForm mode="login" />
          <p className="mt-6 text-center text-sm text-slate-500">
            Need an account?{" "}
            <Link href="/signup" className="font-semibold text-teal-700">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
