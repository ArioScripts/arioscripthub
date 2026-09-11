import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AuthedContext = {
  supabase: ReturnType<typeof requireSupabaseAuth> extends never ? never : any;
  userId: string;
};

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

async function writeAudit(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown> = {},
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("admin_audit_log").insert({
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId,
    details,
  });
}

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [scripts, profiles, reports, favorites] = await Promise.all([
      supabaseAdmin.from("scripts").select("copy_count, download_count, view_count, is_published"),
      supabaseAdmin.from("profiles").select("id, is_banned"),
      supabaseAdmin.from("reports").select("id, status"),
      supabaseAdmin.from("favorites").select("id"),
    ]);

    const scriptRows = scripts.data ?? [];
    const profileRows = profiles.data ?? [];
    const reportRows = reports.data ?? [];

    return {
      scripts: scriptRows.length,
      published: scriptRows.filter((row) => row.is_published).length,
      copies: scriptRows.reduce((sum, row) => sum + row.copy_count, 0),
      downloads: scriptRows.reduce((sum, row) => sum + row.download_count, 0),
      views: scriptRows.reduce((sum, row) => sum + row.view_count, 0),
      users: profileRows.length,
      bannedUsers: profileRows.filter((row) => row.is_banned).length,
      favorites: (favorites.data ?? []).length,
      openReports: reportRows.filter((row) => row.status === "open").length,
      totalReports: reportRows.length,
    };
  });

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ search: z.string().max(120).optional().default("") }).parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, username, avatar_url, is_banned, ban_reason, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });

    const emails = new Map((authUsers?.users ?? []).map((user) => [user.id, user.email ?? ""]));

    const rows = (profiles ?? []).map((profile) => ({
      ...profile,
      email: emails.get(profile.id) ?? "",
      roles: (roles ?? []).filter((role) => role.user_id === profile.id).map((role) => role.role),
    }));

    const term = data.search.trim().toLowerCase();
    return {
      users: term
        ? rows.filter(
            (row) =>
              (row.display_name ?? "").toLowerCase().includes(term) ||
              row.email.toLowerCase().includes(term),
          )
        : rows,
    };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["admin", "moderator", "user"]),
        grant: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context as AuthedContext);
    if (data.userId === context.userId && data.role === "admin" && !data.grant) {
      throw new Error("You cannot remove your own admin role");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.grant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }

    await writeAudit(context.userId, data.grant ? "role.grant" : "role.revoke", "user", data.userId, {
      role: data.role,
    });
    return { ok: true };
  });

export const setUserBan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        banned: z.boolean(),
        reason: z.string().max(500).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context as AuthedContext);
    if (data.userId === context.userId) throw new Error("You cannot ban yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        is_banned: data.banned,
        ban_reason: data.banned ? data.reason || "No reason given" : null,
        banned_at: data.banned ? new Date().toISOString() : null,
      })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    await writeAudit(context.userId, data.banned ? "user.ban" : "user.unban", "user", data.userId, {
      reason: data.reason,
    });
    return { ok: true };
  });

export const logAdminAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        action: z.string().min(1).max(80),
        targetType: z.string().max(40).optional().default(""),
        targetId: z.string().max(120).optional().default(""),
        details: z.record(z.string(), z.unknown()).optional().default({}),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context as AuthedContext);
    await writeAudit(context.userId, data.action, data.targetType, data.targetId, data.details);
    return { ok: true };
  });
