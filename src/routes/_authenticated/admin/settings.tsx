import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettings,
});

type Settings = {
  site_name: string;
  tagline: string;
  announcement: string | null;
  announcement_enabled: boolean;
  discord_url: string | null;
  youtube_url: string | null;
  twitter_url: string | null;
  maintenance_mode: boolean;
};

function AdminSettings() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Settings | null>(null);

  const settings = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select(
          "site_name, tagline, announcement, announcement_enabled, discord_url, youtube_url, twitter_url, maintenance_mode",
        )
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as Settings | null;
    },
  });

  useEffect(() => {
    if (settings.data) setForm(settings.data);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("site_settings").update(form!).eq("id", true);
      if (error) throw new Error(error.message);
      await logAdminAction({ data: { action: "settings.update", targetType: "site_settings" } });
    },
    onSuccess: () => {
      toast.success("Settings saved");
      void queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!form) return <p className="text-sm text-muted-foreground">Loading settings…</p>;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
      className="grid max-w-2xl gap-4 rounded-2xl border border-border bg-card p-6"
    >
      <h2 className="text-lg font-semibold text-foreground">Site settings</h2>
      <Text label="Site name" value={form.site_name} onChange={(v) => setForm({ ...form, site_name: v })} />
      <Text label="Tagline" value={form.tagline} onChange={(v) => setForm({ ...form, tagline: v })} />
      <Text
        label="Announcement"
        value={form.announcement ?? ""}
        onChange={(v) => setForm({ ...form, announcement: v })}
      />
      <div className="flex flex-wrap gap-6">
        <Toggle
          label="Show announcement"
          checked={form.announcement_enabled}
          onChange={(v) => setForm({ ...form, announcement_enabled: v })}
        />
        <Toggle
          label="Maintenance mode"
          checked={form.maintenance_mode}
          onChange={(v) => setForm({ ...form, maintenance_mode: v })}
        />
      </div>
      <Text
        label="Discord URL"
        value={form.discord_url ?? ""}
        onChange={(v) => setForm({ ...form, discord_url: v })}
      />
      <Text
        label="YouTube URL"
        value={form.youtube_url ?? ""}
        onChange={(v) => setForm({ ...form, youtube_url: v })}
      />
      <Text
        label="X / Twitter URL"
        value={form.twitter_url ?? ""}
        onChange={(v) => setForm({ ...form, twitter_url: v })}
      />
      <button
        type="submit"
        disabled={save.isPending}
        className="w-fit rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {save.isPending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}

function Text({
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
        className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-primary"
      />
      {label}
    </label>
  );
}
