import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/forms/auth-form";
import { getCurrentUser } from "@/lib/auth";

export default async function SignUpPage() {
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
            Start your search
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Build a more complete job-search workflow with resume-first ranking, saved searches, and upgrade-ready alerts.
          </p>
          <ul className="mt-5 space-y-2 text-sm leading-7 text-slate-600">
            <li>- Upload your resume and extract matching signals</li>
            <li>- Search jobs across live and fallback providers</li>
            <li>- Save roles and improve your resume before applying</li>
          </ul>
        </section>
        <div>
          <AuthForm mode="signup" />
          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-teal-700">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
