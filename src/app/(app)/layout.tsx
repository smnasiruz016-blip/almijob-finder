import Link from "next/link";
import { BellRing, Search, UserRound } from "lucide-react";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();

  return (
    <div className="min-h-screen py-4 md:py-6">
      <div className="page-shell">
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <SidebarNav user={user} className="hidden xl:block" />
          <div className="space-y-6">
            <header className="glass-panel flex flex-col gap-4 rounded-[2rem] px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-slate-950">Dashboard</p>
                <p className="text-sm text-slate-500">Find jobs faster using your resume and cleaner matching signals.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/dashboard#search"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                  <Search className="h-4 w-4" />
                  New search
                </Link>
                <Link
                  href="/dashboard#alerts"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                  <BellRing className="h-4 w-4" />
                  Alerts
                </Link>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
                  <UserRound className="h-4 w-4" />
                  {user.email}
                </div>
                <form action="/api/auth/logout" method="POST">
                  <button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                    Log out
                  </button>
                </form>
              </div>
            </header>
            <div className="xl:hidden">
              <SidebarNav user={user} />
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
