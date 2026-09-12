import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/lib/admin.functions";
import { ImageUploadField } from "@/components/image-upload-field";

export const Route = createFileRoute("/_authenticated/admin/scripts")({
  component: AdminScripts,
});

type ScriptRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  code: string;
  thumbnail_url: string | null;
  images: string[];
  youtube_url: string | null;
  tags: string[];
  category_id: string | null;
  game_id: string | null;
  is_published: boolean;
  is_verified: boolean;
  copy_count: number;
  download_count: number;
};

const EMPTY: Omit<ScriptRow, "id" | "copy_count" | "download_count"> = {
  title: "",
  slug: "",
  description: "",
  code: "",
  thumbnail_url: "",
  youtube_url: "",
  tags: [],
  category_id: null,
  game_id: null,
  is_published: true,
  is_verified: false,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function AdminScripts() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ScriptRow | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [open, setOpen] = useState(false);

  const scripts = useQuery({
    queryKey: ["admin-scripts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scripts")
        .select(
          "id, title, slug, description, code, thumbnail_url, youtube_url, tags, category_id, game_id, is_published, is_verified, copy_count, download_count",
        )
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as ScriptRow[];
    },
  });

  const lookups = useQuery({
    queryKey: ["admin-lookups"],
    queryFn: async () => {
      const [categories, games] = await Promise.all([
        supabase.from("categories").select("id, name").order("name"),
        supabase.from("games").select("id, name").order("name"),
      ]);
      return { categories: categories.data ?? [], games: games.data ?? [] };
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        slug: form.slug.trim() || slugify(form.title),
        description: form.description || null,
        thumbnail_url: form.thumbnail_url || null,
        youtube_url: form.youtube_url || null,
      };
      if (editing) {
        const { error } = await supabase.from("scripts").update(payload).eq("id", editing.id);
        if (error) throw new Error(error.message);
        await logAdminAction({
          data: { action: "script.update", targetType: "script", targetId: editing.id },
        });
      } else {
        const { data, error } = await supabase.from("scripts").insert(payload).select("id").single();
        if (error) throw new Error(error.message);
        await logAdminAction({
          data: { action: "script.create", targetType: "script", targetId: data.id },
        });
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Script updated" : "Script created");
      setOpen(false);
      setEditing(null);
      setForm({ ...EMPTY });
      void queryClient.invalidateQueries({ queryKey: ["admin-scripts"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (script: ScriptRow) => {
      const { error } = await supabase.from("scripts").delete().eq("id", script.id);
      if (error) throw new Error(error.message);
      await logAdminAction({
        data: { action: "script.delete", targetType: "script", targetId: script.id },
      });
    },
    onSuccess: () => {
      toast.success("Script deleted");
      void queryClient.invalidateQueries({ queryKey: ["admin-scripts"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const startEdit = (script: ScriptRow) => {
    setEditing(script);
    setForm({
      title: script.title,
      slug: script.slug,
      description: script.description ?? "",
      code: script.code,
      thumbnail_url: script.thumbnail_url ?? "",
      youtube_url: script.youtube_url ?? "",
      tags: script.tags,
      category_id: script.category_id,
      game_id: script.game_id,
      is_published: script.is_published,
      is_verified: script.is_verified,
    });
    setOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Scripts</h2>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setForm({ ...EMPTY });
            setOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="size-4" /> New script
        </button>
      </div>

      {open && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
          className="mt-6 grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2"
        >
          <Text label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
          <Text
            label="Slug"
            value={form.slug}
            onChange={(v) => setForm({ ...form, slug: v })}
            placeholder={slugify(form.title)}
          />
          <Text
            label="Thumbnail URL"
            value={form.thumbnail_url ?? ""}
            onChange={(v) => setForm({ ...form, thumbnail_url: v })}
          />
          <Text
            label="YouTube URL"
            value={form.youtube_url ?? ""}
            onChange={(v) => setForm({ ...form, youtube_url: v })}
          />
          <Select
            label="Category"
            value={form.category_id ?? ""}
            onChange={(v) => setForm({ ...form, category_id: v || null })}
            options={lookups.data?.categories ?? []}
          />
          <Select
            label="Game"
            value={form.game_id ?? ""}
            onChange={(v) => setForm({ ...form, game_id: v || null })}
            options={lookups.data?.games ?? []}
          />
          <Text
            label="Tags (comma separated)"
            value={form.tags.join(", ")}
            onChange={(v) =>
              setForm({ ...form, tags: v.split(",").map((t) => t.trim()).filter(Boolean) })
            }
          />
          <div className="flex items-end gap-4">
            <Toggle
              label="Published"
              checked={form.is_published}
              onChange={(v) => setForm({ ...form, is_published: v })}
            />
            <Toggle
              label="Verified"
              checked={form.is_verified}
              onChange={(v) => setForm({ ...form, is_verified: v })}
            />
          </div>
          <label className="block text-sm text-muted-foreground sm:col-span-2">
            Description
            <textarea
              value={form.description ?? ""}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={2}
              className="mt-1.5 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
            />
          </label>
          <label className="block text-sm text-muted-foreground sm:col-span-2">
            Lua code
            <textarea
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              rows={10}
              required
              className="mt-1.5 w-full rounded-lg border border-input bg-code-bg px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary/50"
            />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={save.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {save.isPending ? "Saving…" : editing ? "Update script" : "Create script"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-8 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Copies</th>
              <th className="px-4 py-3">Downloads</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(scripts.data ?? []).map((script) => (
              <tr key={script.id}>
                <td className="px-4 py-3 text-foreground">{script.title}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  <span className={script.is_published ? "text-primary" : "text-muted-foreground"}>
                    {script.is_published ? "published" : "draft"}
                  </span>
                  {script.is_verified && <span className="ml-2 text-primary">verified</span>}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{script.copy_count}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {script.download_count}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(script)}
                      aria-label="Edit script"
                      className="rounded-md p-2 text-muted-foreground hover:text-primary"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete "${script.title}"?`)) remove.mutate(script);
                      }}
                      aria-label="Delete script"
                      className="rounded-md p-2 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
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

function Text({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm text-muted-foreground">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
}) {
  return (
    <label className="block text-sm text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
      >
        <option value="">None</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
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
