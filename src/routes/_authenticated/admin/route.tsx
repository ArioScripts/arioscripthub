import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { useAuth } from "@/hooks/use-auth";

const TABS = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/scripts", label: "Scripts" },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/reports", label: "Reports" },
  { to: "/admin/audit", label: "Audit log" },
  { to: "/admin/settings", label: "Settings" },
] as const;

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { isAdmin, isModerator, loading, roles } = useAuth();
  const rolesResolved = !loading && roles !== undefined;

  if (rolesResolved && !isAdmin && !isModerator) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <Shield className="mx-auto size-8 text-destructive" />
          <h1 className="mt-4 text-2xl font-semibold text-foreground">Staff access only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account doesn't have permission to open the admin dashboard.
          </p>
          <Link to="/" search={{}} className="mt-4 inline-block text-primary">
            Back to scripts
          </Link>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <header className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-md bg-primary/15 text-primary">
            <Shield className="size-4" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin dashboard</h1>
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              ARIO SCRIPTS control room
            </p>
          </div>
        </header>

        <nav className="mt-6 flex flex-wrap gap-1 border-b border-border pb-2">
          {TABS.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              activeOptions={{ exact: "exact" in tab }}
              activeProps={{ className: "bg-accent text-primary" }}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <div className="mt-8">
          <Outlet />
        </div>
      </div>
    </SiteShell>
  );
}
