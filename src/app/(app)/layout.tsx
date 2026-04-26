import Link from "next/link";
import { BellRing, Building2, Search, UserRound, Zap } from "lucide-react";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { requireUser } from "@/lib/auth";
export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  return (
    <div style={{ minHeight: "100vh", padding: "1rem 0 3rem" }}>
      <div className="page-shell">
        <div style={{ display: "grid", gap: "1.25rem" }} className="xl:grid-cols-[260px_minmax(0,1fr)]">
          <SidebarNav user={user} className="hidden xl:flex" />
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <header className="glass-panel" style={{ borderRadius: "16px", padding: "0.9rem 1.25rem", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
              <div><p style={{ fontSize: "1.1rem", fontWeight: 800 }}>Dashboard</p><p style={{ fontSize: "0.78rem", color: "var(--text3)" }}>Welcome back -- find your next opportunity</p></div>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
                <Link href="/dashboard#search" style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "0.45rem 0.9rem", borderRadius: "8px", background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)", fontSize: "0.82rem", fontWeight: 600 }}><Search style={{ width: 13, height: 13 }} /> Search</Link>
                <Link href="/dashboard#alerts" style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "0.45rem 0.9rem", borderRadius: "8px", background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)", fontSize: "0.82rem", fontWeight: 600 }}><BellRing style={{ width: 13, height: 13 }} /> Alerts</Link>
                <Link href="/employer" style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "0.45rem 0.9rem", borderRadius: "8px", background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)", fontSize: "0.82rem", fontWeight: 600 }}><Building2 style={{ width: 13, height: 13 }} /> Employers</Link>
                {user.subscriptionTier !== "PRO" && (<a href="#" style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "0.45rem 0.9rem", borderRadius: "8px", background: "rgba(0,229,184,0.1)", border: "1px solid rgba(0,229,184,0.2)", color: "var(--primary)", fontSize: "0.82rem", fontWeight: 700 }}><Zap style={{ width: 13, height: 13 }} /> Upgrade</a>)}
                <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "0.45rem 0.9rem", borderRadius: "8px", background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)", fontSize: "0.82rem" }}><UserRound style={{ width: 13, height: 13 }} /><span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</span></div>
                <form action="/api/auth/logout" method="POST"><button style={{ padding: "0.45rem 0.9rem", borderRadius: "8px", background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--text2)", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}>Log out</button></form>
              </div>
            </header>
            <div className="xl:hidden"><SidebarNav user={user} /></div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
