import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, ShieldCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { listAdminUsers, setUserBan, setUserRole } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const users = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => listAdminUsers({ data: { search } }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-users"] });

  const ban = useMutation({
    mutationFn: (input: { userId: string; banned: boolean; reason?: string }) =>
      setUserBan({ data: { userId: input.userId, banned: input.banned, reason: input.reason ?? "" } }),
    onSuccess: (_data, input) => {
      toast.success(input.banned ? "User banned" : "User unbanned");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const role = useMutation({
    mutationFn: (input: { userId: string; role: "admin" | "moderator"; grant: boolean }) =>
      setUserRole({ data: input }),
    onSuccess: () => {
      toast.success("Roles updated");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Users</h2>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name or email"
          className="w-64 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
        />
      </div>

      {users.isError && (
        <p className="mt-4 text-sm text-destructive">Admin access required to manage users.</p>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(users.data?.users ?? []).map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3">
                  <p className="text-foreground">{user.display_name ?? "Unnamed"}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{user.email}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-primary">
                  {user.roles.join(" · ") || "user"}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {user.is_banned ? (
                    <span className="text-destructive">banned</span>
                  ) : (
                    <span className="text-muted-foreground">active</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        role.mutate({
                          userId: user.id,
                          role: "moderator",
                          grant: !user.roles.includes("moderator"),
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <UserCheck className="size-3.5" />
                      {user.roles.includes("moderator") ? "Remove mod" : "Make mod"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        role.mutate({
                          userId: user.id,
                          role: "admin",
                          grant: !user.roles.includes("admin"),
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <ShieldCheck className="size-3.5" />
                      {user.roles.includes("admin") ? "Remove admin" : "Make admin"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (user.is_banned) {
                          ban.mutate({ userId: user.id, banned: false });
                          return;
                        }
                        const reason = prompt("Ban reason?") ?? "";
                        if (reason !== null) ban.mutate({ userId: user.id, banned: true, reason });
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <Ban className="size-3.5" />
                      {user.is_banned ? "Unban" : "Ban"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
