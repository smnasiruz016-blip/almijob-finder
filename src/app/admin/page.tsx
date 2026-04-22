import { requireAdmin } from "@/lib/auth";
import { getAdminRecentActivity, getAdminStats } from "@/server/services/admin";

export default async function AdminPage() {
  await requireAdmin();
  const [stats, activity] = await Promise.all([getAdminStats(), getAdminRecentActivity()]);

  return (
    <main className="space-y-6">
      <section className="glass-panel rounded-[2rem] p-6">
        <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Admin</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold text-slate-950">
          Operational snapshot
        </h1>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Monitor usage, search activity, resumes, and free versus Pro distribution from one place.
        </p>
      </section>
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-7">
      {Object.entries(stats).map(([label, value]) => (
        <section key={label} className="glass-panel rounded-[2rem] p-6">
          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-4 text-4xl font-bold text-slate-950">{value}</p>
        </section>
      ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="glass-panel rounded-[2rem] p-6">
          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Recent users</p>
          <div className="mt-4 space-y-3">
            {activity.recentUsers.map((user) => (
              <div key={user.id} className="rounded-[1.25rem] bg-white p-4 ring-1 ring-slate-200">
                <p className="font-semibold text-slate-900">{user.name}</p>
                <p className="text-sm text-slate-500">{user.email}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {user.subscriptionTier} / {new Date(user.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-panel rounded-[2rem] p-6">
          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Recent searches</p>
          <div className="mt-4 space-y-3">
            {activity.recentSearches.map((search) => (
              <div key={search.id} className="rounded-[1.25rem] bg-white p-4 ring-1 ring-slate-200">
                <p className="font-semibold text-slate-900">
                  {search.desiredTitle} / {search.country}
                </p>
                <p className="text-sm text-slate-500">
                  {search.company ? `Company: ${search.company} / ` : ""}
                  {search.keyword ? `Keyword: ${search.keyword}` : "No keyword"}
                </p>
                <p className="mt-1 text-xs text-slate-500">{new Date(search.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
