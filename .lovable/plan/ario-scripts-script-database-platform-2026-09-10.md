# ARIO SCRIPTS — Script Database Platform

A dark-theme platform where visitors browse and copy game scripts, members save favorites, and admins manage everything from a dashboard.

## What visitors get

- **Discovery page** — search by name, filter by category and game, sort (newest, most copied, most downloaded, most favorited), paginated grid of script cards with images.
- **Script detail page** — Mac-style code viewer (traffic-light window chrome, line numbers, syntax colors), Copy button and `.lua` download button that each bump their counters, YouTube showcase embed, image gallery, category/game tags, favorite button, report button.
- **Category pages** — each category is its own shareable page with its own title/description.

## What members get

- Email + password sign up / sign in, plus Google sign-in.
- Profile page: display name, avatar, bio, and their favorites list.
- Favorites (save/unsave any script).
- Report a script with a reason + details; banned users cannot post reports or favorites.

## Admin dashboard (role-gated)

- **Overview** — totals for scripts, users, copies, downloads, favorites, open reports; recent activity.
- **Scripts** — create, edit, delete, publish/unpublish; fields for title, description, Lua code, images, YouTube URL, game, category, tags.
- **Categories** — create, rename, reorder, delete.
- **Users** — search users, ban/unban with reason, grant/revoke `admin` and `moderator` roles.
- **Reports** — review queue, mark resolved/dismissed, jump to the script.
- **Audit log** — every admin action recorded with actor, action, target, timestamp.
- **Site settings** — site name, tagline, announcement banner, social links, maintenance toggle; read by the public site.

## Design direction

Dark, high-contrast "console" aesthetic: near-black layered surfaces, a single electric accent, monospace for code and numbers, geometric sans for headings. All colors defined as design tokens — no hardcoded colors. Card hovers lift subtly; the code viewer is the visual centerpiece.

## Technical outline

- Enable Lovable Cloud for database, auth, storage, and server logic.
- Tables: `profiles`, `user_roles` (separate table + `has_role()` security-definer function), `categories`, `games`, `scripts`, `script_images`, `favorites`, `reports`, `bans`, `admin_audit_log`, `site_settings`.
- RLS on every table: public read only for published scripts/categories/games/settings; favorites and reports scoped to `auth.uid()`; all admin writes gated by `has_role(auth.uid(),'admin')`. Explicit GRANTs per table.
- Counter increments (copy/download) go through security-definer SQL functions so counts can rise without exposing script rows to writes.
- Data access via TanStack Start server functions; public reads use a publishable-key server client, member/admin actions use the authenticated middleware. Admin routes live under the authenticated layout with a role check.
- Seed data: a handful of categories, games, and example scripts so the first screen is populated.

## Build order

1. Cloud + schema, RLS, grants, seed data.
2. Design tokens and app shell (header, nav, footer).
3. Public discovery + script detail with code viewer.
4. Auth, profiles, favorites, reporting.
5. Admin dashboard: overview, scripts, categories, users, reports, audit log, settings.
