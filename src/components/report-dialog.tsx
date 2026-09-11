import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Flag, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const REASONS = [
  "Script doesn't work",
  "Contains a virus or logger",
  "Stolen / not credited",
  "Wrong game or category",
  "Other",
];

export function ReportDialog({ scriptId }: { scriptId: string }) {
  const { user, isBanned } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]!);
  const [details, setDetails] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reports").insert({
        script_id: scriptId,
        reporter_id: user!.id,
        reason,
        details: details.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Report sent — thanks for the heads up");
      setOpen(false);
      setDetails("");
    },
    onError: () => toast.error("Couldn't send that report"),
  });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!user) {
            navigate({ to: "/auth" });
            return;
          }
          if (isBanned) {
            toast.error("Your account is suspended");
            return;
          }
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
      >
        <Flag className="size-4" /> Report
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-foreground">Report this script</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <label className="mt-5 block text-sm text-muted-foreground">
              Reason
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
              >
                {REASONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-sm text-muted-foreground">
              Details (optional)
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="What happened when you ran it?"
                className="mt-1.5 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => submit.mutate()}
                disabled={submit.isPending}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-60"
              >
                {submit.isPending ? "Sending…" : "Send report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
