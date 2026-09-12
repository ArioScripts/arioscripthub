import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: AdminAudit,
});

function AdminAudit() {
  const log = useQuery({
    queryKey: ["admin-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("id, action, target_type, target_id, details, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground">Audit log</h2>
      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-mono text-xs">
            {(log.data ?? []).map((entry) => (
              <tr key={entry.id}>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-primary">{entry.action}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {entry.target_type} {entry.target_id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(log.data ?? []).length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">No admin actions recorded yet.</p>
      )}
    </div>
  );
}
