import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site-shell";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — ARIO SCRIPTS" },
      { name: "description", content: "Update your display name, username, avatar and bio." },
      { property: "og:title", content: "Your profile — ARIO SCRIPTS" },
      { property: "og:description", content: "Manage your ARIO SCRIPTS profile details." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, roles, isBanned } = useAuth();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setUsername(profile.username ?? "");
    setAvatarUrl(profile.avatar_url ?? "");
    setBio(profile.bio ?? "");
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim() || null,
          username: username.trim() || null,
          avatar_url: avatarUrl.trim() || null,
          bio: bio.trim() || null,
        })
        .eq("id", user!.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Profile updated");
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Your profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Signed in as <span className="text-foreground">{user?.email}</span>
          {roles.length > 0 && (
            <span className="ml-2 rounded border border-border px-1.5 py-0.5 font-mono text-[11px] uppercase text-primary">
              {roles.join(" · ")}
            </span>
          )}
        </p>

        {isBanned && (
          <p className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Your account is suspended: {profile?.ban_reason ?? "No reason given"}. You can't favorite or
            report scripts.
          </p>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
          className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6"
        >
          <Field label="Display name" value={displayName} onChange={setDisplayName} />
          <Field label="Username" value={username} onChange={setUsername} />
          <Field label="Avatar URL" value={avatarUrl} onChange={setAvatarUrl} />
          <label className="block text-sm text-muted-foreground">
            Bio
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={4}
              maxLength={500}
              className="mt-1.5 w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
            />
          </label>
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {save.isPending ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </SiteShell>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm text-muted-foreground">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={120}
        className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
      />
    </label>
  );
}
