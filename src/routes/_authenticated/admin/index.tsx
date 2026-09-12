import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileCode2, Flag, FolderTree, Settings, Users } from "lucide-react";
import { getAdminStats } from "@/lib/admin.functions";

const QUICK_ACTIONS = [
  { to: "/admin/scripts", label: "Add or edit scripts", icon: FileCode2 },
  { to: "/admin/categories", label: "Manage categories", icon: FolderTree },
  { to: "/admin/reports", label: "Review reports", icon: Flag },
  { to: "/admin/users", label: "Manage users", icon: Users },
  { to: "/admin/settings", label: "Site settings", icon: Settings },
] as const;

function QuickActions() {
  return (
    <section>
      <h2 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        Quick actions
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm font-medium text-foreground hover:border-primary/50 hover:text-primary"
          >
            <action.icon className="size-4 text-primary" />
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: () => getAdminStats() });

  if (stats.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
    );
  }

  if (stats.isError) {
    return <p className="text-sm text-destructive">Couldn't load analytics. Admin access required.</p>;
  }

  const data = stats.data!;
  const cards = [
    { label: "Scripts", value: data.scripts, hint: `${data.published} published` },
    { label: "Users", value: data.users, hint: `${data.bannedUsers} banned` },
    { label: "Open reports", value: data.openReports, hint: `${data.totalReports} total` },
    { label: "Favorites", value: data.favorites, hint: "saved by users" },
    { label: "Copies", value: data.copies, hint: "code copied" },
    { label: "Downloads", value: data.downloads, hint: ".lua files" },
    { label: "Views", value: data.views, hint: "script pages" },
  ];

  return (
    <div className="space-y-8">
      {data.scripts === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-base font-semibold text-foreground">Your library is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first script to start building the database.
          </p>
          <Link
            to="/admin/scripts"
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Add a script
          </Link>
        </div>
      )}

      <QuickActions />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-5">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {card.label}
            </p>
            <p className="mt-2 font-mono text-2xl font-bold text-foreground">
              {card.value.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
