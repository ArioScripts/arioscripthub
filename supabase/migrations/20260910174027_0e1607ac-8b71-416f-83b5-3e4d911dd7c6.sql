-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.report_status AS ENUM ('open', 'resolved', 'dismissed');

-- ============ UPDATED_AT HELPER ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  ban_reason TEXT,
  banned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_banned(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_banned FROM public.profiles WHERE id = _user_id), false);
$$;

CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id AND is_banned = (SELECT p.is_banned FROM public.profiles p WHERE p.id = auth.uid()));
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_read_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============ AUTO PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ CATEGORIES ============
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_admin_all" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ GAMES ============
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.games TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO authenticated;
GRANT ALL ON public.games TO service_role;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "games_public_read" ON public.games FOR SELECT USING (true);
CREATE POLICY "games_admin_all" ON public.games FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ SCRIPTS ============
CREATE TABLE public.scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  code TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT,
  images TEXT[] NOT NULL DEFAULT '{}',
  youtube_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  copy_count INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  favorite_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX scripts_category_idx ON public.scripts(category_id);
CREATE INDEX scripts_game_idx ON public.scripts(game_id);
CREATE INDEX scripts_published_idx ON public.scripts(is_published, created_at DESC);
GRANT SELECT ON public.scripts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scripts TO authenticated;
GRANT ALL ON public.scripts TO service_role;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scripts_public_read_published" ON public.scripts FOR SELECT USING (is_published = true);
CREATE POLICY "scripts_admin_read_all" ON public.scripts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "scripts_admin_all" ON public.scripts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER scripts_updated_at BEFORE UPDATE ON public.scripts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ FAVORITES ============
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, script_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites_select_own" ON public.favorites FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "favorites_insert_own" ON public.favorites FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND NOT public.is_banned(auth.uid()));
CREATE POLICY "favorites_delete_own" ON public.favorites FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.sync_favorite_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.scripts SET favorite_count = favorite_count + 1 WHERE id = NEW.script_id;
  ELSE
    UPDATE public.scripts SET favorite_count = GREATEST(favorite_count - 1, 0) WHERE id = OLD.script_id;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER favorites_count_trigger AFTER INSERT OR DELETE ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public.sync_favorite_count();

-- ============ REPORTS ============
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status public.report_status NOT NULL DEFAULT 'open',
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_select_own_or_staff" ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "reports_insert_own" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND NOT public.is_banned(auth.uid()));
CREATE POLICY "reports_staff_update" ON public.reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "reports_admin_delete" ON public.reports FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ ADMIN AUDIT LOG ============
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_admin_read" ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ SITE SETTINGS ============
CREATE TABLE public.site_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  site_name TEXT NOT NULL DEFAULT 'ARIO SCRIPTS',
  tagline TEXT NOT NULL DEFAULT 'The script database built for players.',
  announcement TEXT,
  announcement_enabled BOOLEAN NOT NULL DEFAULT false,
  discord_url TEXT,
  youtube_url TEXT,
  twitter_url TEXT,
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_singleton CHECK (id = true)
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_public_read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "settings_admin_write" ON public.site_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ COUNTER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.increment_script_metric(_script_id UUID, _metric TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _metric = 'copy' THEN
    UPDATE public.scripts SET copy_count = copy_count + 1 WHERE id = _script_id AND is_published;
  ELSIF _metric = 'download' THEN
    UPDATE public.scripts SET download_count = download_count + 1 WHERE id = _script_id AND is_published;
  ELSIF _metric = 'view' THEN
    UPDATE public.scripts SET view_count = view_count + 1 WHERE id = _script_id AND is_published;
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.increment_script_metric(UUID, TEXT) TO anon, authenticated;

-- ============ SEED DATA ============
INSERT INTO public.site_settings (id) VALUES (true);

INSERT INTO public.categories (name, slug, description, icon, sort_order) VALUES
  ('Auto Farm', 'auto-farm', 'Hands-free grinding for levels, coins and drops.', 'Sprout', 1),
  ('Combat', 'combat', 'Aim assistance, hitboxes and battle utilities.', 'Swords', 2),
  ('Utility', 'utility', 'Quality-of-life tools and helpers.', 'Wrench', 3),
  ('ESP & Visuals', 'esp-visuals', 'See players, chests and objectives through walls.', 'Eye', 4),
  ('Movement', 'movement', 'Speed, flight, teleports and no-clip.', 'Wind', 5),
  ('Hub', 'hub', 'All-in-one multi-game script hubs.', 'LayoutGrid', 6),
  ('Simulator', 'simulator', 'Scripts built for simulator and tycoon games.', 'Boxes', 7),
  ('Troll & Fun', 'troll-fun', 'Harmless chaos and party tricks.', 'PartyPopper', 8);

INSERT INTO public.games (name, slug) VALUES
  ('Blox Fruits', 'blox-fruits'),
  ('Pet Simulator', 'pet-simulator'),
  ('Arsenal', 'arsenal'),
  ('Da Hood', 'da-hood'),
  ('Jailbreak', 'jailbreak'),
  ('Universal', 'universal');

INSERT INTO public.scripts (title, slug, description, code, youtube_url, tags, category_id, game_id, is_verified, copy_count, download_count, view_count)
VALUES
  ('Blox Fruits Ultra Farm', 'blox-fruits-ultra-farm',
   'Full auto-levelling loop with quest handling, boss hunting and automatic fruit sniping. Built for long AFK sessions with anti-idle baked in.',
   E'-- ARIO SCRIPTS | Blox Fruits Ultra Farm\nlocal Ario = loadstring(game:HttpGet("https://ario.scripts/loader.lua"))()\n\nAria = Ario:Init({\n    Name = "Ultra Farm",\n    AutoLevel = true,\n    AutoQuest = true,\n    BossHunter = true,\n    FruitSniper = true,\n    AntiIdle = true,\n})\n\nAria:OnLevelUp(function(level)\n    print("[ARIO] Reached level " .. level)\nend)\n\nAria:Start()',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
   ARRAY['farm','levels','afk'], (SELECT id FROM public.categories WHERE slug='auto-farm'), (SELECT id FROM public.games WHERE slug='blox-fruits'), true, 8421, 3190, 24500),
  ('Arsenal Silent Aim', 'arsenal-silent-aim',
   'Prediction-based silent aim with configurable FOV circle, wall checks and smoothing so it stays believable in public lobbies.',
   E'-- ARIO SCRIPTS | Arsenal Silent Aim\nlocal Config = {\n    FOV = 120,\n    Smoothing = 0.18,\n    WallCheck = true,\n    TeamCheck = true,\n    HitPart = "Head",\n}\n\nlocal Aim = loadstring(game:HttpGet("https://ario.scripts/aim.lua"))()\nAim:Load(Config)\n\nAim:Bind(Enum.KeyCode.Q, function()\n    Aim.Enabled = not Aim.Enabled\nend)',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
   ARRAY['aim','combat','fps'], (SELECT id FROM public.categories WHERE slug='combat'), (SELECT id FROM public.games WHERE slug='arsenal'), true, 6120, 2480, 19800),
  ('Universal ESP Suite', 'universal-esp-suite',
   'Drop-in ESP for any experience: player boxes, skeletons, name tags, distance, chest and loot highlights, all toggleable at runtime.',
   E'-- ARIO SCRIPTS | Universal ESP Suite\nlocal ESP = loadstring(game:HttpGet("https://ario.scripts/esp.lua"))()\n\nESP:Configure({\n    Boxes = true,\n    Names = true,\n    Distance = true,\n    Skeletons = false,\n    Chests = true,\n    TeamColor = true,\n    MaxDistance = 2000,\n})\n\nESP:Toggle(true)',
   NULL, ARRAY['esp','visuals','universal'], (SELECT id FROM public.categories WHERE slug='esp-visuals'), (SELECT id FROM public.games WHERE slug='universal'), true, 9740, 4310, 31200),
  ('Pet Sim Auto Hatch', 'pet-sim-auto-hatch',
   'Auto hatch, auto collect and instant pet equip. Detects the best egg you can afford and keeps hatching until your inventory is full.',
   E'-- ARIO SCRIPTS | Pet Sim Auto Hatch\nlocal Hatch = loadstring(game:HttpGet("https://ario.scripts/hatch.lua"))()\n\nHatch:Run({\n    AutoCollect = true,\n    AutoHatch = true,\n    BestEggOnly = true,\n    AutoEquipBest = true,\n    SellDuplicates = true,\n})',
   NULL, ARRAY['hatch','pets','farm'], (SELECT id FROM public.categories WHERE slug='simulator'), (SELECT id FROM public.games WHERE slug='pet-simulator'), false, 3320, 1180, 9400),
  ('Da Hood Movement Kit', 'da-hood-movement-kit',
   'Speed glide, air dash, safe teleports and a fling toggle. Tuned values that feel smooth instead of instantly obvious.',
   E'-- ARIO SCRIPTS | Da Hood Movement Kit\nlocal Move = loadstring(game:HttpGet("https://ario.scripts/move.lua"))()\n\nMove.Speed = 32\nMove.AirDash = true\nMove.SafeTeleport = true\n\nMove:Keybind("LeftShift", "Sprint")\nMove:Keybind("F", "Fling")\nMove:Enable()',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
   ARRAY['speed','movement','fling'], (SELECT id FROM public.categories WHERE slug='movement'), (SELECT id FROM public.games WHERE slug='da-hood'), false, 2140, 860, 7300),
  ('ARIO Hub V4', 'ario-hub-v4',
   'The flagship hub: one loader, dozens of supported games, cloud config sync and a clean draggable interface.',
   E'-- ARIO SCRIPTS | ARIO HUB V4\nloadstring(game:HttpGet("https://ario.scripts/hub/v4.lua"))()\n\n--[[\n    Supported: Blox Fruits, Pet Simulator, Jailbreak,\n    Da Hood, Arsenal, Bee Swarm, Murder Mystery 2 ...\n\n    Config sync:  ARIO.Config:Load("my-preset")\n    Keybind menu: Right Ctrl\n]]',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
   ARRAY['hub','universal','gui'], (SELECT id FROM public.categories WHERE slug='hub'), (SELECT id FROM public.games WHERE slug='universal'), true, 15230, 7420, 52100);