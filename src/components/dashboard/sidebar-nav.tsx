import Image from "next/image";
import Link from "next/link";
import { BarChart3, BellRing, Bookmark, Building2, FileSearch2, Home, Shield, Sparkles, Zap } from "lucide-react";
import { canUseAlerts, canUseResumeInsights, hasUnlimitedSearches } from "@/lib/plans";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";
type SidebarNavProps = { user: SessionUser; className?: string; };
export function SidebarNav({ user, className }: SidebarNavProps) {
  const alertsEnabled = canUseAlerts(user.subscriptionTier);
  const resumeInsightsEnabled = canUseResumeInsights(user.subscriptionTier);
  const isPro = user.subscriptionTier === "PRO";
  const navItems = [
    { href: "/dashboard", label: "Overview", icon: BarChart3 },
    { href: "#search", label: "Job Search", icon: FileSearch2 },
    { href: "#saved", label: "Saved Jobs", icon: Bookmark },
    { href: "#insights", label: "Resume Insights", icon: Sparkles, pro: !resumeInsightsEnabled },
    { href: "#alerts", label: "Alerts", icon: BellRing, pro: !alertsEnabled },
    { href: "/employer", label: "Employer Panel", icon: Building2 },
    ...(user.role === "ADMIN" ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
  ] as const;
  return (
    <aside className={cn("glass-panel", className)} style={{ borderRadius: "20px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ paddingBottom: "1rem", borderBottom: "1px solid var(--border)" }}>
        <a href="https://www.almiworld.com"><Image src="/brand/almi-latest.png" alt="Almiworld" width={130} height={48} style={{ height: "30px", width: "auto" }} /></a>
        <p style={{ marginTop: "0.75rem", fontSize: "1rem", fontWeight: 700 }}>AlmiJob Finder</p>
        <p style={{ marginTop: "3px", fontSize: "0.75rem", color: "var(--text3)" }}>Resume-first job discovery worldwide</p>
        <a href="https://www.almiworld.com" style={{ marginTop: "0.6rem", display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.75rem", color: "var(--text2)", padding: "3px 10px", borderRadius: "6px", background: "var(--surface2)", border: "1px solid var(--border)" }}><Home style={{ width: 12, height: 12 }} /> almiworld.com</a>
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {navItems.map(({ href, label, icon: Icon, pro }: { href: string; label: string; icon: React.ElementType; pro?: boolean }) => (
          <a key={href} href={href} className="nav-item" style={{ justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "9px" }}><Icon style={{ width: 15, height: 15 }} />{label}</span>
            {pro && <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "2px 7px", borderRadius: "5px", background: "rgba(0,229,184,0.1)", color: "var(--primary)", border: "1px solid rgba(0,229,184,0.2)" }}>PRO</span>}
          </a>
        ))}
      </nav>
      <div style={{ borderRadius: "14px", marginTop: "auto" }}>
        {isPro ? (
          <div style={{ background: "linear-gradient(135deg,rgba(0,229,184,0.12),rgba(79,147,255,0.12))", border: "1px solid rgba(0,229,184,0.2)", padding: "1rem", borderRadius: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "0.5rem" }}><Zap style={{ width: 14, height: 14, color: "var(--primary)" }} /><span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--primary)" }}>Pro Plan Active</span></div>
            <p style={{ fontSize: "0.78rem", color: "var(--text2)" }}>Unlimited searches, full resume insights, daily alerts.</p>
          </div>
        ) : (
          <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", padding: "1rem", borderRadius: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}><span style={{ fontSize: "0.78rem", fontWeight: 700 }}>Free Plan</span><span style={{ fontSize: "0.62rem", padding: "2px 7px", borderRadius: "5px", background: "var(--surface3)", color: "var(--text3)", fontWeight: 600 }}>25/day</span></div>
            <p style={{ fontSize: "0.75rem", color: "var(--text3)", marginBottom: "0.75rem" }}>Upgrade for unlimited searches, insights & alerts.</p>
            <a href="#" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", padding: "0.5rem", borderRadius: "9px", background: "var(--primary)", color: "#04080f", fontSize: "0.78rem", fontWeight: 700, textDecoration: "none" }}><Zap style={{ width: 12, height: 12 }} /> Upgrade to Pro</a>
          </div>
        )}
      </div>
    </aside>
  );
}
