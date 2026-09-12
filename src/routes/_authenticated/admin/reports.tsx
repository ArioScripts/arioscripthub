import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: AdminReports,
});

function AdminReports() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const reports = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, reason, details, status, created_at, script:scripts(id, title, slug)")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const resolve = useMutation({
    mutationFn: async (input: { id: string; status: "resolved" | "dismissed" }) => {
      const { error } = await supabase
        .from("reports")
        .update({
          status: input.status,
          resolved_by: user?.id ?? null,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Report updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground">Reports</h2>
      <ul className="mt-6 space-y-3">
        {(reports.data ?? []).length === 0 && (
          <li className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            No reports yet.
          </li>
        )}
        {(reports.data ?? []).map((report) => (
          <li key={report.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-foreground">
                  {report.script?.title ?? "Deleted script"} —{" "}
                  <span className="font-mono text-xs uppercase text-primary">{report.reason}</span>
                </p>
                {report.details && (
                  <p className="mt-1 text-sm text-muted-foreground">{report.details}</p>
                )}
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {new Date(report.created_at).toLocaleString()} · {report.status}
                </p>
              </div>
              {report.status === "open" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => resolve.mutate({ id: report.id, status: "resolved" })}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                  >
                    Resolve
                  </button>
                  <button
                    type="button"
                    onClick={() => resolve.mutate({ id: report.id, status: "dismissed" })}
                    className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
