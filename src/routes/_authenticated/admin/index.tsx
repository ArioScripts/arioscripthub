import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAdminStats } from "@/lib/admin.functions";

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
  );
}
